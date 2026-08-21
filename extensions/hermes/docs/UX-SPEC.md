# UX-SPEC — Hermes para Raycast (macOS e Windows)

> **Adendo — suporte a macOS.** Esta spec foi escrita para uma extensão só de Windows, e o corpo do
> documento continua fiel àquele momento. O que mudou, e prevalece sobre qualquer trecho abaixo:
>
> - o manifesto declara `"platforms": ["macOS", "Windows"]`;
> - a §3.7 (configuração manual) **não** pode nomear Explorador de Arquivos e Bloco de Notas em
>   texto fixo: os nomes vêm de `src/lib/platform.ts` e viram Finder e TextEdit no Mac. O mesmo vale
>   para `Ctrl+F`/`Cmd+F`, `Ctrl+C`/`Cmd+C`, `Ctrl+K`/`Cmd+K` e `Ctrl+Enter`/`Cmd+Enter`;
> - a §9.2 (teclado) continua valendo letra por letra **no Windows**. Os atalhos customizados agora
>   declaram também o bloco macOS, pela forma `{ Windows, macOS }` da API do Raycast;
> - a preferência `sessionKey` perdeu o `default` do manifesto: o padrão é resolvido em código, por
>   sistema, para não migrar em silêncio quem já usa a extensão.
>
> **O caminho macOS não foi validado ao vivo** — ver a seção macOS de `docs/CHECKLIST-MANUAL.md`.

Especificação completa de experiência e interface. Este documento é a fonte da verdade de UI para o
agente de implementação: nomes de comando, telas, estados, textos literais em pt-BR, atalhos e
regras de sincronização com o Hermes Desktop.

- Escopo atual: **15 comandos**, nos dois sistemas. Os sete fluxos-base do MVP continuam prioritários; os
  oito comandos de contexto, consulta e automação da antiga Fase 2 já têm telas e contratos
  documentados na seção §1.2. A Fase 3 continua somente como inventário.
- Fontes: `INSTRUCOES_DO_PROJETO.md` (produto) e `docs/research/01..07` (fatos técnicos verificados).
  **Onde os dois discordam, a pesquisa vence e o desvio está marcado com `DESVIO`.**
- Todo texto entre aspas ou em bloco `texto` é **literal** e deve ir para o código exatamente assim.

**Precedência.** Acima deste documento estão `docs/DECISOES-VERIFICADAS.md` (o que foi provado
contra o Hermes real) e, nas seções que ele declara substituir,
`docs/superpowers/specs/2026-08-19-conversa-continua-design.md`. As seções §1.1, §2.1, §2.2, §2.3,
§6.1, §6.2, §6.4, §6.5, §9.2 e §9.3 **foram reescritas** por aquele desenho em 2026-08-20: a tela
principal virou uma conversa contínua, e o `Form` de entrada e o `Detail` de resposta deixaram de
ser telas do comando. Onde esta spec ainda falar de um "formulário de perguntar" ou de uma "tela de
resposta", é erro de revisão — reporte.

Ordem de leitura recomendada: §0 → §4 (estados) → §10 (glossário) → §1 → §2 → §3 → §5..§9.

---

## 0. Decisões estruturais, desvios e um bloqueador

### 0.1 Desvios em relação ao brief (obrigatório declarar)

| # | O brief diz | A pesquisa mostra | Decisão desta spec |
|---|---|---|---|
| D1 | "não ler diretamente arquivos internos do Hermes" e "nunca exigir terminal" | A chave só existe em `%LOCALAPPDATA%\hermes\.env`, linha com `API_SERVER_KEY=`. | **RESOLVIDA por D-08:** leitura pontual iniciada pelo usuário, somente dessa linha, nunca em background, nunca exibida e nunca copiada. O caminho manual continua disponível. |
| D2 | `apiServerKey` é preferência protegida | O Raycast **não tem API para escrever preferências** (07 §6.5: só `openExtensionPreferences()` / `openCommandPreferences()`). | A chave detectada é gravada em `LocalStorage` (banco local **criptografado** do Raycast, 07 §11.1). A preferência `password` continua existindo como caminho manual e **tem precedência**. `Cache` NUNCA guarda a chave (é arquivo simples em disco). |
| D3 | `apiServerKey` seria obrigatória | Se `required: true`, o Raycast bloqueia o comando numa tela nativa antes do nosso onboarding. | `"required": false` em todas as preferências. O onboarding é nosso (§3). |
| D4 | Sete rótulos de estado cobrem tudo | Uma run pode sumir do servidor (404 por reinício do gateway ou TTL de 1 h — 04 §7.1). Isso **não é** "Falhou". | Adicionamos **uma** condição de lista, não um estado: `Execução expirada`. Nunca chamar de "Falhou" (seria mentira) nem de "Cancelado". Ver §4.3. |
| D5 | Aprovação deve mostrar "nome da ferramenta e argumentos" | O evento `approval.request` **não tem `tool_name` nem `args`** (04 §4.5). Traz `command`, `description`, `pattern_key(s)`. | A tela de aprovação mostra o **comando literal** e a **descrição do risco**. É proibido inventar/adivinhar nome de ferramenta. Ver §7. |
| D6 | "Menu Bar" e AppleScript | Indisponíveis no Windows (07 §17). | Não usados — e continuam não sendo, mesmo com `"platforms": ["macOS", "Windows"]`: um comando `menu-bar` ou um AppleScript só existiria em metade dos usuários. |
| D7 | Chat via `/v1/chat/completions` | Não serve para conversas compartilhadas: ids opacos, sem lista (03 §E). | Nunca usado no MVP. |
| D8 | Jobs no roadmap | `features.jobs_admin: false`, mas as rotas existem e respondem 200 ou 501 (D-04). | `Automações` está implementada: `200` lista, `501` explica indisponibilidade e `401` abre o primeiro uso. Nunca usar `features.jobs_admin` como gate. |

### 0.2 O motor de execução — decidido, não mais pendente

Dois transportes existem e são incompatíveis em uma propriedade crítica:

| Transporte | Sincroniza com o Desktop | Sobrevive ao fechamento da janela |
|---|---|---|
| `POST /api/sessions/{id}/chat/stream` | Sim (06 §6.2) | **Não** — o servidor interrompe o agente ao cair a conexão (04 §8.2) |
| `POST /v1/runs` + `GET /v1/runs/{id}/events` | **Sim, verificado** (D-01) | **Sim, verificado** (D-02) |

**O bloqueador V-1 foi executado contra o Hermes real e deu "sim".** Uma `POST /v1/runs` com o
`session_id` de uma conversa criada por nós com `"source": "desktop"` grava as mensagens do turno em
`state.db` sob aquela conversa, e ela aparece em Recentes no Hermes Desktop
(`docs/DECISOES-VERIFICADAS.md` D-01). A run também sobrevive à queda do cliente (D-02).

Consequência: **`/v1/runs` é o motor de todos os comandos**, sem ramo alternativo. A decisão
**P2 está fechada**, e a variante V-1b que existia em §6.5 **foi removida** — não deve ser
reintroduzida. `consumeSessionChatStream()` continua implementado em `src/lib/hermes-api.ts` e
**não é usado por tela nenhuma**: abortar aquele fetch interrompe o turno no servidor, o que quebraria
o princípio 8 do brief.

**Regra de higiene:** ao terminar um turno, se `GET /api/sessions/{id}` retornar
`message_count === 0`, apagar a linha com `DELETE /api/sessions/{id}`. Conversas vazias são
invisíveis no Desktop e viram lixo (06 R4).

### 0.3 Regras de sincronia herdadas da pesquisa (resumo operacional)

- Criar conversa **sempre** com `"source": "desktop"` — sem isso ela cai na seção "Messaging/API" do
  Desktop, fora de Recentes (06 R3).
- Nunca criar conversa vazia; criar no momento do primeiro envio (06 R4).
- Título é **único no banco inteiro**: colisão devolve `400 invalid_title`. Estratégia: título =
  primeiros 60 caracteres da pergunta; em colisão, tentar `" (2)"`, `" (3)"`; na terceira falha,
  criar **sem** título (03 B.3).
- Metadados mudam só por `PATCH /api/sessions/{id}` (campos aceitos: `title`, `end_reason`, `pinned`,
  `archived`, `hidden`, `unread`) — nunca escrever no SQLite (06 R5).
- Host literal `127.0.0.1`. **Nunca** enviar header `Origin` (403 vazio antes da auth) (01 §0, §5.2).
- Validação de porta: `GET /health` e exigir `platform === "hermes-agent"` (8644 é o webhook) (01 §4.6).
- Seguir o `session_id` devolvido pelo servidor para frente: compressão de contexto troca o id (03 C.4 §8).

---

## 1. Inventário de comandos

### 1.1 MVP — especificado neste documento

Ordem do array `commands` do `package.json` = ordem de prioridade na busca do Raycast.
`Perguntar ao Hermes` é o primeiro, conforme o brief.

| # | `name` | `title` | `subtitle` | `mode` | Arquivo |
|---|---|---|---|---|---|
| 1 | `ask-hermes` | `Perguntar ao Hermes` | `Hermes` | `view` | `src/ask-hermes.tsx` |
| 2 | `sessions` | `Conversas do Hermes` | `Hermes` | `view` | `src/sessions.tsx` |
| 3 | `run-task` | `Executar tarefa no Hermes` | `Hermes` | `view` | `src/run-task.tsx` |
| 4 | `active-runs` | `Execuções do Hermes` | `Hermes` | `view` | `src/active-runs.tsx` |
| 5 | `models` | `Modelos do Hermes` | `Hermes` | `view` | `src/models.tsx` |
| 6 | `check-connection` | `Verificar conexão com Hermes` | `Hermes` | `view` | `src/check-connection.tsx` |
| 7 | `configure-hermes` | `Configurar Hermes` | `Hermes` | `view` | `src/configure-hermes.tsx` |

`description` literais (mín. 12 caracteres pelo schema — 07 §5.2):

```
ask-hermes        Faça uma pergunta ao Hermes e receba a resposta na hora, com opção de continuar a conversa.
sessions          Veja, pesquise, continue, renomeie e organize suas conversas do Hermes, incluindo as do Hermes Desktop.
run-task          Peça uma tarefa mais longa ao Hermes e acompanhe cada etapa até o resultado final.
active-runs       Acompanhe as tarefas em andamento, responda pedidos de aprovação e reabra resultados recentes.
models            Veja os modelos disponíveis no seu Hermes e escolha qual usar por padrão.
check-connection  Verifique se o Hermes está ligado e se a conexão da extensão está funcionando.
configure-hermes  Conecte a extensão ao Hermes instalado neste computador, sem precisar de terminal.
```

**Argumentos** (máximo 3 por comando, 07 §7):

```jsonc
// ask-hermes
"arguments": [
  { "name": "pergunta", "type": "text", "placeholder": "O que você quer perguntar?", "required": false }
]
// run-task
"arguments": [
  { "name": "tarefa", "type": "text", "placeholder": "Descreva a tarefa", "required": false }
]
```

Nenhum outro comando tem argumentos. **Argumento vazio nunca é erro:** em `ask-hermes` ele abre a
conversa em branco, pronta para escrever (§2.1); em `run-task`, o formulário de §2.4.1.

**`keywords`** (ajudam quem não lembra o nome; máx. 12, ≤25 caracteres cada):
`ask-hermes`: `hermes, ia, ai, perguntar, pergunta, chat, nova mensagem, continuar conversa, agente`.
`sessions`: `hermes, conversas, historico, histórico, histórico de conversas, continuar conversa, chats, sessoes`.
`run-task`: `hermes, tarefa, nova tarefa, executar, run, agente`.
`active-runs`: `hermes, execucoes, andamento, aprovacao, pendentes, tarefas pendentes, tarefas em execução, aguardando aprovação, aprovação pendente, aprovações, status`.
`models`: `hermes, modelos, modelo, escolher modelo, trocar modelo, provider, ia`.
`check-connection`: `hermes, conexao, diagnostico, testar, status`.
`configure-hermes`: `hermes, configurar, conectar, chave, ajustes`.

Nos comandos auxiliares, `paste-answer` também pode ser encontrado por `reutilizar resposta` e
`copiar última resposta`; os aliases seguem os nomes exibidos no manifesto.

**`view` vs `no-view` — justificativa de cada escolha:**

- Os comandos com interface são `view`; `Colar última resposta` é o único `no-view` por ser uma
  ação local imediata. Os demais precisam mostrar progresso, resultado ou lista navegável, e
  **`no-view` é incompatível com streaming**: o comando é destruído quando a função retorna
  (07 §12.2, gotcha 4). Um resultado que só aparece em Toast quebraria os princípios 4 e 5 do brief.
- `check-connection` poderia ser `no-view` com Toast, mas precisa oferecer três ações
  (`Tentar novamente`, `Abrir configurações`, `Copiar detalhes técnicos`) e um diagnóstico legível —
  Toast só comporta duas ações e nenhum texto longo (07 §9.5). Logo, `view`.
- `configure-hermes` é `view` porque é uma tela de onboarding com escolha entre caminho automático e
  manual.
- **Nenhum comando usa `mode: "menu-bar"`** (indisponível no Windows, 07 §17).
- `interval` (background refresh) **não é usado no MVP**: exigiria `no-view` e o mínimo seguro é 1
  minuto, cadência inútil para acompanhar uma execução.


**Mapa de telas** — revisto pelo desenho da conversa contínua (§13 dele):

- `Perguntar ao Hermes` **é** a conversa. Um comando, um `List`, sem empilhar tela por turno: a barra
  de busca é o campo de escrita e cada item é uma troca inteira (§2.1).
- **Perguntar e ler a resposta deixaram de ser dois destinos.** Não existe mais um `Form` como porta
  do comando, nem uma tela de resposta empilhada por turno.
- O **detalhe da conversa** (`session-detail.tsx`, §2.3) continua existindo, mas deixou de ser o
  destino de abrir uma conversa: virou a ação secundária `Ver mensagens e ferramentas`.
- Abrir um item em `Conversas do Hermes` (§2.2) leva à **conversa**, não ao detalhe.

Telas empilhadas a partir da conversa, todas por ação secundária e todas com `Esc` voltando para ela:
`Escrever mensagem longa` (§2.1.1), `Responder pedido de aprovação` (§7), `Orientar execução` (§6.7),
`Renomear conversa` (§2.2), `Ver mensagens e ferramentas` (§2.3).

Os quatro comandos de texto da fase 2 (§1.2) **também não são telas**: eles capturam um texto e
entregam à mesma conversa com `initialMessage`, em conversa nova. Quem precisar de "prompt pronto
→ resposta escrevendo" monta a conversa, nunca uma superfície paralela — uma tela nova teria de
reimplementar fila, aprovação, parada e sincronia, e as quatro divergiriam na primeira mudança.

### 1.2 Contexto e administração — **implementados em 2026-08-20**

Os oito comandos existem, compilam e estão no manifesto. Nenhum dos quatro comandos de texto abriu tela nova: eles
quatro de texto entregam à conversa da §2.1 com `initialMessage` e `startNewConversation`.

| `name` | `title` | `mode` | Arquivo | O que decidiu o desenho |
|---|---|---|---|---|
| `ask-selection` | `Perguntar sobre seleção` | `view` | `src/ask-selection.tsx` | `getSelectedText()` **rejeita** sem seleção; `Clipboard.readText()` devolve `undefined` e **nunca** rejeita. São dois testes diferentes e não podem ser unificados num `try/catch` — fazer isso transforma "não há nada copiado" em "não consegui ler a seleção", que é mentira. Argumento `pergunta` opcional |
| `summarize-clipboard` | `Resumir clipboard` | `view` | `src/summarize-clipboard.tsx` | Pede tópicos, não parágrafo: é o formato que sobrevive à leitura de relance no painel |
| `fix-clipboard` | `Corrigir texto do clipboard` | `view` | `src/fix-clipboard.tsx` | A instrução **proíbe** comentário na resposta: o resultado é para ser colado no lugar do original |
| `translate-clipboard` | `Traduzir clipboard` | `view` | `src/translate-clipboard.tsx` | **Sem idioma nas preferências, de propósito.** O destino depende do texto, não de uma configuração: para português, e se já estiver em português, para inglês. Argumento `idioma` cobre a exceção |
| `paste-answer` | `Colar última resposta` | `no-view` | `src/paste-answer.ts` | Efeito colateral puro. **Não fala com o Hermes** — lê o índice local —, o que o faz funcionar com o Hermes desligado e o torna instantâneo. Sem guarda de configuração: sem chave nunca houve resposta para colar |
| `skills` | `Skills do Hermes` | `view` | `src/skills.tsx` | Somente leitura porque **não existe rota para ligar/desligar**. Cache de 5 min. Verificado ao vivo: 140 skills, 3 campos, e `category` vem vazia em 2 — a seção `Sem categoria` não é caso de borda |
| `toolsets` | `Ferramentas do Hermes` | `view` | `src/toolsets.tsx` | Somente leitura (idem). **Cache de 10 min, corte em 12 s, nunca em segundo plano** — ver abaixo. `Disponível`/`Precisa configurar`/`Desligado`/`Indisponível` são derivados de `enabled × configured`: o servidor não tem campo "disponível" |
| `jobs` | `Automações do Hermes` | `view` | `src/jobs.tsx` | `200` lista, `501` estado vazio explicativo (E19), `401` primeiro uso. **Nunca** com gate em `features.jobs_admin` (D-04) |

**`/v1/toolsets` é o endpoint mais perigoso que a extensão toca.** O handler roda no laço de
eventos do Hermes e pode disparar uma leitura síncrona de ~8 s ao portal da Nous
(`hermes_cli/nous_account.py:595`), travando o Hermes inteiro — inclusive a conversa de
outra janela. As três regras são obrigatórias e não são otimização: cache de **10 min**
(`CacheTtl.toolsets`), corte em **12 s** (`TOOLSETS_TIMEOUT_MS`), e **jamais** em segundo
plano — só quando alguém abriu a tela ou pediu `Atualizar lista`. Isto **substitui** o
"cache de 5 min" que esta seção pedia antes.

**`?include_disabled=true` é obrigatório em `GET /api/jobs`** (D-04). O padrão do servidor
filtra as pausadas; confirmado ao vivo em 2026-08-20, quando a única automação desta máquina
está pausada e sumiria da tela sem o parâmetro.

**Texto de entrada tem teto de 20.000 caracteres** nos quatro comandos de texto, com aviso
ao usuário quando corta. Não é economia de tokens: um turno de 200.000 caracteres demora
minutos, custa caro e quase sempre é engano.

### 1.3 Fase 3 — não especificado

Anexos e imagens; deeplinks `raycast://` para comandos da extensão; Tool para a IA do Raycast;
Hermes remoto; macOS.

### 1.4 Preferências da extensão (nível extensão, herdadas por todos os comandos)

> O JSON normativo está em `ARCHITECTURE.md` §5.1 e **vence** em caso de divergência. Esta tabela é
> só a camada de texto visível. Todas com `"required": false` (D3), inclusive `apiServerKey`.

| `name` | `type` | `title` | `label` (checkbox) | `default` | `description` |
|---|---|---|---|---|---|
| `apiServerKey` | `password` | `Chave de acesso do Hermes` | — | — | `Chave local do Hermes API Server. Use "Detectar configuração automaticamente" no comando Configurar Hermes se você não sabe qual é.` |
| `apiUrl` | `textfield` | `Endereço do Hermes` | — | **nenhum** (vazio = detecção automática) | `Deixe em branco para detectar automaticamente. Preencha apenas se o seu Hermes usa outra porta.` |
| `streamResponses` | `checkbox` | `Resposta` | `Mostrar a resposta enquanto ela é escrita` | `true` | `Desative se você preferir ver apenas a resposta pronta.` |
| `defaultModel` | `textfield` | `Modelo padrão` | — | — | `Opcional. Deixe em branco para usar o modelo padrão configurado no Hermes.` |
| `defaultProvider` | `textfield` | `Provedor padrão` | — | — | `Opcional. Só preencha se o suporte pediu ou se você sabe exatamente o que faz.` |
| `sessionKey` | `textfield` | `Escopo de memória` | — | _(sem `default` no manifesto; resolvido em código: `raycast:windows:default` / `raycast:macos:default`)_ | `Avançado. Identifica a memória de longo prazo usada por esta extensão. Mude somente se souber o efeito.` |
| `maxHistoryItems` | `dropdown` (`25/50/100/200`) | `Itens por página` | — | `50` | `Quantas conversas carregar de uma vez nas listas.` |

**`apiUrl` não tem default** (ARCHITECTURE D1): um valor preenchido desliga a auto-descoberta de
porta — a preferência sempre vence e nunca cai para descoberta. Com default fixo, uma instalação em
outra porta ficaria permanentemente quebrada.

**`maxHistoryItems` é `dropdown`, não `textfield`** (ARCHITECTURE D5): o schema do manifest tem sete
tipos e **nenhum numérico** (07 §6.1); um textfield exigiria validação e falharia para o público
não técnico. `limit` do servidor é limitado a 200 em `/api/sessions` (03 B.1).

**Não existe preferência `desktopSync`.** `source` é sempre `"desktop"`, constante no código
(06 R3, ARCHITECTURE D7). Um interruptor aqui seria enganoso em dois níveis: (a) desligá-lo não
deixa a conversa "só no Raycast" — ela continua gravada no mesmo `state.db` do Desktop, só muda de
seção para "Messaging/API"; (b) a sincronia é a manchete do produto e não é uma opção avançada.

---

## 2. Especificação tela a tela

Convenções desta seção:

- **Estado de carregamento** = `isLoading` + placeholders nativos do Raycast. Nunca uma tela em branco.
- **Toda tela** tem `ActionPanel`, mesmo vazia ou em erro. Nenhuma ação fica órfã: tudo está no painel
  (`Ctrl+K`), e os atalhos são apenas aceleradores (§9).
- **Guarda de configuração:** todo comando, antes de qualquer requisição, resolve a chave (§3.3). Sem
  chave → renderiza a tela `SemConfiguracao` (§3.4) no lugar do conteúdo. Sem exceção.
- `navigationTitle` de cada tela está indicado; ele é o título que aparece no topo do Raycast.

### 2.1 `Perguntar ao Hermes` (`ask-hermes`) — a conversa

**Esta seção foi reescrita pelo desenho da conversa contínua**
(`docs/superpowers/specs/2026-08-19-conversa-continua-design.md` §4 a §7), que fica acima desta spec
naquilo que declara substituir. O `Form` de entrada e o `Detail` de resposta **deixaram de ser telas
do comando**.

`navigationTitle`: o título da conversa; sem título, os 40 primeiros caracteres da primeira mensagem;
sem conversa nenhuma, `Perguntar ao Hermes`.

Componente: **um `List` só**, com `isShowingDetail` ligado assim que existir pelo menos um turno.

- **A barra de busca é o campo de escrita.** `filtering={false}` explícito, `searchText` controlado
  por estado, `onSearchTextChange`. Os itens são turnos, não resultados de busca.
- `searchBarPlaceholder`: `Pergunte alguma coisa…` na conversa vazia; `Pergunte outra coisa…` quando
  já há turnos.
- `searchBarAccessory`: `List.Dropdown` com `tooltip="Conversa"`, `Nova conversa` primeiro e as **5**
  conversas mais recentes em seguida (título ou `Sem título`, mais a data relativa). Trocar ali troca
  a conversa da tela. **O texto que estiver na barra sobrevive à troca** — é o seu rascunho, não é da
  conversa. A **fila** não sobrevive, e por isso a troca com fila passa por `confirmAlert` (§2.1.5).
- **Um item por turno**, em ordem cronológica, mais novo embaixo.
- `Enter` envia — **não por atalho.** `Enviar` é a primeira ação do `ActionPanel` e o Raycast liga a
  primária ao `Enter` em `List`. Declarar `shortcut` nela seria errado: o atalho alternativo nem
  apareceria no painel.

**Ao abrir o comando**, nesta ordem:

1. Guarda de configuração (§3.3) antes de qualquer requisição. Sem chave ⇒ `SemConfiguracao` (§3.4).
2. `launchContext.sessionId` (vindo de `Conversas`, do detalhe ou do progresso de execução) vence.
3. Senão, `StorageKeys.lastSessionId` — a última conversa usada, gravada a cada turno.
4. Com uma conversa em mãos, carrega os turnos recentes por
   `getSessionMessages(sessionId, { order: "latest", limit: 120 })` e **adota o `session_id` da
   resposta**, que pode diferir do pedido por compressão de contexto (§0.3).
5. Sem conversa alguma, ou falhando o carregamento, a tela abre vazia e pronta para escrever.
   **Falha ao carregar o passado nunca impede escrever o presente** (§2.1.4).
6. Argumento `pergunta` preenchido ⇒ enviado imediatamente como primeiro turno, sem passar por tela
   nenhuma.

**A conversa continua nascendo só no primeiro envio.** Nada de `POST /api/sessions` ao abrir a tela.

#### 2.1.1 `Escrever mensagem longa` — o desvio com `Form`

O `Form` deixou de ser a porta do comando e virou o desvio para mensagem com quebra de linha: o
Raycast não expõe interceptação de tecla, e na barra de busca não há como quebrar linha.
`Action.Push` a partir da conversa, sem atalho próprio.

`navigationTitle`: `Escrever mensagem longa`

1. `Form.TextArea` `id="pergunta"` — `title="Sua pergunta"`,
   `placeholder="Escreva sua pergunta. Ex.: resuma este relatório em 5 tópicos."`, `autoFocus`,
   **inicializado com o texto que já estiver na barra da conversa**.
2. `Form.Description` — `title="Como enviar"`,
   `text="Pressione Ctrl+Enter para enviar. Esc volta para a conversa."`

`enableDrafts` **não é usado**: esta é uma view empilhada, e rascunho de view empilhada não é
suportado — o `draftValues` chegaria pelo `LaunchProps` do comando errado.

**Não há mais `Form.Dropdown` de conversa**: subiu para a barra de busca (§2.1).
**Não há mais `Form.Dropdown` de modelo**: ver §2.1.6.

`ActionPanel`:

| Ordem | Título (literal) | Atalho | Comportamento |
|---|---|---|---|
| 1 | `Perguntar ao Hermes` | `Ctrl+Enter` | `Action.SubmitForm`. Vazio ⇒ erro de campo `Escreva sua pergunta.` Envia e faz `pop()` |
| 2 | `Abrir configurações` | `Ctrl+Shift+A` | `openExtensionPreferences()` |

A primária de um `Form` responde a `Ctrl+Enter`, não a `Enter`. A validação usa o literal
`Escreva sua pergunta.` — **nunca** o texto em inglês de `FormValidation.Required`.

#### 2.1.2 Envio — sequência, por turno

Vale **por turno**, não por tela: a tela já está montada e continua montada.

1. **Sem Toast de envio.** O `Enviando ao Hermes…` que esta seção pedia **saiu**. O próprio turno
   aparecendo na lista com o rótulo `Preparando` é retorno melhor e mais imediato, e um toast por
   turno, numa tela que aceita vários, seria ruído. A única exceção é `Enviar` com a barra vazia: aí
   há Toast de falha com o literal `Escreva sua pergunta.` (§2.1.4).
2. O turno entra na lista **na hora**, com o rótulo `Preparando`, e a barra é limpa. A seleção
   estaciona nele (§2.1.5).
3. Havendo turno vivo, o novo **fica na fila** e não dispara nada (§2.1.5). No máximo **um turno vivo
   por conversa** (R9).
4. Sem conversa ainda: `POST /api/sessions` com `{ id, title, source: "desktop" }` — `source` é
   **constante** (06 R3; não existe preferência para isso). `id` = `newSessionId()`
   (`ARCHITECTURE.md` §7.5), ou seja `raycast_<epoch_ms>_<8 hex>`. `400 invalid_title` conforme §0.3;
   `409 session_exists` ⇒ gerar outro id uma vez.
5. Gravar em `LocalStorage`, **antes de renderizar**, o registro da execução com `rememberRun()` — a
   forma é `StoredRun` de `ARCHITECTURE.md` §9.2. Tudo que a lista de §2.5 mostra sai daí.
6. `POST /v1/runs { input, session_id, model?, provider? }` → 202 `{ run_id, status: "started" }`. O
   literal `"started"` **não** entra no enum de estados (04 §1.6). `model`/`provider` saem de
   `resolveModelChoice()` (§2.1.6), nunca da preferência crua.
7. Abertura **imediata** do stream `GET /v1/runs/{run_id}/events` — imediata porque a fila de eventos
   do servidor é descartada em 300 s sem assinante (04 §7.2).

#### 2.1.3 O turno — o item e o painel

| Parte | Conteúdo |
|---|---|
| `id` | Turno vivo ou enfileirado: identificador gerado no cliente. Turno vindo do servidor: o `id` da mensagem que abriu a troca. Nunca reutilizado |
| `title` | O que você escreveu, em uma linha só, truncado em **60** caracteres. Troca cujo começo ficou fora da página carregada: `Parte anterior desta conversa` |
| `icon` | O ícone do estado, de `RUN_STATUS_APPEARANCE` (§4.1) |
| `accessories` | Enquanto não terminal (ou expirada): o rótulo do estado, como `tag` colorida. Terminal e bem-sucedido: a duração (`12 s`), com `tooltip="Quanto tempo esta resposta levou"` |
| `detail.markdown` | `**Você**` + a sua mensagem + `---` + a resposta |

**DESVIO deliberado:** a doc do Raycast recomenda não usar `accessories` quando `isShowingDetail`
está ligado. Divergimos porque sem o acessório a lista não diria qual turno está respondendo e qual
terminou — e é essa a informação que faz a conversa ser legível de relance. É a mesma divergência que
a extensão ChatGPT da loja adota. Se na prática o acessório espremer o título a ponto de cortá-lo,
**o acessório cai antes do título**.

Teto de **6.000 caracteres** por bloco de texto do painel (a mensagem e a resposta contam separado);
passando disso, corta e acrescenta `_Mensagem longa: mostrando só o começo._` — o mesmo literal e o
mesmo corte de §2.3, porque cada `setState` atravessa a ponte IPC até o host WPF.

Dois modos, alternados por `Ctrl+T`, valendo para a tela inteira: **Resposta** (padrão) e **Etapas**
(§6.3). No modo Etapas o corpo é a lista de linhas com emoji; sem nenhuma,
`_Nenhuma etapa até agora._`

`List.Item.Detail.Metadata` do turno selecionado — os mesmos cinco campos de sempre, porque continuam
verdadeiros **por turno**:

```
Estado           <rótulo dos 7, com ícone e cor de §4>
Conversa         <título ou "Sem título">
Modelo           <modelo em uso, ou "Padrão do Hermes">
Sincronização    "Aparece no Hermes Desktop"    (valor único; não há caminho que produza outro)
Duração          "12 s"                         (só após o término)
```

`Metadata.TagList` `Etapas` — os nomes das ferramentas usadas, no máximo 6 — aparece somente no modo
Etapas.

**Avisos que falam da tela agora, e não do conteúdo da troca**, entram acima do corpo do turno vivo,
nesta ordem: pedido de parada (§6.6), uso concorrente (§8.6), pedido de aprovação (§7),
acompanhamento em modo simples (§6.5), e `> 🔧 Usando <ferramenta>…` (§6.3).

**Uma linha nunca é meia troca.** A resposta jamais é irmã da pergunta na lista: ela é o corpo dela.
É isto que conserta a confusão que o detalhe da conversa provocava.

#### 2.1.4 Itens que não são turnos

| Quando | Item |
|---|---|
| Conversa vazia | `List.EmptyView` — ícone do comando, `title: "Comece a conversa"`, `description: "Escreva sua pergunta na barra acima e pressione Enter. Suas conversas do Raycast também aparecem no Hermes Desktop."` |
| Carregando o passado | `List.EmptyView` — `title: "Carregando a conversa"`, `description: "Buscando as mensagens desta conversa no Hermes."` |
| Falha ao carregar o passado | Primeiro item da lista, `Icon.Warning`: `title: "Não foi possível carregar as mensagens anteriores desta conversa"`, `subtitle: "Você pode continuar escrevendo normalmente."` **Aviso, nunca bloqueio** |
| Há trocas mais antigas | Item no topo, `Icon.ArrowUp`: `title: "Carregar parte anterior da conversa"`, `subtitle: "Traz as 40 trocas anteriores a estas."`, atalho `Ctrl+Shift+H` |
| Erro que impede a tela inteira | `List.EmptyView` — `title: "Não foi possível perguntar"`, `description` = a mensagem de §5 |

**O `EmptyView` é obrigatório, não enfeite:** o `actions` do próprio `List` só é exibido quando a
lista **não** tem filhos. Sem o `EmptyView` carregando a ação `Enviar`, `Enter` não faria nada na
conversa vazia. Pela mesma razão, **`Enviar` vai repetida no `ActionPanel` de cada item.**

`Enviar` fica no painel **mesmo com a barra vazia**, e nesse caso avisa em vez de enviar: Toast de
falha com o literal `Escreva sua pergunta.` Isto é deliberado. O Raycast não tem ação desabilitada, e
retirar `Enviar` do painel promoveria outra ação a primária: `Enter` numa barra vazia passaria a
copiar ou a trocar de modo, sem aviso. Uma ação que sempre significa a mesma coisa vale mais que um
painel enxuto.

#### 2.1.5 A fila, a seleção e o teto

**A fila.** R9 é dura: no máximo um turno vivo por conversa. O servidor **não** tem trava — ele
aceita duas execuções na mesma conversa, elas rodam ao mesmo tempo, a transcrição fica na ordem de
término e a contenção é brutal (D-09). **A fila local é a única trava que existe.**

- `Enter` durante uma resposta **enfileira**. A mensagem aparece imediatamente como turno novo, no
  fim da lista, com o rótulo `Preparando`, e a barra é limpa.
- Quando o turno em curso chega a estado terminal, o primeiro da fila **dispara sozinho**.
- A fila é **local e volátil**: vive no estado do React, nunca no `LocalStorage`. Fechar a janela
  descarta o que estava na fila e **não** descarta o que já virou execução. Enfileirar no disco
  criaria mensagens disparando sem ninguém olhando, o que contraria o princípio de que o usuário
  sempre vê o que pediu.
- Se o turno em curso **falhar ou for cancelado**, a fila **não** dispara sozinha. Os enfileirados
  ficam com o rótulo `Cancelado` e a linha
  `> Esta mensagem não chegou a ser enviada porque a resposta anterior não terminou.`, com
  `Tentar novamente` disponível. Disparar em cima de um erro repetiria o erro em silêncio.
- Turno enfileirado tem `Remover da fila` (sem `confirmAlert`: nada é destruído no servidor e o texto
  volta disponível pela ação seguinte) e `Editar antes de enviar` (devolve o texto para a barra e
  tira o turno da fila).

**Troca de conversa com fila** — `confirmAlert` obrigatório:

```
title:   "Descartar as mensagens que ainda não foram enviadas?"
message: "Você tem <n> mensagem(ns) esperando nesta conversa. Trocar de conversa apaga o que está esperando; o que já foi enviado continua no Hermes."
primaryAction:  { title: "Trocar de conversa", style: Alert.ActionStyle.Destructive }
dismissAction:  { title: "Continuar aqui" }
rememberUserChoice: false
```

Recusada a troca, o seletor da barra precisa **voltar a exibir a conversa real**: ele é controlado
por `value` e nada no estado mudou, então é preciso remontá-lo pela `key`, senão ele fica mostrando a
conversa que **não** foi aberta.

Trocando de conversa com um turno vivo, Toast informativo:
`A tarefa continua rodando no Hermes mesmo se você fechar o Raycast.`

**A seleção.** `selectedItemId` estaciona no turno recém-criado no momento do envio e é liberado
(`undefined`) quando aquele turno chega a estado terminal — daí em diante as setas navegam livres.
`onSelectionChange` **fica de fora**: tem corrida conhecida (raycast/extensions#10844), e a extensão
ChatGPT publicada na loja o removeu pelo mesmo motivo, mantendo só `selectedItemId`.

**Teto e paginação** — duas grandezas diferentes, que não devem ser confundidas:

- **carregamento**: 120 mensagens por página do servidor (§8.4), o mesmo que §2.3 já usa;
- **renderização**: no máximo **40 turnos** na tela (`RENDER_TURN_LIMIT`).

Como uma troca consome de duas a várias mensagens, uma página costuma render menos de 40 turnos —
nesse caso todos aparecem. Quando o pareamento render mais, os mais antigos ficam retidos e há mais
para carregar sem nem precisar ir ao servidor. **Se a interface engasgar com um turno escrevendo,
`RENDER_TURN_LIMIT` é o primeiro número a cair, antes de qualquer outra mudança.**

#### 2.1.6 O modelo — saiu desta tela

**Isto o desenho não previa, e a spec precisa registrar.** Com o `Form` fora do caminho, **não há
mais seletor de modelo por pergunta na tela principal.** Quem escolhe modelo é `Modelos do Hermes`
(§2.6), que grava no `LocalStorage`:

- `nextTurnModel` — pela ação `Usar só na próxima pergunta` (`Ctrl+Shift+M`);
- `defaultModel` — pela ação `Usar como modelo padrão` (`Enter`).

A cada envio, `resolveModelChoice()` aplica a precedência **P3**: `nextTurnModel` (consumido e
apagado assim que é usado) > `defaultModel` > preferência da extensão. O campo `Modelo` do metadata
(§2.1.3) mostra o que está em uso, ou `Padrão do Hermes`.

Isto **não** é perda de função: a escolha de modelo continua a um comando de distância e passou a
valer para todas as superfícies, em vez de existir só dentro de um formulário.

#### 2.1.7 Estados — por turno, não por tela

A tela não tem mais um estado só: cada turno tem o seu, e vários convivem na mesma lista.

| Estado do turno | O que o usuário vê |
|---|---|
| Na fila | Rótulo `Preparando`; painel com a sua mensagem e nenhuma resposta; ações `Remover da fila` e `Editar antes de enviar` |
| Antes do 1º pedaço de texto | Rótulo `Preparando`; corpo `_Preparando…_`, que vira `_O Hermes está pensando…_` depois de 3 s (§6.1). Em conversa longa isso leva ~5,5 s e é o caminho normal, não a exceção (D-11) |
| Escrevendo | Texto crescendo no painel; rótulo `Executando`; `Parar` disponível |
| Aguardando aprovação | Bloco de aprovação no topo do painel + `Responder pedido de aprovação` (§7); rótulo `Aguardando aprovação` |
| Concluído | Resposta completa; o acessório vira a duração; ações finais (§6.4) |
| Vazio (terminou sem texto) | `O Hermes terminou sem escrever uma resposta.` + `Tentar novamente`, `Ver etapas` |
| Falhou | O bloco de erro de §5 **dentro do turno**, com o texto que já tinha chegado preservado acima dele. A conversa continua na tela e você pode mandar a próxima mensagem |
| Cancelado | Texto parcial preservado; rótulo `Cancelado`; `Copiar o que já veio`, `Tentar novamente` |
| Execução expirada | Condição de lista, não estado (§4.3): o acessório continua sendo o rótulo e `Tentar novamente` fica disponível. **Nunca** mapear para `Falhou` nem `Cancelado` |

**Erro que impede a tela inteira** — não configurado, chave recusada, Hermes desligado — toma a tela,
porque não há conversa nenhuma para preservar. E2 continua com `Detectar configuração
automaticamente` como **primeira** ação: `Tentar novamente` com a mesma chave só repetiria o 401.

### 2.2 `Conversas do Hermes` (`sessions`)

`navigationTitle`: `Conversas do Hermes`. Componente: `List` com `isShowingDetail={false}`,
`searchBarPlaceholder="Pesquisar conversas por título"`, `filtering` client-side (a API **não tem**
parâmetro de busca — 03 B.1).

Dados: `GET /api/sessions?limit=<maxHistoryItems>&offset=0`. Paginação via `pagination` do `List`
(`pageSize`, `hasMore` vindo do campo `has_more`, `onLoadMore`).
**Atenção:** `has_more` só conta linhas não fixadas e as fixadas são inseridas **além** do `limit`
(03 B.1) — o próximo `offset` é `nextSessionOffset(offsetAtual, página)` de `ARCHITECTURE.md` §7.5
(soma só as linhas **não** fixadas retornadas), nunca `offset + limit`.

**Seções:**
1. `Fixadas` — itens com `pinned === true`.
2. `Recentes` — o restante, ordenado por `last_active` (a API já ordena).

**Item da lista:**

- `title`: `session.title` ou `Sem título`
- `subtitle`: `session.preview` (primeiros ~60 caracteres da primeira mensagem do usuário)
- `icon`: por origem — criada no Raycast (o id começa com `raycast_`, prefixo de `newSessionId()`;
  não é preciso guardar lista nenhuma) → `Icon.Bolt`; `desktop`/`cli`/`dashboard` → `Icon.Desktop`;
  `telegram`/`discord`/`slack` → `Icon.Message`; demais → `Icon.Circle`
- `accessories`:
  - `{ tag: "Criada no Raycast" }` quando o id começa com `raycast_`, senão `{ tag: "Do Hermes Desktop" }`
    para `source` em `desktop|cli|dashboard|hermes_browser`
  - `{ text: "<n> mensagens" }`
  - `{ date: new Date(last_active * 1000) }`  ← `last_active` vem em **segundos**, não milissegundos

**`ActionPanel` do item** — reescrito pelo desenho da conversa contínua (§12 dele). **Abrir uma
conversa passou a ser continuá-la**: a ação primária leva à conversa (§2.1), e o detalhe — que é um
arquivo de mensagens, não uma conversa — virou ação secundária com o nome do que ele de fato é.

| Seção | Título (literal) | Atalho | Detalhe |
|---|---|---|---|
| 1 | `Continuar esta conversa` | `Enter` | `launchCommand` de `ask-hermes` com `launchContext.sessionId`. Antes disso, §8.6: usada no Desktop há menos de 30 s ⇒ Toast de aviso, **nunca** bloqueio |
| 1 | `Ver mensagens e ferramentas` | `Ctrl+Shift+D` | `Action.Push` → §2.3 |
| 2 | `Abrir no Hermes Desktop` | `Ctrl+O` | `Action.Open` com `target = hermesDesktopSessionUrl(id)` (`ARCHITECTURE.md` §6.3 — valida o id e faz o `encodeURIComponent`); some quando a função devolver `undefined`. Ver §8.4 |
| 2 | `Copiar resposta mais recente` | `Ctrl+Shift+C` | Busca sob demanda `GET /api/sessions/{id}/messages?limit=1&order=latest` |
| 2 | `Copiar identificador da conversa` | — | Mitigação de §8.4: só no painel, sem atalho (a tabela de teclado prevalece sobre a §8.4 aqui) |
| 3 | `Renomear conversa` | `Ctrl+E` | `Action.Push` de um `Form` de um campo; `PATCH {title}` |
| 3 | `Fixar conversa` / `Desafixar conversa` | `Ctrl+.` | `PATCH {pinned}` |
| 3 | `Arquivar conversa` | `Alt+A` | `PATCH {archived: true}`; some da lista |
| 3 | `Ramificar conversa` | `Ctrl+Shift+B` | `POST /api/sessions/{id}/fork`. Copy do sucesso em §10.4 |
| 3 | `Excluir conversa` | `Ctrl+D` | `style: destructive` + `confirmAlert` obrigatório (§2.2.1) |
| 4 | `Nova conversa` | `Ctrl+N` | `launchCommand` de `ask-hermes` **sem** contexto: a conversa abre vazia. **Não** chama `POST /api/sessions` aqui — a conversa só nasce junto do primeiro envio (06 R4). É o "criar sessão" exigido pelo MVP #3 do brief |
| 4 | `Atualizar lista` | `Ctrl+R` | revalidate manual |
| 4 | `Abrir configurações` | `Ctrl+Shift+A` | — |

`Ctrl+Shift+Return` (`Continuar esta conversa`) **continua válido aqui**, como acelerador da ação
primária: é nas telas de fora da conversa que ele segue tendo dono (§9.2).

#### 2.2.1 Confirmação de exclusão (literal)

```
title:   "Excluir esta conversa?"
message: "A conversa \"<título>\" será removida do Hermes, inclusive do Hermes Desktop. Não dá para desfazer."
primaryAction:  { title: "Excluir", style: Alert.ActionStyle.Destructive }
dismissAction:  { title: "Cancelar", style: Alert.ActionStyle.Cancel }
rememberUserChoice: false
```

`rememberUserChoice` **sempre** `false` para exclusão: uma escolha lembrada transformaria um comando
destrutivo em silencioso.

#### 2.2.2 Estados

| Estado | Tela |
|---|---|
| Carregando | `List isLoading` com os placeholders nativos. |
| Vazio (nenhuma conversa) | `List.EmptyView` — `icon: Icon.SpeechBubble`, `title: "Nenhuma conversa por aqui"`, `description: "Quando você perguntar algo ao Hermes, a conversa aparece nesta lista e também no Hermes Desktop."`, com a ação `Perguntar ao Hermes` (`Enter`). |
| Vazio por busca | `List.EmptyView` — `title: "Nada encontrado"`, `description: "Nenhuma conversa com esse texto no título."` |
| Erro | `List.EmptyView` com o texto de erro de §5 e as três ações padrão. |

### 2.3 Detalhe da conversa — `Ver mensagens e ferramentas` (`session-detail.tsx`)

Não é comando; é `push`, e **deixou de ser o destino de abrir uma conversa**. Pelo desenho da conversa
contínua (§12 dele), abrir uma conversa leva à conversa (§2.1); esta tela virou ação secundária, com o
nome do que ela de fato é: **`Ver mensagens e ferramentas`**, `Ctrl+Shift+D`, alcançável de dentro da
conversa e da lista de §2.2.

Ela fica porque é a única superfície que pagina conversa longa, mostra mensagens de ferramenta e
oferece `Copiar conversa inteira` — esconder é certo, apagar não seria.

`List` com `isShowingDetail`, uma seção por dia (`Hoje`, `Ontem`, `12 de agosto`), item por mensagem.

- `GET /api/sessions/{id}/messages?limit=120&order=latest` (mais recentes primeiro na busca, exibidas
  em ordem cronológica). Página anterior: `offset += 120` mantendo `order=latest` (03 B.7).
- Item: `title` = `Você` ou `Hermes` ou `Ferramenta: <tool_name>`; `subtitle` = primeira linha do
  conteúdo; `detail.markdown` = conteúdo completo.
- **Mensagens de ferramenta ficam ocultas por padrão.** `List.Dropdown` na barra de busca:
  `Somente conversa` (padrão) / `Conversa e ferramentas`.
- Aviso de transcrição truncada: se a API retornar menos do que o `message_count` da conversa,
  exibir como último item da lista:
  `title: "Parte antiga desta conversa não está disponível aqui"`,
  `subtitle: "Abra no Hermes Desktop para ver o histórico completo."` (03 B.7, `include_compacted`).

`ActionPanel`: `Continuar esta conversa` (`Enter`, também `Ctrl+Shift+Return`),
`Copiar mensagem` (`Ctrl+Shift+C`), `Copiar conversa inteira` (`Ctrl+Alt+C`),
`Abrir no Hermes Desktop` (`Ctrl+O`), `Renomear conversa` (`Ctrl+E`),
`Carregar parte anterior da conversa` (`Ctrl+Shift+H`), `Atualizar` (`Ctrl+R`).

**Aqui `Ctrl+Shift+D` não existe.** A ação que o usa mora nas telas que levam a esta, nunca nesta —
ver a regra de §9.3 sobre os dois significados desse atalho.

### 2.4 `Executar tarefa no Hermes` (`run-task`)

Mesma máquina de execução de §2.1; a diferença é a **entrada mais rica** e a **saída em etapas**.

#### 2.4.1 `Form` de entrada

1. `Form.TextArea` `id="tarefa"` — `title="O que o Hermes deve fazer"`,
   `placeholder="Descreva a tarefa com o máximo de detalhe possível."`, `autoFocus`.
2. `Form.Separator`
3. `Form.TextArea` `id="instrucoes"` — `title="Instruções extras"`, `info="Opcional. Regras que valem só para esta tarefa, como tom, formato ou limites."` → vai em `instructions` do `POST /v1/runs` (04 §1.1).
4. `Form.Dropdown` `id="modelo"` — `title="Modelo"`, primeiro item `Padrão do Hermes`.
5. `Form.Dropdown` `id="conversa"` — `title="Conversa"`, primeiro item `Nova conversa`.

`Form.Description` fixo no rodapé:

```
title: "Sobre esta tarefa"
text:  "A tarefa continua rodando no Hermes mesmo se você fechar o Raycast. Você pode acompanhar depois em Execuções do Hermes."
```

`ActionPanel`: `Executar tarefa` (`Enter`), `Ver tarefas em andamento` (`Ctrl+Shift+E`),
`Abrir configurações` (`Ctrl+Shift+A`).

Proteção contra duplicidade: não existe `Idempotency-Key` em `/v1/runs` (04 §1.3). O botão de envio
fica desabilitado do clique até chegar o 202.

#### 2.4.2 Saída

`Detail` própria de `run-task` (`run-progress.tsx`), abrindo no modo **Etapas**, não no modo
Resposta. `Ctrl+T` alterna. **Esta tela não virou conversa:** o desenho da conversa contínua vale
para §2.1 e só. Os mesmos cinco campos de metadata de §2.1.3 valem aqui.

### 2.5 `Execuções do Hermes` (`active-runs`)

Não existe rota de listagem de runs no servidor (04 §7). **A lista é 100% local**, reconstruída dos
ids gravados em `LocalStorage` e revalidada com `GET /v1/runs/{run_id}` um a um.

`List` com `searchBarPlaceholder="Pesquisar por texto da tarefa"`.

**Seções, nesta ordem:**
1. `Precisa de você` — runs em `waiting_for_approval`
2. `Em andamento` — `queued`, `running`, `stopping`
3. `Concluídas` — `completed`
4. `Encerradas` — `cancelled`, `failed`, expiradas

**Item:** `title` = primeiros 60 caracteres do prompt; `subtitle` = título da conversa;
`icon` = ícone/cor do estado (§4.2); `accessories` = `{ tag: <rótulo do estado> }` e
`{ date: <created_at> }`.

**Polling:** a cada **2 s** enquanto existir pelo menos uma run não terminal e a lista estiver em
primeiro plano; para completamente quando todas forem terminais (04 §3.3). Cada ciclo faz no máximo
10 requisições; runs terminais não são mais consultadas.

**Reconciliação de `404 run_not_found`** (04 §7.1): marcar como `Execução expirada` — **nunca** como
`Falhou`. Ver §4.3.

`ActionPanel` do item:

| Título | Atalho | Quando aparece |
|---|---|---|
| `Ver execução` | `Enter` | sempre |
| `Responder pedido de aprovação` | `Enter` (substitui a 1ª ação) | estado `Aguardando aprovação` |
| `Parar execução` | `Ctrl+Shift+P` | estados não terminais |
| `Orientar execução` | `Ctrl+Shift+G` | **somente** `Executando` (04 §5.3 recusa fora disso) |
| `Copiar resultado` | `Ctrl+Shift+C` | `Concluído` |
| `Abrir no Hermes Desktop` | `Ctrl+O` | quando há `session_id` de conversa real |
| `Executar esta tarefa novamente` | `Ctrl+N` | sempre |
| `Remover da lista` | `Ctrl+D` | terminais e expiradas; só apaga o registro local |
| `Atualizar` | `Ctrl+R` | sempre |

`Remover da lista` usa `confirmAlert`? **Não** — não é destrutivo no servidor. Mas o texto precisa
deixar isso claro: usar o título literal `Remover da lista (não apaga nada no Hermes)`.

**Vazio:** `List.EmptyView` — `title: "Nenhuma execução recente"`,
`description: "Quando você pedir uma tarefa ao Hermes, ela aparece aqui até você limpar."`,
ação `Executar tarefa no Hermes`.

### 2.6 `Modelos do Hermes` (`models`)

`GET /api/model/options` → `{ providers[], model, provider }` (02 §3.3). Cache de 10 minutos.

`List` com `isShowingDetail`, uma `List.Section` por provedor (`row.name`), itens = modelos.

- Item `title` = id do modelo; `accessories`:
  - `{ tag: { value: "Em uso", color: Color.Green } }` quando é o modelo/provedor atual
  - `{ tag: "Rápido" }` quando `capabilities[model].fast`
  - `{ tag: "Raciocínio" }` quando `capabilities[model].reasoning`
  - preço, quando existir: `{ text: "entrada $3.00 · saída $15.00" }` (são **strings prontas**, não
    números — 02 §3.4)
- Provedor não autenticado (`authenticated === false`): a seção ganha o accessory
  `{ tag: { value: "Precisa de configuração", color: Color.Orange } }` e os itens ficam com
  `icon: Icon.Lock`. Detalhe traz o `warning` do servidor.

`Detail` do item (`List.Item.Detail.Metadata`): `Provedor`, `Modelo`, `Rápido` (`Sim`/`Não`),
`Raciocínio` (`Sim`/`Não`), `Preço de entrada`, `Preço de saída`, `Origem` (`source`).

`ActionPanel`:

| Título | Atalho | Efeito |
|---|---|---|
| `Usar como modelo padrão` | `Enter` | Grava `{provider, model}` em `LocalStorage` sob `StorageKeys.defaultModel`. **Não** altera o Hermes: não existe rota para isso no API Server (02 §6.6). Precedência sobre a preferência `defaultModel` — decisão **P3**. Toast: `Modelo padrão da extensão atualizado.` |
| `Usar só na próxima pergunta` | `Ctrl+Shift+M` | Grava `StorageKeys.nextTurnModel`, consumido **e apagado** no envio seguinte. É o "override por tarefa sem alterar o default global" do MVP #5. |
| `Copiar nome do modelo` | `Ctrl+Shift+C` | — |
| `Atualizar lista` | `Ctrl+R` | Refaz com `?refresh=true`; Toast animado `Consultando provedores…` porque a chamada é lenta (re-sonda **todos** os provedores). |

**Texto obrigatório de esclarecimento**, como `List.Section` title da primeira seção ou na descrição
do vazio: `O padrão escolhido aqui vale só para a extensão do Raycast. O Hermes Desktop continua com o modelo dele.`
Sem isso o usuário acredita ter mudado o Hermes inteiro — é a confusão mais provável desta tela.

**Vazio:** `title: "Nenhum modelo disponível"`,
`description: "O Hermes está ligado, mas nenhum provedor de modelo está configurado. Abra o Hermes Desktop para configurar um."`

### 2.7 `Verificar conexão com Hermes` (`check-connection`)

`Detail` de diagnóstico, executado assim que o comando abre.

**Sequência (cada passo vira uma linha com ícone):**
1. `Encontrando o Hermes` — `resolveBaseUrl({force: true})` (`ARCHITECTURE.md` §6.1): preferência →
   cache → `config.yaml` → `API_SERVER_PORT` do ambiente → `.env` → `8642`.
2. `Verificando se o Hermes está ligado` — `GET /health`, exigindo `platform === "hermes-agent"`.
3. `Testando sua chave de acesso` — `GET /v1/models` com Bearer.
4. `Conferindo os recursos disponíveis` — `GET /v1/capabilities`.
5. `Procurando suas conversas` — `GET /api/sessions?limit=1`.

**Markdown de sucesso (literal):**

```markdown
# Tudo certo

O Raycast está conectado ao Hermes deste computador.

- ✅ Hermes encontrado em 127.0.0.1:8642
- ✅ Hermes está ligado (versão 0.20.4)
- ✅ Sua chave de acesso funciona
- ✅ Recursos disponíveis: conversas, tarefas, aprovações, streaming
- ✅ 12 conversas encontradas

Suas conversas do Raycast também aparecem no Hermes Desktop.
```

Cada linha usa ✅ para sucesso, ⚠️ para funcionando com ressalva e ❌ para falha. Passos ainda não
executados aparecem com `…` e a tela fica `isLoading` até o último.

**Markdown de falha (exemplo, o texto do erro vem de §5):**

```markdown
# Não foi possível conectar

Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo e se a URL e a chave estão corretas.

- ✅ Hermes encontrado em 127.0.0.1:8642
- ❌ Sua chave de acesso não foi aceita
```

`Detail.Metadata`: `Endereço`, `Versão do Hermes`, `Estado`, `Conversas encontradas`.
**A chave nunca aparece na metadata, nem mascarada.**

`ActionPanel`: `Testar de novo` (`Ctrl+Shift+T`), `Detectar configuração automaticamente`
(`Ctrl+Shift+D`), `Abrir configurações` (`Ctrl+Shift+A`),
`Mostrar detalhes técnicos` (`Ctrl+Shift+I`), `Copiar detalhes técnicos` (`Ctrl+Alt+C`).

### 2.8 `Configurar Hermes` (`configure-hermes`)

Ver §3 inteira — é a tela de primeiro uso e também o ponto de reparo quando algo quebra.

---

## 3. Primeiro uso e a chave de acesso

### 3.1 O problema e a decisão

O brief exige duas coisas que colidem: *nunca exigir terminal* e *não ler arquivos internos do
Hermes*. A chave `API_SERVER_KEY` existe **apenas** em `%LOCALAPPDATA%\hermes\.env` (01 §2.7). Sem
lê-la, o único caminho é o usuário abrir o arquivo por conta própria.

**Decisão (D1):** existe uma ação **explícita, visível e iniciada pelo usuário** chamada
`Detectar configuração automaticamente`. Ela é a única coisa na extensão inteira autorizada a tocar
em arquivos do Hermes, e apenas dentro destes limites:

| Permitido | Proibido |
|---|---|
| Ler `<HERMES_HOME>\.env` procurando **somente** a linha `^\s*(export\s+)?API_SERVER_KEY\s*=` | Ler qualquer outra chave do `.env` |
| Ler `<HERMES_HOME>\config.yaml` para descobrir `platforms.api_server.extra.port` e `.host` | Ler `auth.json`, `state.db`, `desktop.json`, `connections.json` ou qualquer outro arquivo |
| Ler `<HERMES_HOME>\gateway.pid` para saber se o gateway está vivo | Escrever qualquer arquivo do Hermes |
| Rodar isso **só** quando o usuário aciona a ação | Rodar isso na inicialização, em background, em `interval` ou "por conveniência" |
| Guardar o valor em `LocalStorage` (banco criptografado do Raycast) | Guardar em `Cache`, em arquivo, em log, em Toast, em erro ou no clipboard |
| Dizer "encontrei" | Exibir a chave, exibir prefixo/sufixo, exibir o tamanho |

`<HERMES_HOME>` = `process.env.HERMES_HOME` || `gateway.pid.hermes_home` || pasta padrão da
plataforma — `path.join(process.env.LOCALAPPDATA, "hermes")` no Windows (01 §2.6),
`path.join(homedir(), ".hermes")` no macOS. Ver `defaultHermesHome()` em `src/lib/discovery.ts`.
Parser da linha: `partition("=")`, remover `export ` inicial, aspas simples/duplas e `\r` final;
arquivo lido com `utf-8-sig` (01 §2.7).

**O que a regra "só sob ação do usuário" governa, exatamente.** A tabela acima mistura dois níveis
que a implementação sempre separou, e a confusão custou uma tela pior do que precisava ser. O que
está trancado é o SEGREDO; achar a porta é o que a extensão faz o tempo todo:

| Nível | O que é lido | Quando pode rodar |
|---|---|---|
| **Segredo** | a linha `API_SERVER_KEY=` de `<HERMES_HOME>\.env` | **Só** sob a ação explícita da §3.5. Nunca na inicialização, em background ou em `interval`. |
| **Presença** | a porta em `config.yaml`, `gateway.pid`, e `GET /health` | Quando um comando precisar falar com o Hermes — o que inclui abrir uma tela. `resolveBaseUrl()` já roda em toda requisição de todo comando; não há como um comando funcionar sem isso. |

Nada do nível "presença" devolve, guarda ou exibe conteúdo do `.env` além do número da porta
(`extractDotenvPort()` lê uma linha só, e `extractDotenvValue()` não é exportada).

### 3.2 Nunca em silêncio

Leitura silenciosa de arquivo do usuário é proibida, mesmo que "funcione melhor". A ação sempre:
1. é disparada por tecla ou clique do usuário;
2. mostra um Toast animado `Procurando a configuração do Hermes…`;
3. termina em uma tela que diz **o que foi lido e de onde**;
4. pode ser desfeita por `Esquecer a chave detectada`.

### 3.3 Ordem de resolução da chave (usada por todos os comandos)

```
1. preferência apiServerKey (se preenchida)          → usa
2. LocalStorage "hermes.detectedKey" (se existir)    → usa
3. nada                                              → renderiza SemConfiguracao (§3.4)
```

A preferência sempre vence: se o usuário digitou algo, é a intenção mais recente e explícita.

Se a chave resolvida devolver `401 gateway_auth_failed`: apagar automaticamente **só** a chave vinda
do LocalStorage (nunca a preferência), e cair na tela de erro E2 de §5.

### 3.4 Tela `SemConfiguracao` — o primeiro uso

Renderizada por **qualquer** comando quando não há chave. `Detail`, `navigationTitle` = título do
comando que o usuário abriu.

**Sondagem de presença (obrigatória).** Ao montar, a tela chama `resolveBaseUrl()` e mostra na
primeira linha o que encontrou. Isso é PRESENÇA, não segredo: lê `config.yaml`/`gateway.pid` para
achar a porta e chama `GET /health` — o mesmo que todo comando já faz em toda requisição (§3.1,
segunda tabela). A linha `API_SERVER_KEY=` do `.env` continua trancada atrás do Enter.

Sem isto o Enter era às cegas: com o Hermes desligado, o usuário só descobria depois da detecção
falhar — e a chave encontrada era descartada no caminho, porque §3.6 só grava depois de validar.

| Resultado | Primeira linha (literal) |
|---|---|
| sondando | `_Procurando o Hermes neste computador…_` |
| achou | `**Achei o Hermes <versão> aqui**, em <host>. Falta só a chave de acesso.` |
| outro servidor | `**Tem um programa respondendo nesse endereço, mas não é o Hermes.** Confira o endereço em "Abrir configurações" antes de continuar.` |
| nada respondeu | `**O Hermes não respondeu neste computador.** Ligue o Hermes antes de continuar: sem ele no ar a conexão não pode ser testada. Se o seu Hermes usa outro endereço, ajuste em "Abrir configurações".` |

`isLoading` fica ligado enquanto a sondagem corre. O corpo abaixo da linha é sempre o mesmo.

**Markdown literal:**

```markdown
# Conecte o Raycast ao seu Hermes

<primeira linha da tabela acima>

Para usar esta extensão, o Raycast precisa de uma chave de acesso do Hermes que está instalado neste computador. Isso é feito uma única vez.

**O jeito mais fácil:** pressione Enter em "Detectar configuração automaticamente". O Raycast procura a chave no seu Hermes, testa a conexão e guarda a chave em segurança. A chave não é exibida em nenhum momento.

Se preferir fazer manualmente, escolha "Configurar manualmente" no painel de ações.
```

`ActionPanel`:

| Ordem | Título | Atalho | Efeito |
|---|---|---|---|
| 1 | `Detectar configuração automaticamente` | `Enter` e `Ctrl+Shift+D` | §3.5 |
| 2 | `Configurar manualmente` | — (só pelo `Ctrl+K`) | `Action.Push` → §3.7. **Sem atalho:** `Ctrl+Shift+A` significa `Abrir configurações` em toda a extensão (§9.2) e um mesmo atalho não pode ter dois significados. |
| 3 | `O que é isso?` | `Ctrl+Shift+I` | `Action.Push` de um `Detail` com o texto de §3.9 |

### 3.5 Caminho automático — telas e textos

**Durante:** Toast `Toast.Style.Animated`, título `Procurando a configuração do Hermes…`.

**Sucesso — `Detail` (literal):**

```markdown
# Pronto, está conectado

Encontrei o Hermes deste computador e a conexão funcionou.

- Endereço: 127.0.0.1:8642
- Versão do Hermes: 0.20.4
- Chave de acesso: encontrada e guardada em segurança

A chave ficou guardada no armazenamento protegido do Raycast e não é exibida em nenhuma tela.

Suas conversas do Raycast vão aparecer também no Hermes Desktop.
```

Ações: `Continuar` (`Enter`, volta ao comando original e o executa),
`Testar de novo` (`Ctrl+Shift+T`), `Esquecer a chave detectada` (`Ctrl+D`, com `confirmAlert`).

**Falha A — arquivo não encontrado:**

```markdown
# Não encontrei o Hermes neste computador

Procurei em:

C:\Users\<usuario>\AppData\Local\hermes

e não achei o arquivo de configuração do Hermes.

Isso costuma acontecer quando o Hermes está instalado em outra pasta ou ainda não foi instalado.
```

Ações: `Configurar manualmente` (`Enter`), `Tentar de novo` (`Ctrl+R`),
`Abrir a pasta do Hermes` (`Ctrl+Shift+F`, só quando a pasta existir),
`Copiar detalhes técnicos` (`Ctrl+Alt+C`).

**Falha B — arquivo existe, chave ausente:**

```markdown
# Achei o Hermes, mas não achei a chave

O arquivo de configuração existe, mas não tem a linha da chave de acesso.

Arquivo: C:\Users\<usuario>\AppData\Local\hermes\.env
Linha procurada: uma linha que começa com API_SERVER_KEY=

Abra o Hermes Desktop uma vez e deixe o Hermes ligar. Ele cria essa chave sozinho na primeira execução.
```

Ações: `Tentar de novo` (`Ctrl+R`), `Configurar manualmente` (sem atalho dedicado),
`Abrir a pasta do Hermes` (`Ctrl+Shift+F`), `Copiar o caminho do arquivo` (`Alt+Shift+C`).

**Falha C — chave encontrada mas recusada (401):**

```markdown
# A chave encontrada não foi aceita

Encontrei uma chave no seu Hermes, mas o Hermes recusou essa chave.

Normalmente isso significa que o Hermes está rodando com uma configuração diferente da que está salva em disco. Feche e abra o Hermes Desktop e tente de novo.
```

Ações: `Tentar de novo` (`Ctrl+R`), `Configurar manualmente` (sem atalho dedicado),
`Copiar detalhes técnicos` (`Ctrl+Alt+C`).

**Falha D — Hermes desligado (`ECONNREFUSED`):** usar o texto de erro E1 de §5, com as ações
`Tentar de novo`, `Configurar manualmente`, `Copiar detalhes técnicos`.

### 3.6 O que a detecção nunca faz

- Não escreve na preferência (impossível pela API, D2) e não finge que escreveu.
- Não mostra a chave, nem `sk-…abcd`, nem "36 caracteres".
- Não sai copiando a chave para o clipboard "para o usuário colar" — isso vazaria o segredo para
  qualquer app que leia o clipboard.
- Não roda de novo sozinha se falhar. Falhou, esperou o usuário.

### 3.7 Caminho manual — sem terminal, passo a passo

`Detail` (`navigationTitle`: `Configurar manualmente`). **Literal — na variante Windows.** Os
nomes de programa e as teclas abaixo NÃO são literais fixos: eles saem de `platformCopy()`
(`src/lib/platform.ts`) e viram Finder, TextEdit e `Cmd+F`/`Cmd+C` no macOS. O que é literal é a
estrutura dos cinco passos e o resto das frases.

```markdown
# Configurar manualmente

Você vai copiar uma linha de um arquivo de texto. Não precisa de terminal.

**1. Abra a pasta do Hermes**

Use a ação "Abrir a pasta do Hermes" aqui embaixo. O Explorador de Arquivos abre em:

C:\Users\<usuario>\AppData\Local\hermes

**2. Abra o arquivo chamado `.env`**

Clique com o botão direito no arquivo `.env` e escolha "Abrir com" → "Bloco de Notas".
Se o arquivo não aparecer, no Explorador vá em "Exibir" e marque "Itens ocultos".

**3. Procure a linha que começa com `API_SERVER_KEY=`**

No Bloco de Notas, pressione Ctrl+F, digite `API_SERVER_KEY` e pressione Enter.
A linha se parece com isto:

API_SERVER_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

**4. Copie só o que vem depois do sinal de igual**

Selecione o texto depois do `=`, copie com Ctrl+C e feche o Bloco de Notas sem salvar.

**5. Cole nas configurações da extensão**

Use a ação "Abrir configurações" e cole no campo "Chave de acesso do Hermes".

Guarde essa chave como uma senha: quem tiver ela consegue conversar com o seu Hermes.
```

Ações: `Abrir a pasta do Hermes` (`Enter` e `Ctrl+Shift+F`),
`Abrir configurações` (`Ctrl+Shift+A`),
`Copiar o caminho do arquivo` (`Alt+Shift+C` — copia o caminho, **nunca** o conteúdo),
`Tentar detecção automática` (`Ctrl+Shift+D`), `Voltar` (`Esc`).

`Abrir a pasta do Hermes` abre a **pasta**, não o arquivo. Abrir o arquivo é escolha do usuário no
Explorador; a extensão não coloca o segredo na tela por conta própria.

### 3.8 Depois de configurar

Fluxo do brief, item por item:
1. Salvou → a extensão roda **um** teste de conexão (`/health` + `/v1/models`).
2. Passou → volta direto ao comando que o usuário tinha aberto (`pop()` até a raiz do comando e
   executa). HUD: `Conectado ao Hermes`.
3. Falhou → tela de erro correspondente de §5, sem repetir o teste sozinha.

### 3.9 Texto de `O que é isso?` (literal)

```markdown
# Por que uma chave?

O Hermes que roda no seu computador só aceita pedidos de programas que apresentem uma chave. Isso evita que qualquer site ou aplicativo aberto na sua máquina converse com o seu agente sem você saber.

A chave fica só no seu computador. Ela nunca é enviada para a internet por esta extensão, nunca aparece em telas, mensagens de erro ou registros, e você pode removê-la a qualquer momento em "Esquecer a chave detectada".
```

---

## 4. Vocabulário de estados

### 4.1 Mapeamento literal (1 para 1, sem invenção)

Fonte: 04 §2.3 e §2.4. Existem **exatamente sete** literais de `status` e sete rótulos. Nenhum
status mapeia para dois rótulos, e nenhum rótulo tem dois status.

| `status` do Hermes | Rótulo pt-BR | Ícone | Cor | Terminal? |
|---|---|---|---|---|
| `queued` | **Preparando** | `Icon.Clock` | `Color.SecondaryText` | não |
| `running` | **Executando** | `Icon.CircleProgress` | `Color.Blue` | não |
| `waiting_for_approval` | **Aguardando aprovação** | `Icon.Warning` | `Color.Orange` | não |
| `stopping` | **Interrompendo** | `Icon.Stop` | `Color.Yellow` | não |
| `completed` | **Concluído** | `Icon.CheckCircle` | `Color.Green` | sim |
| `cancelled` | **Cancelado** | `Icon.MinusCircle` | `Color.SecondaryText` | sim |
| `failed` | **Falhou** | `Icon.XMarkCircle` | `Color.Red` | sim |

Se algum nome de ícone não existir na versão instalada de `@raycast/api`, o substituto é
`Icon.Circle` — **a cor nunca muda**, porque é ela que carrega o significado à distância.

### 4.2 Implementação obrigatória

Um único módulo — **`src/lib/status.ts`**, especificado em `ARCHITECTURE.md` §3 — é a fonte dos
rótulos. Nomes normativos (use exatamente estes; não crie `run-state.ts` nem `estadoDe`):

```ts
RUN_STATUS_LABEL: Record<RunStatus, string>   // os 7 rótulos
runStatusLabel(status: string | undefined): string   // tolerante: "Desconhecido" no fallback
isTerminalRunStatus(status: string | undefined): boolean
STREAM_PHASE_LABEL / StreamPhase                     // mesmo vocabulário para o stream de conversa
```

A dupla ícone+cor da tabela §4.1 mora junto, como `RUN_STATUS_APPEARANCE: Record<RunStatus, {icon, color}>`
(é a única parte de `status.ts` que importa `@raycast/api`; se isso incomodar o teste unitário,
mova só ela para `src/lib/status-ui.ts`).
**Nenhum componente pode montar rótulo de estado por conta própria**, nem traduzir status inline, nem
usar sinônimos ("Rodando", "Em execução", "Finalizado", "Erro", "Abortado" são proibidos).

### 4.3 As duas exceções que não são estados

1. **`Execução expirada`** — `GET /v1/runs/{id}` devolveu `404 run_not_found`. Significa que o
   gateway reiniciou ou que passou o TTL de 1 hora (04 §7.1). É uma **condição de item de lista**,
   não um estado de execução. Ícone `Icon.QuestionMarkCircle`, `Color.SecondaryText`. Texto de
   detalhe: `O Hermes não tem mais informação sobre esta tarefa. Ela pode ter terminado normalmente.`
   Proibido mapear para `Falhou` ou `Cancelado`.
2. **`Sem conexão`** — condição do cliente, não do servidor. Só aparece no cabeçalho de erro de §5.

### 4.4 Regras finas do ciclo de vida (impactam a UI)

- **`waiting_for_approval` gruda.** Se a aprovação for respondida em outro lugar (Desktop, Telegram),
  `GET /v1/runs/{id}` continua dizendo `waiting_for_approval` até a run terminar (04 §2.4). Regra:
  **eventos do stream vencem o polling**; ao receber `approval.responded` ou qualquer `tool.*`
  depois de um `approval.request`, exibir **Executando** mesmo que o polling discorde.
- **`stopping` não é terminal.** Depois de `Parar`, continuar consultando até `cancelled` (ou
  `completed`, se a run terminou naturalmente na janela de corrida) (04 §6.4).
- **`"started"` do 202 não é estado.** Nunca entra no enum (04 §1.6).
- **Sem evento de parada.** `Parar` não gera evento SSE; o rótulo **Interrompendo** vem da nossa
  resposta 200 e do polling (04 §3.6.13).

---

## 5. Textos de erro

### 5.1 Regras

1. Uma frase em português explicando **o que aconteceu**, sem jargão.
2. Uma segunda frase, quando útil, dizendo **o que fazer**.
3. Ações concretas, nesta ordem quando existirem: `Tentar novamente`, `Abrir configurações`,
   `Copiar detalhes técnicos`.
4. **Detalhes técnicos ocultos por padrão.** Só aparecem com `Mostrar detalhes técnicos`
   (`Ctrl+Shift+I`) e sempre em bloco de código.
5. **Antes de exibir ou copiar**, todo detalhe técnico passa por `redigirSegredos(texto)`, que troca
   qualquer ocorrência da chave (das duas fontes de §3.3) por `[chave omitida]`. Se a chave não
   estiver carregada, o filtro ainda roda — a função nunca é pulada.
6. `error.code` e `error.type` decidem qual texto usar. **Nunca** casar por `error.message`: a
   mensagem passa por redação no servidor e pode mudar (01 §1.4).

Formato do bloco de detalhes (literal):

````markdown
### Detalhes técnicos

```
Endereço: http://127.0.0.1:8642/v1/runs
Resposta: 429
Código: rate_limit_exceeded
Momento: 19/08/2026 14:32:07
```
````

### 5.2 Catálogo

Coluna "Ações" usa as abreviações: **T** = `Tentar novamente`, **C** = `Abrir configurações`,
**D** = `Copiar detalhes técnicos`, e as extras vêm nomeadas.

| Id | Gatilho técnico | Frase literal em pt-BR | Ações |
|---|---|---|---|
| E1 | `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `AbortError` de timeout na descoberta | `Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo e se a URL e a chave estão corretas.` | T, C, D, `Abrir o Hermes Desktop` |
| E2 | `401` com `code: "gateway_auth_failed"` | `O Hermes não aceitou a chave de acesso. Ela pode ter mudado desde a última vez.` | `Detectar configuração automaticamente`, C, T, D |
| E3 | `/health` respondeu, mas `platform !== "hermes-agent"` | `Encontrei um programa nesse endereço, mas não é o Hermes API Server. Confira o endereço nas configurações.` | C, T, D |
| E4 | Nenhuma chave configurada | *(não é erro: renderiza a tela `SemConfiguracao` de §3.4)* | — |
| E5 | `403` com corpo vazio | `Não foi possível falar com o Hermes por causa de uma restrição de segurança do servidor.` | T, D — e registrar como bug: significa que enviamos header `Origin` (01 §5.2), o que é proibido |
| E6 | `403` com mensagem `... requires API key authentication` | `O Hermes está rodando sem chave de acesso configurada e não aceita este tipo de pedido.` | C, D |
| E7 | `404` `session_not_found` | `Esta conversa não existe mais no Hermes. Ela pode ter sido apagada no Hermes Desktop.` | `Voltar para a lista`, `Atualizar lista`, D |
| E8 | `404` `run_not_found` em uma run que acreditávamos viva | `O Hermes não tem mais informação sobre esta tarefa. Ela pode ter terminado normalmente, ou o Hermes foi reiniciado.` | `Ver conversa`, `Remover da lista`, D |
| E9 | `404` `run_not_found` ao abrir o stream de eventos | `Perdi o acompanhamento ao vivo desta tarefa, mas ela continua rodando no Hermes.` | `Acompanhar mesmo assim`, D |
| E10 | `409` `session_exists` | `Já existe uma conversa com esse identificador. Vou criar outra.` *(automático, apenas Toast informativo)* | — |
| E11 | `400` `invalid_title` | `Já existe uma conversa com esse título. Escolha outro nome.` | `Renomear`, D |
| E12 | `409` `approval_not_active` ou `approval_not_pending` | `Esse pedido de aprovação já foi respondido, talvez em outro aplicativo.` | `Atualizar`, `Voltar`, D |
| E13 | `409` `run_not_accepting_steer` / `steer_not_accepted` | `Não dá para orientar esta tarefa agora. Isso só funciona enquanto ela está executando.` | `Atualizar`, D |
| E14 | `400` `invalid_steer_input` | `Escreva a orientação antes de enviar.` | *(erro de campo no formulário)* |
| E15 | `413` `body_too_large` | `Seu texto é grande demais para o Hermes processar de uma vez. Tente dividir em partes menores.` | `Voltar e editar`, D |
| E16 | `429` `rate_limit_exceeded` | `O Hermes está com tarefas demais ao mesmo tempo. Espere alguns segundos e tente de novo.` | T (com espera automática de 2 s), D |
| E17 | `503` `gateway_draining` | `O Hermes está terminando o que já estava fazendo e não aceita novos pedidos agora. Tente de novo em instantes.` | T, D |
| E18 | `503` `session_db_unavailable` | `O Hermes não conseguiu abrir o banco de conversas. Reinicie o Hermes Desktop e tente de novo.` | T, D |
| E19 | `501` `Cron module not available` | `As automações não estão disponíveis neste Hermes.` | `Voltar`, D |
| E20 | `500` / `502` `agent_incomplete` | `O Hermes começou a tarefa mas não conseguiu terminar. Tente pedir de novo, se possível com mais detalhes.` | T, D |
| E21 | Evento `run.failed` no stream | `O Hermes não conseguiu concluir: <error do evento, já redigido pelo servidor>` | T, `Ver etapas`, D |
| E22 | Resposta do agente começa com `⚠️ Provider authentication failed` | `O modelo escolhido não está autenticado no Hermes. Abra o Hermes Desktop e configure o provedor, ou escolha outro modelo.` | `Escolher outro modelo`, `Abrir o Hermes Desktop`, D |
| E23 | Conexão caiu durante o streaming | `A conexão com o Hermes caiu no meio da resposta. A tarefa continua rodando no Hermes.` | `Acompanhar de novo`, `Ver em Execuções`, D |
| E24 | JSON inválido / resposta inesperada | `O Hermes respondeu de um jeito que a extensão não entendeu.` | T, D |
| E25 | Timeout da nossa requisição (sem resposta) | `O Hermes está demorando mais que o esperado para responder.` | T, `Parar`, D |
| E26 | Erro ao ler `.env` (permissão) | `Não consegui ler o arquivo de configuração do Hermes. Você pode configurar manualmente.` | `Configurar manualmente`, D |

### 5.3 Onde cada erro aparece

- Erro que **impede a tela inteira** (E1, E2, E3, E5, E6): substitui o conteúdo por `Detail` de erro
  (em `List`, por `List.EmptyView`).
- Erro em uma **ação pontual** (E10, E11, E12, E13, E16): `showToast` com
  `Toast.Style.Failure`, título = frase, e `primaryAction` = a primeira ação da tabela.
- Erro **durante o streaming** (E21, E23): o texto já recebido **fica na tela**; o bloco de erro é
  acrescentado abaixo, separado por `---`. Nunca apagar o que o usuário já leu.

---

## 6. A experiência de streaming

### 6.1 O que o usuário vê antes do primeiro pedaço de texto — por turno

O turno já está na lista (§2.1.2), com o rótulo `Preparando` no acessório e o ícone do estado. O
painel dele traz a sua mensagem e, no lugar da resposta:

```markdown
**Você**

<a sua mensagem>

---

_Preparando…_
```

`isLoading` do `List` fica ativo enquanto houver turno vivo (o Raycast desenha a barra de progresso
no topo). **Nunca uma tela em branco e nunca um spinner sem contexto.**

Se em **3 segundos** nada tiver chegado, `_Preparando…_` vira `_O Hermes está pensando…_`. É a única
mudança de texto automática; não há mensagens rotativas.

Isso **não é** o caminho de exceção: em conversa longa o primeiro pedaço de texto leva ~5,5 s, porque
o agente recarrega o passado do lado dele (D-11). Ver `_O Hermes está pensando…_` é normal.

### 6.2 Como o texto cresce — dentro do turno vivo

- Fonte: eventos `message.delta` do stream de `/v1/runs` — o único carregador de texto (04 §3.6.1).
- Concatenar `delta` na ordem de chegada, **no turno vivo**, nunca na tela como um todo: quem escreve
  é sempre o turno que `pickTurnToRun()` deixou passar, e os outros itens da lista não se mexem.
- Não há evento de "mensagem terminou": o texto final vem em `run.completed.output`; ao recebê-lo,
  **substituir** o buffer daquele turno pelo `output` (evita divergência).
- **Buffer de renderização de 80 ms**, por turno: acumular deltas e chamar `setState` no máximo ~12
  vezes por segundo (07 §12.2, gotcha 3). Cada re-render atravessa a ponte para o host WPF, e com
  `isShowingDetail` ligado ele repinta a `List` inteira. Não é otimização opcional: os deltas chegam
  em rajada — 22 no mesmo milissegundo, medidos (D-11) — e é para isso que o agrupamento existe.
- Parser SSE: **não implementar aqui**. Use `createSseParser()` / `readSseFrames()` de
  `src/lib/hermes-events.ts` (`ARCHITECTURE.md` §8.2) — um `split("\n\n")` quebra com CRLF partido
  entre chunks, com `data:` multilinha e com acentos cortados no meio (`TextDecoder` precisa de
  `{stream: true}`). Comentários (`: keepalive` a cada 30 s, `: stream closed` no fim) são frames de
  comentário, nunca eventos nem fim de stream.
- **Não existe timeout de inatividade do leitor.** O timeout cobre só o tempo até os *headers*
  (`STREAM_HEADERS_TIMEOUT_MS`); depois disso o corpo pode ficar minutos em silêncio enquanto uma
  ferramenta roda, e qualquer relógio de inatividade mataria streams saudáveis
  (`ARCHITECTURE.md` §7.1 e armadilha 32). O único cancelamento é o `AbortController`.
- `AbortController` no `useEffect` + flag de montagem, obrigatórios (o StrictMode do React 19 executa
  o efeito duas vezes em desenvolvimento e geraria duas streams intercaladas). **A desmontagem aborta
  só o leitor local** — nenhum caminho chama o endpoint de parar a run ao desmontar (D-02).
- Se `streamResponses` estiver desligado: nada é renderizado progressivamente; o turno fica em
  `Preparando`/`Executando` e o texto aparece de uma vez em `run.completed`.
- **Teto de renderização:** no máximo 40 turnos na tela e 6.000 caracteres por bloco de texto do
  painel (§2.1.3, §2.1.5).

### 6.3 As etapas (modo Etapas, `Ctrl+T`)

Por padrão o usuário vê **só a resposta**. O modo Etapas mostra, em ordem cronológica, uma linha por
evento, em linguagem simples — nunca o JSON:

| Evento | Linha exibida |
|---|---|
| `tool.started` | `🔧 Usando <tool> — <preview>` (se `preview` for nulo, só `🔧 Usando <tool>`) |
| `tool.completed` com `error: false` | `✅ <tool> concluído em 0,4 s` |
| `tool.completed` com `error: true` | `⚠️ <tool> falhou depois de 0,4 s` |
| `reasoning.available` | `💭 <text>` — recolhido: só as primeiras 100 letras, com `…` |
| `subagent.start` | `👥 Tarefa auxiliar iniciada: <goal>` |
| `subagent.complete` | `👥 Tarefa auxiliar concluída: <summary>` |
| `approval.request` | `🔐 O Hermes pediu sua aprovação` + ação para §7 |
| `approval.responded` | `🔐 Aprovação respondida: <Aprovado uma vez / Aprovado nesta execução / Aprovado sempre / Negado>` |
| `run.steered` | `🧭 Orientação enviada` |

Regras: `args` de ferramenta **não existem** neste stream (04 §3.6.2) — não inventar. Não existe
`tool.failed` aqui; falha é `tool.completed` com `error: true` (04 §3.6.3). Enquanto uma ferramenta
está em execução, o modo Resposta mostra **uma** linha discreta acima do texto
(`> 🔧 Usando <tool>…`), removida quando a ferramenta termina.

### 6.4 Ações — o `ActionPanel` da conversa

**As duas ordens anteriores desta seção foram substituídas** pelo desenho da conversa contínua (§6
dele), incluindo a numeração fixa de 9 ações do bloco "Depois (Concluído)", em que `Copiar resposta`
era a primária. O painel agora é **o mesmo em toda a tela**, com três seções, e muda só nos itens que
dependem do turno selecionado.

**A primeira ação é sempre `Enviar`, sem `shortcut`.** É isso que faz `Enter` enviar em qualquer
posição da lista, inclusive na conversa vazia (§2.1.4). Ela nunca sai do painel — nem com a barra
vazia, nem com um turno respondendo.

**Seção 1 — o turno selecionado.** Nesta ordem, cada linha aparecendo só quando a condição vale:

| Ordem | Título (literal) | Atalho | Condição |
|---|---|---|---|
| 1 | `Enviar` | `Enter` | **sempre** |
| 2 | `Responder pedido de aprovação` | — | turno vivo com aprovação pendente (§7) |
| 3 | `Acompanhar de novo` | `Ctrl+R` | turno vivo, não terminal, com o acompanhamento caído e reassinável (E23). Reassina o stream da **mesma** tarefa; nunca dispara outra execução |
| 4 | `Parar` | `Ctrl+Shift+P` | turno vivo, não terminal. `style: destructive`, sem `confirmAlert` (§6.6) |
| 5 | `Orientar execução` | `Ctrl+Shift+G` | turno vivo com o estado **exatamente** `Executando` (§6.7) |
| 6 | `Remover da fila` | `Ctrl+D` | turno na fila. Sem `confirmAlert`: nada é destruído no servidor |
| 7 | `Editar antes de enviar` | — | turno na fila. Devolve o texto para a barra e tira o turno da fila |
| 8 | `Copiar resposta` / `Copiar o que já veio` | `Ctrl+Shift+C` | há texto. O segundo literal quando o turno não concluiu. HUD `Resposta copiada` |
| 9 | `Colar no aplicativo ativo` | `Ctrl+Shift+V` | turno terminal com texto. `Action.Paste`; HUD `Resposta colada` |
| 10 | `Tentar novamente` | `Ctrl+R` | turno terminal que falhou, foi cancelado, expirou ou terminou vazio |
| 11 | `Ver etapas` / `Ver resposta` | `Ctrl+T` | há turno selecionado. Alterna o modo da tela inteira |

**Seção 2 — a conversa.** Sempre presente, igual em todos os itens:

| Ordem | Título (literal) | Atalho | Condição |
|---|---|---|---|
| 12 | `Escrever mensagem longa` | — | sempre (§2.1.1) |
| 13 | `Nova conversa` | `Ctrl+N` | sempre |
| 14 | `Carregar parte anterior da conversa` | `Ctrl+Shift+H` | há trocas mais antigas |
| 15 | `Abrir no Hermes Desktop` | `Ctrl+O` | o id da conversa é linkável (§8.4) |
| 16 | `Renomear conversa` | `Ctrl+E` | a conversa já nasceu |
| 17 | `Ramificar conversa` | `Ctrl+Shift+B` | a conversa já nasceu |
| 18 | `Ver mensagens e ferramentas` | `Ctrl+Shift+D` | a conversa já nasceu (§2.3) |

**Seção 3 — diagnóstico.** Sempre a última:

| Ordem | Título (literal) | Atalho |
|---|---|---|
| 19 | `Mostrar detalhes técnicos` / `Ocultar detalhes técnicos` | `Ctrl+Shift+I` |
| 20 | `Copiar detalhes técnicos` | `Ctrl+Alt+C` |
| 21 | `Ver tarefas em andamento` | `Ctrl+Shift+E` |
| 22 | `Abrir configurações` | `Ctrl+Shift+A` |

**Ações que deixaram de existir nesta tela:**

- `Continuar esta conversa` — continuar virou o `Enter`. O atalho `Ctrl+Shift+Return` fica **órfão
  aqui** e continua válido nas telas de fora (§9.2).
- `Executar esta tarefa novamente` — repete a tarefa atual no comando `Executar tarefa no Hermes`.
  Continua existindo só onde `Nova conversa` não existe (§2.5).

**Regra comum das telas externas:** `Continuar esta conversa` só aparece quando a execução
associada já é terminal (`Concluído`, `Cancelado`, `Falhou` ou `Execução expirada`). Durante
`Preparando`, `Executando`, `Aguardando aprovação` e `Interrompendo`, a conversa permanece
bloqueada para impedir duas execuções concorrentes no mesmo histórico.

### 6.5 Fechar a janela do Raycast no meio de um turno

Motor `/v1/runs`, decidido e verificado (§0.2). **A variante V-1b que existia aqui foi removida**: ela
só valeria se `Perguntar ao Hermes` migrasse para `chat/stream`, e D-01 fechou essa porta.

1. A tarefa **continua rodando no Hermes**. Fechar a janela nunca cancela nada. Só `Parar` cancela
   (04 §8.1). É o princípio 8 do brief, cumprido de verdade. **Nenhum caminho da extensão pode
   chamar o endpoint de parar a run na desmontagem** (D-02) — a desmontagem aborta só o leitor local.
2. O stream de eventos **é perdido para sempre** — não é retomável, e reconectar devolve 404
   (04 §3.3). Isso é limitação do servidor, não escolha de UI.
3. Por isso, todo evento recebido é gravado em `LocalStorage` **enquanto chega**, especialmente
   `approval.request` (04 §8.3). Ao reabrir, o turno é remontado com o histórico local.
4. Reabrindo a mesma execução: a extensão mostra o histórico local e passa a consultar
   `GET /v1/runs/{run_id}` a cada 2 s. Isso dá estado, `last_event`, e — quando terminar — `output`,
   `usage` e `error`. Não há reprodução dos deltas perdidos.
5. O aviso de remontagem é **por turno**, no painel do turno vivo e em nenhum outro, acima do corpo
   dele (§2.1.3). Literal, inalterado:
   `> Acompanhando esta tarefa em modo simples. O texto que passou enquanto o Raycast estava fechado não pode ser recuperado, mas o resultado final aparece aqui.`
6. **A fila local é persistida** por conversa (§2.1.5). Ao reabrir, turnos ainda não enviados
   reaparecem na conversa certa e só são descartados por ação explícita do usuário; o que já
   virou execução continua no Hermes.

**Como o usuário volta para a tarefa:**

- `Execuções do Hermes` (§2.5) lista tudo, com a seção `Em andamento` no topo.
- Dentro da conversa, `Ver tarefas em andamento` (`Ctrl+Shift+E`), na seção de diagnóstico do painel
  (§6.4). **O banner `Você tem N tarefas em andamento no Hermes.` saiu junto com o `Form`** que era a
  porta do comando; a ação sobreviveu, o banner não.
- **Pendente, não implementado:** o Toast `Sua tarefa terminou.` com `primaryAction` `Ver resultado`,
  na próxima abertura de qualquer comando depois de a tarefa terminar sem ninguém olhando. Continua
  desejável e continua sem código; não confundir com o que a tela já faz.

### 6.6 `Parar`

1. `POST /v1/runs/{run_id}/stop` (corpo ignorado pelo servidor — 04 §6.1).
2. `200` → estado vira **Interrompendo** na hora. Não há evento SSE de parada.
3. Continuar consultando `GET /v1/runs/{run_id}` até `cancelled` (ou `completed`, se venceu a corrida).
4. `404` → a run já tinha terminado: tratar como **Concluído**/**Cancelado** conforme o último
   estado conhecido, **nunca** como erro (04 §6.2).
5. Texto durante a espera, no topo do markdown:
   `> Pedido de parada enviado. O Hermes está encerrando com segurança — isso pode levar alguns segundos se ele estiver no meio de uma ferramenta.`
6. Sem `confirmAlert`: parar é reversível no sentido em que nada é destruído, e exigir confirmação
   atrasaria a única saída de emergência do usuário.

### 6.7 `Orientar execução` (steer)

`Action.Push` de um `Form` de um campo:
`Form.TextArea` `title="O que você quer ajustar"`,
`placeholder="Ex.: seja mais breve e foque no custo."`, `autoFocus`.
Envia `POST /v1/runs/{run_id}/steer {"input": texto}`.
Só está no painel quando o estado é exatamente `Executando` (04 §5.3).
Sucesso → HUD `Orientação enviada`; a linha `🧭 Orientação enviada` entra nas Etapas.
`409` → E13.
Se o `run.completed` trouxer `pending_steer`, exibir abaixo da resposta:
`> Sua orientação chegou depois que o Hermes terminou. Quer enviá-la como próxima pergunta?` com a
ação `Enviar como nova pergunta`.

---

## 7. Aprovações (superfície de segurança)

### 7.1 Princípios

- **Nunca aprovar automaticamente.** Nenhuma preferência, nenhum "lembrar minha escolha", nenhuma
  ação em lote a partir de uma lista. A decisão é sempre em tela cheia, com o comando visível.
- **Nunca inventar informação.** O evento traz `command`, `description`, `pattern_key`,
  `pattern_keys`, `allow_permanent`, `allow_session`, `smart_denied`, `request_id`, `choices`.
  **Não traz `tool_name` nem `args`** (D5). É proibido rotular a ação com um nome de ferramenta
  deduzido.
- **As opções vêm do servidor.** Renderizar exatamente o array `choices` do evento, nunca uma lista
  fixa (04 §4.2). Combinações possíveis: `["once","session","always","deny"]`,
  `["once","session","deny"]`, `["once","deny"]`.
- Toda solicitação de aprovação é, por definição, uma ação que passou por uma barreira de comando
  perigoso. Não existe aprovação "inofensiva" nesta tela.

### 7.2 Tela de aprovação — `Detail`

`navigationTitle`: `Aprovação necessária`.

**Markdown (literal, com os campos substituídos):**

````markdown
# O Hermes precisa da sua permissão

Ele quer executar este comando no seu computador:

```
<command>
```

**Por que estamos perguntando:** <description>

<bloco de risco, ver 7.3>

Se você não reconhece este comando ou não pediu nada parecido, escolha **Negar**.
````

`Detail.Metadata`:

```
Tarefa            <primeiros 60 caracteres do prompt>
Conversa          <título>
Estado            Aguardando aprovação
Tipo de bloqueio  <pattern_key>
Identificador     <request_id, primeiros 8 caracteres>
```

`pattern_key` aparece cru de propósito: é o único identificador confiável do tipo de bloqueio e
ajuda quem for pedir suporte. Fica na metadata, não no corpo, para não competir com o texto simples.

### 7.3 Marcação visual de risco

Bloco inserido no markdown, escolhido por `pattern_keys`:

- Se algum `pattern_key` estiver na lista de destrutivos conhecidos
  (`rm-rf`, `del`, `format`, `drop`, `truncate`, `shutdown`, `reg-delete`, `git-push-force`,
  ou qualquer chave contendo `delete`/`remove`/`destroy`/`force`):

```markdown
> ⛔ **Ação destrutiva.** Este comando pode apagar ou sobrescrever arquivos de forma definitiva. Só aprove se você entende exatamente o que ele faz.
```

- Caso contrário:

```markdown
> ⚠️ **Ação sensível.** Este comando pode alterar arquivos ou executar programas no seu computador.
```

- Se `smart_denied === true` (o servidor já havia negado e só oferece `once`/`deny`):

```markdown
> 🛑 **O Hermes recomendou negar esta ação.** Aprovar vale só para esta única vez.
```

Nas listas (`Execuções do Hermes`, Etapas), um item aguardando aprovação recebe
`accessory { tag: { value: "Aguardando aprovação", color: Color.Orange } }`, e quando o padrão é
destrutivo, `icon: { source: Icon.ExclamationMark, tintColor: Color.Red }`.

### 7.4 Ações e confirmações

| `choice` | Título literal | Atalho | `style` | Confirmação extra |
|---|---|---|---|---|
| `once` | `Aprovar só esta vez` | `Enter` | regular | não — esta tela **é** a confirmação |
| `session` | `Aprovar durante esta execução` | `Alt+Shift+E` | regular | `confirmAlert` |
| `always` | `Aprovar sempre este tipo de comando` | `Alt+Shift+S` | **destructive** | `confirmAlert` obrigatório |
| `deny` | `Negar` | `Ctrl+Shift+N` | regular | não |
| — | `Copiar comando` | `Ctrl+Shift+C` | regular | — |
| — | `Ver etapas da tarefa` | `Ctrl+T` | regular | — |

`confirmAlert` de `session` (literal):

```
title:   "Aprovar durante toda esta execução?"
message: "O Hermes vai poder repetir comandos parecidos até esta tarefa terminar, sem perguntar de novo."
primaryAction:  { title: "Aprovar durante esta execução", style: Alert.ActionStyle.Default }
dismissAction:  { title: "Cancelar", style: Alert.ActionStyle.Cancel }
```

`confirmAlert` de `always` (literal):

```
title:   "Aprovar sempre este tipo de comando?"
message: "Comandos parecidos com este passam a ser executados sem pedir sua permissão, agora e no futuro, em qualquer conversa. A regra vale para o padrão do comando, não só para este texto exato. Você pode desfazer isso no Hermes Desktop."
primaryAction:  { title: "Aprovar sempre", style: Alert.ActionStyle.Destructive }
dismissAction:  { title: "Cancelar", style: Alert.ActionStyle.Cancel }
rememberUserChoice: false
```

`rememberUserChoice` é **sempre** `false` em toda a extensão. Uma confirmação lembrada anularia a
própria confirmação.

### 7.5 Fila FIFO — o aviso obrigatório

A API **não aceita** `request_id` no corpo: ela resolve sempre o pedido **mais antigo** da fila
(04 §4.2). Consequências que a UI deve tratar:

- Se houver mais de um pedido pendente para a mesma run, exibir acima das ações:
  `> Existem <N> pedidos de aprovação nesta tarefa. Sua resposta vale para o mais antigo deles.`
- Nunca oferecer "aprovar todos" (`resolve_all`) no MVP: aprovar em lote coisas que o usuário não
  leu é exatamente o que a barreira existe para impedir.
- Após responder, `POST` retorna `{choice, resolved}`. Se `resolved > 1`, mostrar
  `Toast`: `<resolved> pedidos foram respondidos de uma vez.`

### 7.6 Aprovação sem detalhes (janela foi fechada)

Se `GET /v1/runs/{id}` disser `waiting_for_approval` e não houver `approval.request` no
`LocalStorage` (04 §8.3):

```markdown
# Aprovação pendente

O Hermes está esperando uma resposta sua para continuar, mas os detalhes do pedido se perderam quando o Raycast foi fechado.

Sem ver o comando, a escolha segura é negar. Você pode pedir a tarefa de novo e deixar o Raycast aberto para ver o pedido completo.
```

Ações: `Negar` (`Enter`, primeira ação — aqui o padrão seguro vira o padrão),
`Parar tarefa` (`Ctrl+Shift+P`), `Abrir no Hermes Desktop` (`Ctrl+O`). Como os detalhes
podem ter sido perdidos, esta tela não oferece aprovação às cegas; a decisão D-12 fecha
P4 pela postura estrita da armadilha 24 da `ARCHITECTURE.md`.

### 7.7 Tempo limite

O agente fica bloqueado esperando (padrão 300 s no servidor). Texto no rodapé da tela:
`O Hermes está parado esperando sua resposta. Se ninguém responder, ele desiste sozinho depois de alguns minutos.`
Não exibir contagem regressiva: o valor é configurável no servidor e um contador errado seria pior
que nenhum.

---

## 8. Sincronização com o Hermes Desktop

### 8.1 A promessa, dita ao usuário

A frase canônica, usada sem variação (§10.3):
`Suas conversas do Raycast também aparecem no Hermes Desktop.`

### 8.2 Onde essa promessa fica visível (descobribilidade)

1. **Tela de sucesso do primeiro uso** (§3.5) — última linha.
2. **`Verificar conexão`** (§2.7) — última linha do sucesso.
3. **Estado vazio de `Conversas do Hermes`** (§2.2.2) — na `description`.
4. **Metadata da resposta** (§2.1.3) — campo `Sincronização` com valor `Aparece no Hermes Desktop`.
5. **Toast após a primeira resposta de uma conversa nova**, uma vez por conversa:
   `title: "Esta conversa já está no Hermes Desktop"`,
   `primaryAction: { title: "Abrir no Hermes Desktop" }`.
   Só na primeira; repetir vira ruído.
6. **Accessory nos itens de lista** — `Criada no Raycast` / `Do Hermes Desktop` (§2.2).

Uma conversa **ramificada** (fork) é a única exceção visível: o filho é carimbado
`source: "api_server"` pelo servidor e `source` não é patchável (06 R7), então ele **não** aparece
em Recentes do Desktop. Ao ramificar, o Toast de sucesso (§10.4) ganha a segunda linha literal:
`Esta nova conversa não aparece na lista principal do Hermes Desktop.`

### 8.3 Latência — o que dizer e o que não dizer

Propagação típica de 1 a 3 segundos, pior caso ~12 s (06 §9.1). Não prometer "instantâneo" e não
mostrar número. Quando o usuário aciona `Abrir no Hermes Desktop` numa conversa criada há menos de
5 segundos, mostrar antes:
`showHUD("Abrindo no Hermes Desktop. Pode levar alguns segundos para a conversa aparecer lá.")`.

### 8.4 `Abrir no Hermes Desktop`

- Implementação: `Action.Open` com `target = "hermes://open/" + encodeURIComponent(sessionId)`
  (06 §8.3). Título literal: `Abrir no Hermes Desktop`. Atalho `Ctrl+O`. Ícone `Icon.Desktop`.
- **Onde aparece:** item de `Conversas do Hermes`; tela de detalhe da conversa; `Detail` da resposta
  (durante e depois); item de `Execuções do Hermes` que tenha conversa; tela de aprovação.
- **Onde NÃO aparece:** execuções sem conversa real; conversas ainda sem nenhuma mensagem.
- O Desktop pode não estar aberto. O `hermes://` é registrado pelo instalador; se nada acontecer, o
  usuário não recebe erro do sistema. Mitigação: mostrar sempre, junto, a ação secundária
  `Copiar identificador da conversa` (`Ctrl+Alt+C`), e no rodapé da tela de detalhe da conversa:
  `Se nada abrir, verifique se o Hermes Desktop está instalado e rodando.`

### 8.5 Cadência de atualização (primeiro plano)

Não existe canal de push do Hermes para um cliente HTTP externo (06 R6). Toda atualização é nossa.

| Superfície | Cadência | Regra de parada |
|---|---|---|
| `Conversas do Hermes` | revalidar ao abrir + a cada **4 s** | para ao empilhar outra tela ou ao fechar a janela |
| Detalhe da conversa | revalidar ao abrir + a cada **6 s** | idem |
| `Execuções do Hermes` | **2 s** enquanto houver run não terminal | para quando todas forem terminais |
| Execução aberta sem stream | **2 s** | para no estado terminal |
| Endpoint resolvido (`/health`) | `LocalStorage`, **12 h** + invalidação pelo pid do gateway | `invalidateBaseUrl()` em `ECONNREFUSED` |
| Primeira página de `/api/sessions` | `Cache` de **30 s**, só para pintura instantânea | sempre revalidar por cima |
| `/v1/capabilities` | `Cache` de **5 min** | invalidar ao mudar `apiUrl` |
| `/api/model/options` | `Cache` de **10 min** | invalidar em `Atualizar lista` |
| `/v1/skills` (fase 2) | `Cache` de **5 min** (o servidor já cacheia 30 s) | — |
| `/v1/toolsets` | `Cache` de **10 min**, carregado sob demanda | chamada lenta (02 §5.7) |

Os valores desta coluna são os de `CacheTtl` em `ARCHITECTURE.md` §9.2 — não duplicar constantes.

Todo polling usa `AbortController` e é cancelado no `useEffect` de limpeza. Nenhum polling roda em
`no-view` nem em background: a extensão não gasta bateria quando ninguém está olhando.

### 8.6 Conflito de escrita

Duas superfícies escrevem nas mesmas linhas e não existe trava entre elas (06 R9). Regra de UI:
antes de continuar uma conversa cujo `last_active` seja mais recente que 30 segundos **e** que não
tenha sido criada no Raycast, exibir uma vez:
`> Esta conversa foi usada há pouco no Hermes Desktop. Se ela estiver aberta lá, espere a resposta terminar antes de continuar por aqui.`
Não bloquear — apenas avisar.

### 8.7 Higiene de dados

- Guardar em `LocalStorage`, e só: registros de execução (§0.2), a última conversa usada, o modelo padrão da extensão e o modelo do próximo envio,
  `approval.request` pendentes e a chave detectada, quando o usuário aciona a detecção aprovada
  em D-08.
  As chaves literais estão em `StorageKeys` (`ARCHITECTURE.md` §9.2); não inventar outras.
- **Não** cachear transcrições completas por padrão (regra de segurança do brief). A única exceção é
  o resultado final de um run iniciado aqui (`output`/`error` truncados), porque o servidor descarta
  o status terminal em 1 h — poda em 24 h.
- Limpeza: **máximo de 20 registros terminais**, poda dos terminais com mais de 7 dias na abertura
  de `Execuções do Hermes`; runs não terminais nunca são expulsas por limite (`ARCHITECTURE.md`
  §9.1/§9.2).

---

## 9. Mapa de teclado

### 9.1 Regras

- **Nunca usar `cmd` no bloco Windows.** Lá um atalho com `cmd` é silenciosamente ignorado
  (07 §8.1). Modificadores válidos no Windows: `ctrl`, `shift`, `alt`, `windows` — só usamos os
  três primeiros. O bloco macOS, declarado junto pela forma `{ Windows, macOS }` da API, usa
  `cmd`, `opt`, `ctrl` e `shift`.
- Preferir `Keyboard.Shortcut.Common.*` quando existir equivalente semântico — o Raycast já traduz
  para Windows (07 §8.4).
- Reservados pelo Raycast e proibidos para nós: `Enter` (ação primária), `Ctrl+K` (painel de ações),
  `Esc` (voltar), setas e `Tab` (navegação).
- **Nenhuma ação órfã:** toda ação está no `ActionPanel`, alcançável por `Ctrl+K` + setas + `Enter`.
  Atalho é aceleração, nunca a única porta.
- Um mesmo significado tem sempre o mesmo atalho em todos os comandos.

### 9.2 Tabela global

A fonte da verdade em código é `src/components/shortcuts.ts`: nenhuma tela redigita um
`{ modifiers, key }`, todas importam de lá. A coluna `Onde` diz **conversa** para a tela de §2.1.

| Atalho | `Keyboard.Shortcut` | Ação | Onde |
|---|---|---|---|
| `Enter` | — | Ação primária da tela (na conversa: `Enviar`) | todas |
| `Ctrl+Enter` | — | Primária de um `Form` (`Perguntar ao Hermes`, `Enviar orientação`) | formulários |
| `Ctrl+Shift+C` | `Common.Copy` | `Copiar resposta` / `Copiar o que já veio` / `Copiar comando` / `Copiar mensagem` | conversa, aprovação, conversas, detalhe |
| `Ctrl+Shift+V` | `{ ["ctrl","shift"], "v" }` | `Colar no aplicativo ativo` | conversa |
| `Ctrl+Shift+Return` | `{ ["ctrl","shift"], "return" }` | `Continuar esta conversa` | conversas, detalhe, execuções, somente quando a execução não está ativa |
| `Ctrl+N` | `Common.New` | `Nova conversa` / `Executar esta tarefa novamente` | conversa, conversas, execuções |
| `Ctrl+O` | `Common.Open` | `Abrir no Hermes Desktop` | conversa, conversas, detalhe, execuções, aprovação |
| `Ctrl+Shift+P` | `{ ["ctrl","shift"], "p" }` | `Parar` | conversa, execuções |
| `Ctrl+Shift+G` | `{ ["ctrl","shift"], "g" }` | `Orientar execução` | conversa, execuções |
| `Ctrl+T` | `{ ["ctrl"], "t" }` | `Ver etapas` / `Ver resposta` | conversa, aprovação, execuções |
| `Ctrl+Shift+I` | `{ ["ctrl","shift"], "i" }` | `Mostrar detalhes técnicos` / `Ocultar detalhes técnicos` | conversa, erros, conexão |
| `Ctrl+Alt+C` | `{ ["ctrl","alt"], "c" }` | `Copiar detalhes técnicos` / `Copiar conversa inteira` | conversa, erros, detalhe |
| `Ctrl+R` | `Common.Refresh` | `Atualizar` / `Tentar novamente` / `Acompanhar de novo` | conversa, listas, erros |
| `Ctrl+Shift+A` | `{ ["ctrl","shift"], "a" }` | `Abrir configurações` | todas |
| `Ctrl+Shift+T` | `{ ["ctrl","shift"], "t" }` | `Testar conexão` | conexão, configurar |
| `Ctrl+Shift+D` | `{ ["ctrl","shift"], "d" }` | **Dois significados, nunca no mesmo painel:** `Detectar configuração automaticamente` / `Ver mensagens e ferramentas` | configurar, conexão, erro E2 / conversa, conversas |
| `Ctrl+Shift+H` | `{ ["ctrl","shift"], "h" }` | `Carregar parte anterior da conversa` | conversa, detalhe |
| `Ctrl+Shift+F` | `{ ["ctrl","shift"], "f" }` | `Abrir a pasta do Hermes` | configurar |
| `Alt+Shift+C` | `Common.CopyPath` | `Copiar o caminho do arquivo` | configurar |
| `Ctrl+E` | `Common.Edit` | `Renomear conversa` | conversa, conversas, detalhe |
| `Ctrl+.` | `Common.Pin` | `Fixar` / `Desafixar conversa` | conversas |
| `Alt+A` | `{ ["alt"], "a" }` | `Arquivar` / `Desarquivar conversa` | conversas |
| `Ctrl+D` | `Common.Remove` | `Excluir conversa` / `Remover da lista` / `Remover da fila` / `Esquecer a chave detectada` | conversa, conversas, execuções, configurar |
| `Ctrl+Shift+B` | `{ ["ctrl","shift"], "b" }` | `Ramificar conversa` | conversa, conversas |
| `Ctrl+Shift+M` | `{ ["ctrl","shift"], "m" }` | `Usar só na próxima pergunta` | modelos |
| `Ctrl+Shift+E` | `{ ["ctrl","shift"], "e" }` | `Ver tarefas em andamento` | conversa, run-task |
| `Ctrl+Shift+N` | `{ ["ctrl","shift"], "n" }` | `Negar` | aprovação |
| `Alt+Shift+E` | `{ ["alt","shift"], "e" }` | `Aprovar durante esta execução` | aprovação |
| `Alt+Shift+S` | `{ ["alt","shift"], "s" }` | `Aprovar sempre este tipo de comando` | aprovação |

**Ações sem atalho, só no painel** (`Ctrl+K`): `Enviar` (é o `Enter`), `Escrever mensagem longa`,
`Editar antes de enviar`, `Responder pedido de aprovação`, `Copiar identificador da conversa`.
Nenhuma delas é órfã — a regra de §9.1 é sobre o painel, não sobre a tecla.

**`Ctrl+Shift+Return` é órfão dentro da conversa.** A ação que ele acelerava —
`Continuar esta conversa` — deixou de existir ali, porque continuar a conversa passou a ser o `Enter`.
Ele **não** foi reciclado para outro significado: um mesmo atalho com dois donos em telas que se
alcançam seria exatamente o que §9.1 proíbe. Nas telas de fora (§2.2, §2.3, §2.5) ele continua sendo
`Continuar esta conversa`.

**`Ctrl+Shift+X` deixou de ser reservado.** Ele existia para `Executar como tarefa em segundo plano`
da variante V-1b, que saiu de §6.5 quando o motor foi decidido (§0.2).

### 9.3 Conflitos evitados e por quê

- `Common.Duplicate` no Windows é `Ctrl+Shift+S`; não usamos `Duplicate` em lugar nenhum, então
  `Alt+Shift+S` para "aprovar sempre" não colide.
- **`Ctrl+Shift+D` tem dois significados, e isso é deliberado.** `Detectar configuração
  automaticamente` só existe na tela de primeiro uso, na tela de conexão e no erro E2 em tela cheia —
  três telas que não têm conversa, e portanto não têm mensagens para ver. `Ver mensagens e
  ferramentas` só existe onde há uma conversa. **Regra dura: as duas ações nunca podem aparecer no
  mesmo `ActionPanel`.** É a mesma tolerância que §9.2 já dava a `Ctrl+Alt+C`, servindo a
  `Copiar detalhes técnicos` e a `Copiar conversa inteira`. `Common.RemoveAll` (`Ctrl+Shift+D`) não é
  usado, então não há um terceiro dono.
- `Common.CopyName` (`Ctrl+Alt+C`) não é usado com esse significado; o atalho serve a "copiar
  detalhes técnicos", que nunca aparece na mesma tela que uma ação "copiar nome".
- `Ctrl+,` e `Ctrl+K` não são usados: pertencem ao Raycast.

### 9.4 Operabilidade total por teclado — checklist de aceite

- [ ] Abrir cada comando, chegar ao resultado e voltar usando só o teclado.
- [ ] Em cada tela, `Ctrl+K` lista **todas** as ações disponíveis naquele contexto.
- [ ] Nenhuma ação existe apenas como atalho sem entrada no `ActionPanel`.
- [ ] Formulários: `Tab` percorre os campos na ordem visual; `Enter` envia; `Esc` volta.
- [ ] Alerta de confirmação: `Enter` aciona a ação primária, `Esc` cancela.
- [ ] Toast com ação: o atalho declarado no `primaryAction` funciona sem tirar o foco da lista.

---

## 10. Guia de escrita

### 10.1 Tom

- Segunda pessoa direta ("você"), verbos no presente, frases curtas.
- Sem "Ops!", sem "Oops", sem emoji em título de tela, sem exclamações. Emoji só nas linhas de
  Etapas (§6.3) e nos blocos de risco (§7.3), onde são semáforo, não decoração.
- Erro descreve o fato e o próximo passo. Nunca culpa o usuário, nunca pede desculpas duas vezes.
- Nunca dizer "API", "endpoint", "token", "payload", "SSE", "JSON", "stream", "run", "session" em
  texto visível. Esses termos só existem nos detalhes técnicos ocultos.
- Números com vírgula decimal (`0,4 s`). Datas por extenso curto (`12 de agosto`).
- Ações são verbos no infinitivo (`Copiar resposta`, `Abrir configurações`), nunca substantivos.
- Títulos de tela em frase, com maiúscula só na primeira palavra e nos nomes próprios
  (`Aprovação necessária`, `Conecte o Raycast ao seu Hermes`).

### 10.2 Glossário — o termo fixo de cada conceito

| Conceito interno | Termo em pt-BR na interface | Nunca usar |
|---|---|---|
| session | **conversa** | sessão, chat, thread, histórico |
| run (curto, disparado por Perguntar) | **resposta** (o resultado) / **tarefa** (o trabalho) | run, execução, job |
| run (longo, disparado por Executar tarefa) | **tarefa** | run, job, processo |
| lista de runs | **execuções** *(só o título do comando `Execuções do Hermes`)* | runs, jobs |
| run_id | **identificador da tarefa** *(só em detalhes técnicos)* | run id, ID |
| skill | **skill** *(mantido; é o nome que o usuário vê no Hermes Desktop)* | habilidade, competência |
| toolset | **ferramentas** (grupo: **grupo de ferramentas**) | toolset, kit |
| tool | **ferramenta** | tool, função |
| job / cron | **automação** | job, cron, agendamento |
| provider | **provedor** | provider, fornecedor |
| model | **modelo** | model, LLM, IA |
| streaming | **enquanto é escrita** / **na hora** | streaming, stream |
| approval | **aprovação** / **permissão** | approval, autorização |
| steer | **orientar** | steer, direcionar, guiar |
| stop | **parar** | cancelar, abortar, interromper |
| fork | **ramificar** | fork, bifurcar, duplicar |
| API key | **chave de acesso** | token, API key, senha |
| API Server | **Hermes** *(para o usuário, o Hermes é um só)* | API server, gateway, backend |
| Hermes Desktop | **Hermes Desktop** *(sempre com as duas palavras)* | Desktop, app |
| pinned | **fixada** | pin, favorita |
| archived | **arquivada** | oculta, removida |
| turn (uma troca: sua mensagem + a resposta) | **mensagem** (a sua) / **resposta** (a dele). A troca inteira **não tem nome próprio em tela** | turno, troca, item, par |
| queue (a fila local de §2.1.5) | **fila** (só em `Remover da fila`) / **esperando** no texto corrido | queue, buffer, pilha |

**Nota sobre "parar" e "cancelar":** `Parar` é a ação; **Cancelado** é o estado resultante. São
palavras diferentes de propósito e não devem ser trocadas.

### 10.3 Frases canônicas (usar sem variação)

```
Suas conversas do Raycast também aparecem no Hermes Desktop.
Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo e se a URL e a chave estão corretas.
A tarefa continua rodando no Hermes mesmo se você fechar o Raycast.
A chave não é exibida em nenhum momento.
Tentar novamente
Abrir configurações
Copiar detalhes técnicos
Abrir no Hermes Desktop
Continuar esta conversa
Nova conversa
Sem título
```

`Não foi possível conectar ao Hermes...` é a frase exigida pelo brief e é usada literalmente em E1,
inclusive na quebra de linha entre as duas sentenças quando renderizada em Markdown.

### 10.4 Mensagens de sucesso (HUD e Toast)

| Situação | Texto literal | Componente |
|---|---|---|
| Copiou resposta | `Resposta copiada` | HUD |
| Colou resposta | `Resposta colada` | HUD |
| Conectou pela primeira vez | `Conectado ao Hermes` | HUD |
| Renomeou | `Conversa renomeada` | Toast Success |
| Fixou | `Conversa fixada` | Toast Success |
| Arquivou | `Conversa arquivada` | Toast Success |
| Excluiu | `Conversa excluída` | Toast Success |
| Ramificou | `Nova conversa criada a partir desta` | Toast Success com `primaryAction: "Abrir a nova conversa"` |
| Parou | `Parando a tarefa…` | Toast Animated, vira `Tarefa parada` |
| Orientou | `Orientação enviada` | HUD |
| Aprovou uma vez | `Aprovado. O Hermes vai continuar.` | Toast Success |
| Negou | `Negado. O Hermes vai seguir sem essa ação.` | Toast Success |
| Modelo padrão | `Modelo padrão da extensão atualizado.` | Toast Success |
| Esqueceu a chave | `Chave removida deste computador.` | Toast Success |

### 10.5 Textos que precisam de revisão humana antes do release

Marcados aqui porque decidem confiança: §3.4, §3.5, §3.7, §3.9, §5.2 (E1, E2, E22), §7.2, §7.4, §7.6.

---

## 11. Definição de pronto por tela

Uma tela só está pronta quando:

- [ ] tem estado de carregamento, vazio, sucesso e erro, todos com texto em pt-BR desta spec;
- [ ] usa `runStatusLabel()` / `RUN_STATUS_APPEARANCE` de `src/lib/status.ts` para qualquer rótulo de
      estado — nunca string solta;
- [ ] é 100% operável por teclado e nenhuma ação está fora do `ActionPanel`;
- [ ] não exibe, não registra e não copia a chave de acesso, nem parcialmente;
- [ ] cancela streams e pollings no `useEffect` de limpeza, com `AbortController`;
- [ ] não usa `cmd` em nenhum atalho;
- [ ] toda operação destrutiva passa por `confirmAlert` com `rememberUserChoice: false`;
- [ ] nenhum termo do glossário aparece com sinônimo proibido;
- [ ] `npx ray lint` e `npx ray build` passam, e a tela foi exercitada contra o Hermes real.

## 12. Pendências marcadas para a implementação

`docs/DECISOES-VERIFICADAS.md` fica **acima** desta spec: o que estiver provado lá fecha a linha aqui.

| Id | Pendência | Situação |
|---|---|---|
| ~~V-1~~ | ~~`/v1/runs` com `session_id` persiste as mensagens na conversa?~~ | **RESOLVIDA** — sim, verificado ao vivo (D-01). Motor `/v1/runs` em todos os comandos; a variante V-1b saiu de §6.5 |
| ~~V-2~~ | ~~`hermes://open/<id>`~~ | **RESOLVIDA** — confirmada ao vivo nesta máquina |
| V-3 | Comportamento exato no fim do tempo limite de aprovação (§7.7) | Aberta. Só afeta a frase de rodapé, escrita para ser verdadeira nos dois casos |
| V-4 | Nomes de ícone (`Icon.CircleProgress`, `Icon.MinusCircle`, `Icon.Stop`) na versão instalada | Aberta. Fallback `Icon.Circle`, cor preservada (§4.1) |
| V-5 | O Raycast para Windows mantém um comando `view` vivo por quanto tempo após fechar a janela | Aberta. Afeta quantas vezes o usuário vê o aviso de §6.5 e por quanto tempo a fila local sobrevive (§2.1.5), não a correção |
| V-6 | O Toast `Sua tarefa terminou.` com `Ver resultado` (§6.5) | **Não implementado.** Desejável, sem código |

**Decisões humanas** — estão em `ARCHITECTURE.md` → "Decisões pendentes":

| Id | Assunto | Situação |
|---|---|---|
| ~~P1~~ | Ler `API_SERVER_KEY` do `.env` | **APROVADA** (D-08). §3.1/§3.5/§3.6 liberadas |
| ~~P2~~ | Motor de `Perguntar ao Hermes` | **FECHADA** por D-01: `/v1/runs` (§0.2, §6.5) |
| ~~P3~~ | Onde vive o modelo padrão | **FECHADA**: `LocalStorage`, chaves `nextTurnModel` e `defaultModel`, escritas por §2.6 e lidas a cada envio (§2.1.6) |
| ~~P4~~ | Permitir `Aprovar mesmo sem ver os detalhes` (§7.6) | **FECHADA — D-12: somente `Negar` quando os detalhes se perderem** |

**O que D-09, D-10 e D-11 fecham nesta spec:**

- **D-09** — o servidor aceita duas execuções na mesma conversa, e elas se atrapalham. Não há 409 e
  não há trava remota: a fila local de §2.1.5 é a única. A regra R9 é responsabilidade da extensão.
- **D-10** — a fila de aprovação é por **execução**, nunca por conversa (`approval_session_key =
  run_id`). A §7.5 vale dentro de um turno, e um turno não herda a fila de outro.
- **D-11** — o primeiro pedaço de texto leva ~5,5 s em conversa longa, e os deltas chegam em rajada.
  Isso torna `_O Hermes está pensando…_` o caminho normal (§6.1) e justifica o agrupamento de 80 ms
  (§6.2).
