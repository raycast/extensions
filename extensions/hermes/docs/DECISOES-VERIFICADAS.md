# Decisões verificadas experimentalmente

Este documento **prevalece** sobre `ARCHITECTURE.md` e `UX-SPEC.md` onde houver
divergência. Cada decisão aqui foi provada contra o Hermes real rodando em
`127.0.0.1:8642` (v0.20.4) em 2026-08-19, com a transcrição do experimento.

---

## D-01 — Motor do comando principal: `/v1/runs` amarrado a uma sessão `source:"desktop"`

**Status: RESOLVIDO.** Fecha o bloqueador V-1/P2 da UX-SPEC §0.2.

O dilema era: `/api/sessions/{id}/chat/stream` sincroniza com o Desktop mas o
servidor mata a execução quando a conexão cai — o que viola o princípio 8 do
brief ("fechar a janela do Raycast não deve ser tratado como cancelamento").
Já `/v1/runs` sobrevive à desconexão, mas não estava verificado se grava as
mensagens no `state.db`, ou seja, se o Desktop enxerga.

**A resposta é que dá para ter os dois.** Sequência verificada:

```
POST /api/sessions   {"source":"desktop","title":"<título único>"}
   -> {"session":{"id":"api_1787173253_21269392","source":"desktop","message_count":0,...}}

POST /v1/runs        {"input":"Responda apenas: sincronizado",
                      "session_id":"api_1787173253_21269392"}
   -> {"run_id":"run_e4118ab9ebc24b1ab1878f6cfb8e2866","status":"started"}
```

Estado da sessão depois que a run terminou:

```
id            = 'api_1787173253_21269392'
source        = 'desktop'          <- preservado
message_count = 2                  <- as mensagens foram gravadas
model         = 'gpt-5.6-sol'
```

E as mensagens realmente existem em `GET /api/sessions/{id}/messages`:

```
- user      | 'Responda apenas: sincronizado'
- assistant | 'sincronizado'
```

**Consequência:** o comando `Perguntar ao Hermes` deve, na primeira pergunta de
uma conversa nova, criar a sessão com `source:"desktop"` e então disparar
`/v1/runs` com aquele `session_id`. Perguntas seguintes reutilizam o mesmo
`session_id`.

## D-02 — Runs sobrevivem à desconexão do cliente (princípio 8 do brief)

**Status: PROVADO.**

Experimento: iniciar uma run longa, conectar ao stream de eventos, derrubar a
conexão após 2 s, esperar 12 s sem nenhum cliente conectado, e consultar o
status.

```
POST /v1/runs {"input":"Conte devagar de 1 ate 30, um numero por linha..."}
   -> {"run_id":"run_ee23e54e2e03479a95103345ff3ff139","status":"started"}

[stream conectado e derrubado após 2s]

GET /v1/runs/{id}  logo após desconectar  -> "status": "running"
GET /v1/runs/{id}  12s depois             -> "status": "completed",
     "output": "1\n2\n3\n...\n30", "usage": {...,"total_tokens":20130}
```

**Consequência:** fechar a janela do Raycast não cancela nada. A extensão só
precisa persistir o `run_id` localmente para conseguir reabrir o resultado —
o que é obrigatório de qualquer forma, porque **não existe rota `GET /v1/runs`
para listar execuções**.

## D-03 — Formatos de SSE são DIFERENTES entre os dois streams

**Status: CAPTURADO AO VIVO.** Ver `docs/research/fixtures/CAPTURAS-AO-VIVO.md`
para as transcrições literais.

| | `/v1/chat/completions` | `/v1/runs/{id}/events` |
|---|---|---|
| Fim do stream | `data: [DONE]` | `: stream closed` (comentário SSE) |
| Tipo do evento | campo `object` do JSON | campo `event` do JSON |
| Campo `event:` do SSE | não usado | **não usado** |
| Contagem de tokens | `prompt_tokens` / `completion_tokens` | `input_tokens` / `output_tokens` |

O parser **precisa** tratar linhas iniciadas por `:` — normalmente descartadas
como comentário/keepalive — porque `: stream closed` é o sinal de término do
stream de runs. Esperar `[DONE]` ali deixa a interface pendurada até o timeout.

Eventos observados no stream de runs: `message.delta` (campo `delta`),
`reasoning.available` (campo `text`), `run.completed` (campos `output` e
`usage`).

## D-04 — `jobs_admin` é legenda desatualizada, não estado (REVISADA em 2026-08-19)

**Status: OBSERVAÇÃO MANTIDA, INFERÊNCIA REFUTADA — agora com prova ao vivo.**

A redação anterior desta decisão dizia: *"a capability que as governa está off
[…] o comando de Automações precisa checar `features.jobs_admin` e se ocultar
quando for `false`"*. A **observação** continua verdadeira — o campo vem
`false`. A **inferência** de que ele governa as rotas era um palpite, nunca
testado, e está errada. Ela teria feito a extensão esconder uma tela que
funciona.

### O que foi provado

`grep` recursivo por `jobs_admin` em toda a árvore do Hermes devolve **uma
única linha**: `gateway/platforms/api_server.py:3189`, um literal `False` dentro
do dicionário de `features`. Nenhum handler o lê, nenhuma configuração o
altera.

O portão real é `_CRON_AVAILABLE`. `_check_jobs_available`
(`api_server.py:5692-5698`) olha só essa variável e devolve **501** quando ela é
falsa. Não existe caminho de 403 por capability: o único 403 do servidor vem do
middleware de CORS, que a extensão não aciona por nunca mandar header `Origin`.

Sondagem contra o servidor real, em 2026-08-19:

```
GET /api/cron/fire         -> 405   (a rota existe; só o método está errado)
GET /api/rota-inexistente  -> 404   (controle: rota ausente responde 404)
GET /api/jobs                       -> 200  {"jobs": []}
GET /api/jobs?include_disabled=true -> 200  1 automação real
```

O 405 prova `_CRON_AVAILABLE == True`, porque `POST /api/cron/fire` só é
registrada dentro do bloco `if _CRON_AVAILABLE:` (`api_server.py:2101-2104`).

### Consequências

1. **Construir a tela de Automações**, detectando pela resposta HTTP: `200` com
   lista, `501` com estado vazio explicativo (E19), `401` caindo na tela de
   primeiro uso. **Nunca** com gate em `features.jobs_admin`.
2. **`?include_disabled=true` é obrigatório na chamada.** O default do servidor
   é falso e filtra jobs desabilitados. Sem o parâmetro, esta máquina — que tem
   um job pausado — veria "nenhuma automação" com uma automação real no disco.
3. **Regra geral para o resto do roteiro.** `features.*` tem duas espécies:
   valores **derivados** de estado real (`cors` é `bool(self._cors_origins)`,
   `api_server.py:3196`) e **literais fixos** (`admin_config_rw`, `jobs_admin`,
   `memory_write_api`, `audio_api`, `realtime_voice`, `:3188-3193`). Os
   derivados podem ser lidos como estado; os literais são documentação, e
   precisam ser conferidos contra a tabela de rotas antes de virarem decisão.
   Dos cinco literais falsos, `jobs_admin` é o único cujo valor contradiz a
   tabela de rotas — para os outros quatro não há rota, e "não construir"
   continua certo, agora pelo motivo certo.

**Lição de método:** "a capability diz `false`" e "a funcionalidade não
funciona" são afirmações diferentes. Esta decisão nasceu marcada como
`OBSERVADO`, não `PROVADO`, e a diferença entre os dois carimbos era exatamente
esta.

## D-05 — `/v1/chat/completions` NÃO é o caminho, apesar de funcionar

**Status: CONFIRMADO por D-01.**

O endpoint funciona e faz streaming corretamente (capturado ao vivo), mas cria
sessões com `source:"api_server"`, que o Desktop filtra para fora de Recentes.
Verificado na prática: as duas primeiras chamadas de teste deste projeto
produziram as sessões `Responder apenas ok` e `Dizer apenas pronto`, ambas
`source: "api_server"`.

Como a sincronia com o Desktop é o objetivo declarado do projeto, este endpoint
fica fora da implementação.

## D-06 — Custo base por turno é ~20.000 tokens de entrada

**Status: OBSERVADO** em todas as quatro chamadas de teste
(19.996 a 20.009 tokens de entrada, para prompts de menos de 10 palavras).

O Hermes injeta um system prompt grande. Não é anomalia nem erro da extensão.
A interface não deve sugerir que perguntas curtas são baratas, e vale exibir o
consumo quando disponível.

## D-07 — Ferramenta de teste: `node --test` sem dependências

**Status: VERIFICADO** nesta máquina (Node v24.14.1): `node --test` executa
arquivos `.test.ts` com remoção nativa de tipos, sem transpilador.

Atende à regra do brief de evitar dependências quando a API nativa resolve.
**Restrição:** a remoção nativa de tipos não aceita construções que exigem
transformação — `enum`, `namespace`, decorators, `import =`. Usar objetos
`as const` no lugar de `enum` e `import type` para tipos.

## D-08 — Ler `API_SERVER_KEY` do `.env` é APROVADO (fecha a pendência P1)

**Status: DECIDIDO PELO USUÁRIO** em 2026-08-19. Substitui a pendência P1 da
seção "Decisões pendentes" de `ARCHITECTURE.md`, que fica encerrada.

O plano original continha uma tensão real: proíbe "ler arquivos internos do
Hermes" e ao mesmo tempo proíbe "exigir terminal para o uso normal". A chave
mora em `<HERMES_HOME>\.env`, então cumprir as duas coisas ao pé da letra é
impossível.

**Decisão: manter a ação `Detectar configuração automaticamente` como está**,
com as travas já implementadas:

- roda **somente** por ação explícita do usuário, nunca em background, nunca
  no mount de nenhuma tela;
- lê **apenas** a linha `API_SERVER_KEY=` do `.env` e a porta do `config.yaml`
  — nenhum outro conteúdo desses arquivos, e nunca o `auth.json`;
- **nunca exibe o valor** — nem o valor, nem um prefixo, nem o tamanho, nem
  uma versão mascarada;
- nunca copia a chave para a área de transferência;
- guarda a chave no LocalStorage do Raycast (banco criptografado), e a
  preferência digitada pelo usuário continua tendo precedência.

**Consequência para quem for implementar:** a invariante 3 da `ARCHITECTURE.md`
("`discovery.ts` só pode ler `API_SERVER_PORT`") está relaxada exatamente nestes
termos e não deve ser reinstaurada. Nenhuma outra leitura de arquivo interno do
Hermes fica autorizada por esta decisão.

## D-09 — Duas execuções na mesma conversa: o servidor ACEITA, e é por isso que a fila existe

**Status: PROVADO** em 2026-08-19, contra o Hermes real. Fecha a pergunta 2 do
apêndice do desenho da conversa contínua.

A regra R9 ("no máximo um turno vivo por conversa") vivia só num comentário, sem
que ninguém soubesse o que o servidor faz quando ela é violada. Agora sabemos, e
o resultado é pior do que a suposição.

### Experimento 1 — as duas rodam

```
POST /api/sessions  {"source":"desktop", id:"raycast_probe_…"}   -> 201
POST /v1/runs       {"input":"Conte devagar de 1 ate 20…"}       -> 202 run A
POST /v1/runs       {"input":"Responda apenas: DOIS"}  (1,2 s depois, MESMO session_id)
                                                                 -> 202 run B
t+2s   A=running    B=running
t+4s   A=completed  B=running
t+6s   A=completed  B=completed
```

**Não há 409, não há fila do lado de lá, não há trava nenhuma.** As duas execuções
foram aceitas e rodaram ao mesmo tempo na mesma conversa.

### Experimento 2 — a ordem gravada é a ordem de TÉRMINO, não a de envio

Segunda rodada, com A propositalmente longa e B instantânea:

```
run A (texto de 400 palavras)  -> terminou em 75.152 ms
run B ("Responda apenas: B")   -> terminou em 79.169 ms
```

Duas consequências, as duas visíveis no banco:

1. **A mensagem do usuário só é gravada quando a execução termina.** A pergunta de
   B (`#14639`) recebeu um `id` MAIOR que toda a troca de A (`#14629`…`#14638`),
   embora tenha sido enviada 0,7 s depois de A começar. Quem terminar primeiro
   aparece primeiro na transcrição, independentemente de quem perguntou primeiro.
2. **A contenção é brutal.** Uma pergunta cuja resposta é a letra "B" levou
   **79 segundos** por disputar a conversa com a outra execução. Sozinha, a mesma
   pergunta responde em ~4 s.

E há um terceiro efeito, inevitável pelo desenho do agente: a segunda execução lê
o passado da conversa ANTES de a primeira gravar a resposta dela, então ela
responde sem enxergar a troca que está acontecendo ao lado.

**Consequência:** a fila local da §7 do desenho não é conforto de interface, é a
ÚNICA trava que existe. `pickTurnToRun()` em `src/lib/turns.ts` é onde ela mora;
nenhum caminho pode disparar uma execução com outra viva na mesma conversa.

## D-10 — A fila de aprovação é por EXECUÇÃO, nunca por conversa

**Status: PROVADO na fonte** do Hermes 0.20.4. Fecha a pergunta 3 do apêndice do
desenho, que o experimento ao vivo não conseguiu responder (ver abaixo).

`gateway/platforms/api_server.py:6762-6774`, na criação de toda run:

```python
# Approval queues gate host-side tool execution and must be isolated
# per API run.  Client-provided session IDs and memory session keys are
# conversation/memory scopes, not authorization namespaces: multiple
# concurrent runs can intentionally share them, and resolving an
# approval for one run must not unblock another run's dangerous command.
approval_session_key = run_id
```

E `POST /v1/runs/{run_id}/approval` resolve pelo mapa `_run_approval_sessions[run_id]`
(`:7188`), devolvendo 409 `approval_not_active` quando não há entrada.

**Consequência:** contar aprovações pendentes por execução — o que o código já
fazia no antigo `use-run-stream.ts` e continua fazendo em `use-conversation.ts` — está
correto, e continua correto na segunda, terceira e enésima execução da mesma
conversa. Uma aprovação respondida numa execução **não** destrava outra.

**Por que o experimento ao vivo não bastou:** duas tentativas de provocar um
`approval.request` (um `echo`, depois um `taskkill /F` — que está em
`DANGEROUS_PATTERNS`, `tools/approval.py:830`) foram AUTO-APROVADAS pelo
`_smart_approve` (`tools/approval.py:3322`), o avaliador que libera comandos de
baixo risco sem perguntar. O stream mostrou `tool.started` → `tool.completed`
sem nenhum pedido. Forçar um pedido exigiria rodar um comando de fato destrutivo
nesta máquina, o que não se faz para testar interface. A fonte responde melhor.

## D-11 — O primeiro pedaço de texto demora ~5,5 s em conversa longa

**Status: MEDIDO** em 2026-08-19, na conversa `20260818_173215_4af30a`
(330 mensagens). Fecha a pergunta 4 do apêndice do desenho.

```
POST /v1/runs                -> 202 em 6 ms
GET  /v1/runs/{id}/events    -> headers em 114 ms
primeiro message.delta       -> 5.554 ms
run.completed                -> 5.554 ms
```

O envio é instantâneo; o custo está no agente recarregando o passado antes de
escrever a primeira letra. Numa conversa curta a mesma pergunta responde em ~4 s,
então o passado longo custa mais de um segundo — e o piso de ~4 s existe sempre.

**Consequências para a interface:**

1. **O `Preparando…` → `O Hermes está pensando…` de 3 s (UX-SPEC §6.1) não é um
   caso raro: é o caminho normal.** Ele precisa funcionar por turno, e funciona.
2. **Os deltas chegam em rajada, não pingando.** Numa das capturas, 22
   `message.delta` chegaram dentro do MESMO milissegundo. O agrupamento de 80 ms
   de `createTextBuffer` é o que impede uma rajada dessas de virar 22 travessias
   da ponte IPC.
3. Nada de barra de progresso falsa nem de mensagens rotativas: o estado
   **Preparando** por 5 s é a verdade.

## D-12 — Aprovações no Raycast usam Actions, não botões inline

**Status: PROVADO na API e no fluxo da extensão.** O Raycast para Windows não
oferece uma superfície própria de múltipla escolha dentro da lista. As escolhas
do Hermes continuam sendo exibidas no `Detail` de aprovação e respondidas pelas
ações do painel (`Actions`, `Ctrl+K`), exatamente na ordem enviada pelo servidor.

Não há endpoint para listar novamente uma aprovação pendente nem replay dos
eventos SSE. Se a janela for fechada antes de o payload ser salvo, a extensão
mantém somente a saída segura de negar o pedido e explica essa limitação ao
usuário; ela não inventa escolhas nem aprova automaticamente.

## D-13 — O destino de um turno é imutável durante a escolha do modelo

**Status: IMPLEMENTADO E COBERTO POR TESTE** em 2026-08-20.

`useConversation` captura o `sessionId` no contexto do turno antes do primeiro `await`.
Se o usuário trocar de conversa enquanto `resolveModelChoice()` está pendente, o pedido
continua pertencendo à conversa original; ele nunca usa o `sessionId` que passou a estar na
tela depois. Os patches posteriores continuam protegidos pela época e pelo identificador do
turno.

## D-14 — Continuar uma conversa exige execução terminal

**Status: IMPLEMENTADO E COBERTO POR TESTE** em 2026-08-20.

As telas de progresso e de execuções não oferecem `Continuar esta conversa` enquanto a run está
`Preparando`, `Executando`, `Aguardando aprovação` ou `Interrompendo`. A ação só reaparece após
`Concluído`, `Cancelado`, `Falhou` ou `Execução expirada`, preservando a trava local de uma run
viva por conversa.

## D-15 — `GET /v1/toolsets` custa ~2 s na primeira chamada, e o corte de 12 s fica

**Status: MEDIDO AO VIVO** em 2026-08-21, contra o Hermes v0.20.4 em
`http://127.0.0.1:8642` (`/health` confirmando `platform: "hermes-agent"` antes).

O corte de `TOOLSETS_TIMEOUT_MS` (`src/lib/hermes-api.ts`) tinha sido escolhido sobre
uma leitura de código, sem número. Agora tem número. Quatro chamadas seguidas, com o
mesmo corpo de 6.952 bytes nas quatro:

| Chamada | `time_total` | `time_starttransfer` |
|---|---|---|
| 1 (fria) | 1,894 s | 1,894 s |
| 2 | 0,709 s | 0,708 s |
| 3 | 0,739 s | 0,703 s |
| 4 | 0,712 s | 0,712 s |

**O corte de 12 s continua certo, e continua sendo proteção e não impaciência.** O
número de 8 s foi reconferido linha a linha e é real, mas é o PIOR caso, não o caso
normal: `_fetch_nous_account_info()` em `hermes_cli/nous_account.py` termina em
`urllib.request.urlopen(req, timeout=8)` — uma leitura HTTP **bloqueante** ao
`portal.nousresearch.com` dentro do laço de eventos do servidor. Os 8 s só aparecem
quando o portal não responde; nesta máquina ele respondeu, e sobrou o custo normal de
~2 s. Doze segundos deixam ~4 s de folga sobre o pior caso conhecido. Cache de 10 min,
nunca em segundo plano: nada disso muda.

**Contrato conferido no mesmo teste** — bate com `T.ToolsetListResponse` sem ajuste:

- topo `{ object: "list", platform: "api_server", data: [...] }`;
- 28 grupos, cada um com exatamente `{name, label, description, enabled, configured, tools}`;
- `stt` e `context_engine` vêm com `tools: []`. Não é caso de borda teórico, e
  `src/toolsets.tsx` já protege: a seção `Ferramentas deste grupo` só é montada com
  `tools.length > 0`, e o acessório mostra `0`;
- a distribuição real cobre 3 dos 4 rótulos de `TOOLSET_AVAILABILITY_LABEL`:
  14 `Disponível` (`enabled × configured`), 13 `Desligado` (`!enabled × configured`),
  1 `Indisponível` (`!enabled × !configured`). **`Precisa configurar` não aparece nesta
  instalação** — quem for validar a tela à mão não vai conseguir vê-lo sem habilitar um
  grupo sem credencial.

## D-16 — O JavaScript não é o gargalo da conversa longa: 0,02% do orçamento de render

**Status: MEDIDO** em 2026-08-21 com `tests/bench-conversa.mts` (rodar com
`node tests/bench-conversa.mts`; não é teste e não entra no `node --test`).

O ponto crítico nº 1 do checklist — "fluidez com a conversa de 330 mensagens" — era
inteiramente subjetivo: alguém precisava sentir se engasgava. A parte que é código puro
agora tem número. Cenário: 330 mensagens → 110 trocas, uma em cada quatro ferramentas com
saída de 60 mil caracteres, resposta do turno vivo crescendo além do corte de
`MAX_TURN_CHARS` e etapas acumulando a cada quatro flushes.

| O quê | Custo | % do intervalo de 80 ms |
|---|---|---|
| `pairMessagesIntoTurns(330)` | 0,037 ms | — (roda por carga de página) |
| 1ª pintura, derivar 40 trocas | 0,050 ms | — |
| flush do stream, janela de 40 | 0,015 ms | **0,02%** |
| flush do stream, janela de 110 | 0,017 ms | **0,02%** |
| o mesmo, se a identidade dos turnos se perdesse | 0,056 ms | 0,07% |

**Consequência prática para o checklist manual.** Se a interface engasgar com 330 mensagens,
NÃO é o nosso JavaScript — ele usa dois centésimos de por cento do intervalo entre renders.
Baixar `RENDER_TURN_LIMIT` continua sendo o primeiro movimento certo, mas pelo outro motivo:
ele reduz quantos `List.Item` o host WPF precisa medir e desenhar, não quanto a extensão
calcula. O que não dá para medir daqui é justamente esse lado — reconciliação do React e
travessia da ponte IPC até o host — e é por isso que o passo manual continua existindo.

**O `patchTurn` é o que sustenta esse número.** Ele copia o array e troca UM elemento
(`use-conversation.ts`), então os outros 39 turnos mantêm identidade de objeto e o
`createTurnDerivationCache` acerta. Se alguém trocar aquilo por um `turns.map(...)`, o custo
por flush quadruplica — a linha "se a identidade dos turnos se perdesse" é essa conta.

**Degrau do cache, medido e descartado como problema.** `createTurnDerivationCache` guarda
128 entradas e `renderCap` cresce +40 a cada `Carregar parte anterior` (40 → 80 → 120 → 160).
Passando de 128 trocas na janela, cada render evita a entrada que acabou de usar e todas
recalculam: 0,015 ms com 128 trocas, 0,110 ms com 130 — **14× de salto, exatamente no limite**.
Nenhuma mudança foi feita, e o motivo é medido, não presumido:

- em valor absoluto o pior caso (200 trocas) é 0,122 ms, 0,15% do intervalo;
- a suspeita de que o recálculo faria o markdown atravessar a ponte de novo **não se
  sustenta**: `markdown` é `string`, e o React compara props por valor (`Object.is` em duas
  strings de mesmo conteúdo é `true`). Recalcular produz texto idêntico, e nada é reenviado.

Ou seja: o degrau existe, é reproduzível e não custa nada. Mexer no 128 seria mudança sem
evidência. Ele está anotado aqui para que, se algum dia o custo por troca subir, ninguém
precise redescobrir o degrau.

---

## D-17 — O Raycast do Windows tem `Save for Store`: a captura 2000×1250 sai do próprio app

**Status: LIDO NO BINÁRIO** do Raycast 2.0.3 em 2026-08-21
(`C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast`), não na
documentação. Não foi exercitado na tela — isso é do checklist manual.

O `CHECKLIST-MANUAL.md` afirmava que só restava capturar à mão e recompor. A afirmação vinha
de uma verdade parcial: a janela é desenhada pelo `Raycast.UIAccess.exe` e **de fato** sai em
branco no `Print Screen` e em qualquer automação de tela. Só que o app não usa o mesmo
caminho que essas ferramentas — ele se captura pela API de captura do Windows
(`workspace.captureWindowById`, string em `Raycast.dll`) e enxerga a própria janela.

**O comando existe e é para exatamente isto.** Em
`frontend/extension-command-ids-DSmCZEN7.js`:

```
windowCapture:_({title:`Capture Window`,
  description:`Capture a Raycast window to share it, or add a screenshot of your extension to the Store.`,
  keywords:[`screenshot`], ...})
```

**A opção de gravar no formato da Store existe.** Três formas do mesmo nome na tabela de
strings UTF-16 do `Raycast.dll` — `SaveForStore`, `saveForStore` e o rótulo **`Save for Store`**
— e o rótulo cai entre `Window capture area is outside the screen bounds` e
`Failed to install keyboard hook for window capture overlay`, isto é, dentro do código do
`WindowCaptureOverlayWindow`.

**O tamanho é o da Store, e é constante.** O DLL tem os membros `StoreScreenshotWidth` e
`StoreScreenshotHeight`. Varrendo o arquivo por `ldc.i4` (opcode `0x20` + int32), `2000`
aparece 9 vezes e `1250` aparece 3 — e as três ocorrências de `1250` estão **todas** a menos
de 30 bytes de um `2000`, num trecho único de 96 bytes (`0xdce72`–`0xdced2`). Em nenhum outro
ponto do binário os dois números convivem.

**O destino é a pasta `metadata/` da extensão.** O literal `metadata` e o carimbo de nome de
arquivo `yyyy-MM-dd HH.mm.ss` estão coladinhos, imediatamente antes de
`Failed to open Snipping Tool for window capture screenshot: {ScreenshotPath}`. O prefixo do
nome é `raycast-screenshot-`.

### A condição que faz isso funcionar ou não

`frontend/main-window-RRN5GTqi.js`, linha 135, no handler `window-capture`:

```js
let e = Y.mainRouter.context.nodeExtensionStack.getEntries()[0]?.view.props,
    t = Y.mainRouter.history.location.pathname.startsWith(`/extensions/`)
        ? e?.extension?.localSources
        : void 0;
await L.ipc.host.raycast.showWindowCaptureOverlay({ ..., nodeExtensionLocalSources: t });
```

O overlay só recebe o caminho do projeto — e portanto só tem onde gravar — se **no momento do
disparo** a janela estiver numa rota `/extensions/…`. Consequência prática, e é ela que torna
o passo não-óbvio: **é preciso um atalho** gravado no comando `Capture Window`
(`Settings › Extensions`, botão `Record Hotkey`, string em
`frontend/extension-static-commands-CK6ncoyB.js`). Ir até a busca digitar `Capture Window`
tira a janela da rota da extensão e o `Save for Store` some.

Também é por isso que `npm run dev` precisa estar rodando e atualizado: `localSources` vem do
registro da extensão de desenvolvimento. O registro que estava em
`~/.config/raycast/extensions/hermes` em 2026-08-21 ainda trazia `"author": "sam"`, ou seja,
era anterior à troca para `savio22`.

### O que continua valendo do caminho manual

O `ray lint` não afrouxou: `metadata/*.png` fora de 2000×1250 é `Wrong image size`. Conferido
ao vivo, com um PNG de 1000×625 dentro de `metadata/`:

```
error  - validate extension metadata
C:\...\metadata\hermes-1.png
    error  Wrong image size: 1000 x 625 pixels. Required size is 2000 x 1250 pixels. Make sure to use a retina screen when taking the screenshot
```

Trocado por um arquivo de 2000×1250, o mesmo passo volta a `ready` e o `ray lint` sai com 0
(os 14 avisos de Title Case seguem lá, e seguem sendo avisos).

O `tools-capturas.mjs` existe para quando o `Save for Store` não estiver disponível: ele
centraliza a captura em 2000×1250 sobre fundo sólido e **nunca amplia**. Ampliar resolveria o
lint e entregaria imagem borrada à revisão humana, que é o portão que importa.
