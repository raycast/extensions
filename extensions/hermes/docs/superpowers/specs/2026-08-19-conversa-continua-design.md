# Conversa contínua — a tela principal vira uma conversa de verdade

**Data:** 2026-08-19
**Estado:** desenho aprovado e implementado; referências ao fluxo anterior são históricas
**Precedência:** este documento fica ABAIXO de `docs/DECISOES-VERIFICADAS.md` e ACIMA
de `docs/UX-SPEC.md` nas seções que ele declara substituir (§13).

O código atual usa `src/hooks/use-conversation.ts` e `src/components/conversation-view.tsx`.
Referências a `use-run-stream`, `AnswerView` e à pilha antiga abaixo descrevem o problema que
motivou este desenho e não são instruções para reintroduzir aquela arquitetura.

---

## 1. O problema

O pedido literal do usuário: *"dá trabalho continuar, é um pouco confuso o histórico
porque dentro do histórico tem as respostas, se funcionasse como uma conversa igual o
próprio Hermes seria mais interessante"*.

Duas queixas distintas, ambas verificadas no código:

**Continuar dá trabalho.** `Continuar esta conversa` existe (`src/ask.tsx:673-680`), mas
mora na SEGUNDA seção do `ActionPanel`, só aparece com a execução em estado terminal, e
empurra um `AskForm` novo — que por sua vez empurra outra `AnswerView`. Cada turno
adiciona duas telas à pilha, `ask.tsx` nunca chama `pop()` (só importa `push`,
`src/ask.tsx:172`), e cada `AnswerView` monta um `useRunStream` zerado. O turno anterior
some atrás.

**O detalhe da conversa confunde.** `src/session-detail.tsx:751-757` renderiza CADA
mensagem como uma linha própria: uma linha "Você", a linha seguinte "Hermes". Para ler a
resposta é preciso selecionar a linha dela e olhar o painel da direita. É um arquivo de
mensagens navegável, não uma conversa — e não tem onde escrever.

Isto é lacuna de produto, não defeito. Nada na UX-SPEC prevê vários turnos na mesma tela.

## 2. A referência: o que o HUD mode do Hermes realmente é

O usuário citou o "HUD mode" do Hermes como o modelo. Fomos ler o código-fonte
(`C:\Users\<usuario>\AppData\Local\hermes\hermes-agent`). A definição literal:

> "HUD mode — the chrome-free floating chat. A transparent, frameless, always-on-top
> window showing nothing but the REAL composer with the reply scrolling above it, so
> Hermes can be driven while the user works in another app."
> — `apps/desktop/src/store/hud.ts:1-13`

Quatro propriedades, com citação:

| Propriedade | Onde |
|---|---|
| Campo de escrita sempre presente, resposta rolando acima dele | `src/store/hud.ts:5-7` |
| Janela sem moldura, transparente, sempre no topo, fora do alt-tab, 620×320 | `electron/main.ts:11144-11146`, `:11347-11367` |
| Atalho global do sistema para abrir (`Ctrl+Shift+H`) e para grudar no cursor (`Ctrl+Shift+G`) | `src/lib/keybinds/actions.ts:135`, `electron/hud-snap-shortcut.ts:5-9` |
| Continua a MESMA conversa, com handoff de sessão ao entrar e ao sair | `src/app/hud/handoff.ts:3-13` |

E uma quinta, que decide o desenho: **no HUD a conversa é transitória.** A barra fica
sempre; a faixa com o transcrito sobe só enquanto há atividade recente (1100 ms de
espera), enquanto o campo tem foco, ou enquanto há pergunta pendente — depois some com
fade e a janela volta a deixar o clique passar (`src/app/hud/hud-shell.tsx:29`,
`:69`, `src/app/hud/click-through.ts:58`). O HUD é **campo-primeiro, conversa-depois**.

**O que isso significa para o Raycast.** Duas das quatro propriedades o Raycast já
entrega de fábrica: ele já é uma janela flutuante invocada por atalho global, e já fica
por cima do que você está fazendo. As outras duas — janela persistente e grudar no cursor
— são inalcançáveis: a API de janela disponível a extensões se resume a
`clearSearchBar`, `closeMainWindow` e `popToRoot`, e a Window Management API é
explicitamente indisponível no Windows (doc oficial, `docs/api-reference/window-management.md:11`).

Sobra exatamente o núcleo, que é o que falta na extensão: **o campo de escrita sempre
presente com a conversa acumulando na mesma superfície.**

## 3. Decisões tomadas com o usuário

| # | Decisão | Escolha |
|---|---|---|
| D-a | Escopo | A conversa substitui a tela de perguntar E a de abrir conversa pela lista |
| D-b | Ao abrir o comando | Cai na última conversa, com os turnos recentes carregados |
| D-c | Formato | Lista de turnos (padrão nativo do Raycast), não transcrição corrida |
| D-d | Enter durante a resposta | Entra na fila e dispara sozinho quando a atual terminar |
| D-e | `session-detail.tsx` | Mantida, fora do caminho, como ação secundária |

**Por que não a transcrição corrida (o formato mais fiel ao Hermes):** o Raycast não
expõe controle de rolagem. Num único item com a conversa inteira em markdown, a resposta
nova nasce abaixo da dobra e exige rolagem manual a cada turno; e a coluna da esquerda
fica com um terço da janela ocioso. É agradável no primeiro turno e insuportável no
décimo.

## 4. A tela

Nome do comando: **`Perguntar ao Hermes`** (inalterado — é o verbo pelo qual o usuário
já procura). Um comando, uma tela, sem empilhamento por turno.

### 4.1 Estrutura

Um `List` só, com `isShowingDetail` ligado assim que existir pelo menos um turno.

```
┌─ <título da conversa> ───────────────────────────────────┐
│ > Pergunte outra coisa…                     [ Conversa ▾ ]│
├────────────────────────┬─────────────────────────────────┤
│   e o 404?             │  **Você**                        │
│   por que trava?       │                                  │
│ ▸ e o timeout de 12 s? │  e o timeout de 12 s?            │
│                        │                                  │
│                        │  ---                             │
│                        │                                  │
│                        │  O tempo de espera vem do        │
│                        │  tratamento que roda junto…█     │
└────────────────────────┴─────────────────────────────────┘
```

- **`navigationTitle`**: o título da conversa; sem título, os 40 primeiros caracteres da
  primeira mensagem (mesma regra da §2.1.3 de hoje).
- **Barra de busca = campo de escrita.** `filtering={false}`, `searchText` controlado por
  estado, `onSearchTextChange`. Definir `onSearchTextChange` já desliga o filtro nativo
  implicitamente (`index.d.ts:7877-7882`), mas `filtering={false}` fica explícito porque
  os itens são turnos, não resultados de busca.
- **`searchBarPlaceholder`**: `"Pergunte alguma coisa…"` na conversa vazia,
  `"Pergunte outra coisa…"` quando já há turnos.
- **`searchBarAccessory`**: `List.Dropdown` chamado `Conversa`, com `Nova conversa`
  primeiro e as 5 conversas mais recentes em seguida — absorve o dropdown que hoje vive
  no `AskForm` (`src/ask.tsx:223-226`). Trocar de item ali troca a conversa da tela.
  **O texto que estiver na barra sobrevive à troca**: é o seu rascunho, não é da conversa.
  Já a fila local, se houver, é descartada com aviso — ela pertencia à conversa que saiu,
  e disparar mensagens dela na conversa nova seria mandar sua pergunta para o lugar
  errado. Havendo fila, a troca passa por `confirmAlert`.
- **Um item por turno**, em ordem cronológica, mais novo embaixo.

### 4.2 Anatomia de um turno

| Parte | Conteúdo |
|---|---|
| `id` | Turno vivo ou enfileirado: identificador gerado no cliente. Turno vindo do servidor: o `id` da mensagem que abriu a troca. Nunca reutilizado |
| `title` | O que você escreveu, truncado em 60 caracteres |
| `icon` | Ícone do estado, de `runStatusAppearance()` |
| `accessories` | Enquanto não terminal: o rótulo do estado. Terminal e bem-sucedido: a duração |
| `detail` | `**Você**\n\n{mensagem}\n\n---\n\n{resposta}` |

**Sobre os `accessories`:** a doc do Raycast recomenda não usar acessórios quando
`isShowingDetail` está ligado (`index.d.ts:6575-6580`). Divergimos de propósito, e a
divergência é pequena e justificada: sem acessório, a lista não diria qual turno está
respondendo e qual terminou — e é essa a informação que faz a conversa ser legível de
relance. É exatamente a mesma divergência que a extensão ChatGPT da loja adota. Se na
prática o acessório espremer o título a ponto de cortá-lo, o acessório cai antes do
título.

O painel do turno tem os dois modos que já existem, alternados por `Ctrl+T`:
`resposta` e `etapas`. No modo `etapas` o corpo é a lista de linhas com emoji que
`useRunStream` já monta (🔧 ✅ ⚠️ 💭 👥 🔐 🧭).

**Isto é o que conserta a confusão do detalhe da conversa:** uma linha nunca é meia
troca. A resposta jamais é irmã da pergunta na lista — ela é o corpo dela.

### 4.3 Metadados

O `List.Item.Detail.Metadata` do turno selecionado carrega os mesmos cinco campos da
§2.1.3, porque continuam verdadeiros por turno: `Estado`, `Conversa`, `Modelo`,
`Sincronização`, `Duração`.

### 4.4 Estado vazio

Sem nenhum turno, um `List.EmptyView`:

- título: `Comece a conversa`
- descrição: `Escreva sua pergunta na barra acima e pressione Enter.`
- ícone: o do comando

**Isto não é enfeite, é obrigatório.** O `actions` do próprio `List` só é exibido quando
a lista NÃO tem filhos (`node_modules/@raycast/api/types/index.d.ts:6531-6534`). Sem o
`EmptyView` carregando a ação de enviar, `Enter` não faria nada na conversa vazia.

Pela mesma razão: **a ação de enviar vai repetida no `ActionPanel` de cada item.**

### 4.5 Seleção

`selectedItemId` estaciona no turno recém-criado no momento do envio, e é liberado
(`undefined`) quando aquele turno chega a estado terminal — a partir daí as setas
navegam livres.

`onSelectionChange` **fica de fora**. Tem corrida conhecida; a extensão ChatGPT publicada
na loja o removeu com comentário no código apontando a issue raycast/extensions#10844,
mantendo só `selectedItemId`.

### 4.6 Teto e paginação

Duas grandezas diferentes, que não devem ser confundidas:

- **carregamento**: 120 mensagens por página do servidor (§8.4), que é o que
  `session-detail.tsx:519-527` já usa;
- **renderização**: no máximo 40 turnos na tela.

Como uma troca consome de duas a várias mensagens, uma página costuma render menos de 40
turnos — nesse caso todos aparecem e `hasOlder` diz se o servidor ainda tem mais. Quando o
pareamento render mais de 40, os mais antigos ficam retidos e `hasOlder` fica verdadeiro
sem nem precisar ir ao servidor.

Havendo mais, um item no topo:

- título: `Carregar parte anterior da conversa`
- subtítulo: `Traz as 40 trocas anteriores a estas.`

Atalho `Ctrl+Shift+H` — já reservado na tabela central (`src/components/shortcuts.ts:78`,
`SHORTCUTS.loadOlder`). Nenhum atalho novo é criado por este desenho.

## 5. O teclado

`Enter` envia. **Não por atalho**: a ação de enviar é a PRIMEIRA do `ActionPanel`, e o
Raycast liga a primária ao `Enter` automaticamente em `List` (`index.d.ts:144-147`).
Declarar `shortcut` nela seria errado — o atalho alternativo nem aparece no painel.

Mensagem longa, com quebra de linha, vai por ação secundária:

- `Escrever mensagem longa` empurra um `Form` com `Form.TextArea`, inicializado com o
  texto que já estiver na barra. Envia com `Ctrl+Enter` (a primária de um `Form` responde
  a `Ctrl+Enter`, não a `Enter`), e volta com `pop()`.

**Por que esse desvio existe:** o Raycast não expõe interceptação de tecla — não há
`onKeyDown` em lugar nenhum da API. E não existe afirmação oficial de que `Enter` quebra
linha dentro de um `Form.TextArea`; o manual só afirma que `Ctrl+Enter` submete. Aquela
pendência marcada UNVERIFIED em `docs/research/07-*.md:68-70` **continua sem resposta, e
este desenho deixou de depender dela** — o que é a razão de a barra de busca ser o campo
principal e o `Form` ser o desvio, e não o contrário.

Demais atalhos, todos vindos da tabela existente, nenhum inventado:

| Ação | Atalho | Origem |
|---|---|---|
| Enviar | `Enter` | primária, sem `shortcut` |
| Nova conversa | `Ctrl+N` | `SHORTCUTS.newConversation` |
| Ver etapas / Ver resposta | `Ctrl+T` | `SHORTCUTS.toggleSteps` |
| Parar | `Ctrl+Shift+P` | `SHORTCUTS.stop` |
| Orientar execução | `Ctrl+Shift+G` | `SHORTCUTS.steer` |
| Copiar resposta | `Ctrl+Shift+C` | `SHORTCUTS.copy` |
| Colar no aplicativo ativo | `Ctrl+Shift+V` | `SHORTCUTS.paste` |
| Abrir no Hermes Desktop | `Ctrl+O` | `SHORTCUTS.openInDesktop` |
| Renomear conversa | `Ctrl+E` | `SHORTCUTS.rename` |
| Ramificar conversa | `Ctrl+Shift+B` | `SHORTCUTS.branch` |
| Carregar parte anterior | `Ctrl+Shift+H` | `SHORTCUTS.loadOlder` |
| Remover da fila | o que `Common.Remove` mapear no Windows | `SHORTCUTS.remove` |
| Ver mensagens e ferramentas | `Ctrl+Shift+D` | **novo — ver §12** |
| Mostrar detalhes técnicos | `Ctrl+Shift+I` | `SHORTCUTS.showTechnical` |
| Abrir configurações | `Ctrl+Shift+A` | `SHORTCUTS.preferences` |

`Ctrl+Shift+Return` (`SHORTCUTS.continueConversation`) fica **órfão nesta tela** — a ação
que ele acelerava deixou de existir, porque continuar a conversa passou a ser o `Enter`.
Ele continua válido nas telas de fora (`sessions.tsx`, `session-detail.tsx`,
`run-progress.tsx`), que seguem chamando `launchCommand`.

## 6. Ordem do `ActionPanel`

A ordem é diferente conforme o turno selecionado esteja em execução ou terminal. A
primeira ação é **sempre** `Enviar` — é isso que faz `Enter` enviar em qualquer posição
da lista.

**Sempre, em primeiro lugar:**

1. `Enviar` — sem `shortcut`

`Enviar` fica no painel mesmo com a barra vazia, e nesse caso ela não envia nada: mostra
o aviso `Escreva sua pergunta.` — o mesmo literal que a §2.1.1 já usa na validação do
formulário. Isto é deliberado. O Raycast não tem ação desabilitada, e retirar `Enviar`
do painel com a barra vazia promoveria outra ação a primária: `Enter` numa barra vazia
passaria a copiar ou a trocar de modo, sem aviso. Uma ação que sempre significa a mesma
coisa vale mais que um painel enxuto.

**Turno selecionado em execução:**

2. `Responder pedido de aprovação` (só com aprovação pendente)
3. `Parar` — `Ctrl+Shift+P`
4. `Orientar execução` — `Ctrl+Shift+G`, só com o estado exatamente `Executando`
5. `Copiar o que já veio` — `Ctrl+Shift+C`
6. `Ver etapas` / `Ver resposta` — `Ctrl+T`

**Turno selecionado terminal:**

2. `Copiar resposta` (ou `Copiar o que já veio`, se não concluiu) — `Ctrl+Shift+C`
3. `Colar no aplicativo ativo` — `Ctrl+Shift+V`
4. `Tentar novamente` — só se falhou, foi cancelado, expirou, ou terminou vazio
5. `Ver etapas` / `Ver resposta` — `Ctrl+T`

**Turno selecionado na fila:**

2. `Remover da fila` — `SHORTCUTS.remove`, sem `confirmAlert`: nada é destruído no
   servidor e o texto volta disponível pela ação seguinte
3. `Editar antes de enviar` — devolve o texto para a barra e tira o turno da fila

**Seção da conversa (sempre):**

6. `Escrever mensagem longa`
7. `Nova conversa` — `Ctrl+N`
8. `Carregar parte anterior da conversa` — `Ctrl+Shift+H`, só quando há mais
9. `Abrir no Hermes Desktop` — `Ctrl+O`
10. `Renomear conversa` — `Ctrl+E`
11. `Ramificar conversa` — `Ctrl+Shift+B`
12. `Ver mensagens e ferramentas` — `Ctrl+Shift+D`

**Seção de diagnóstico (sempre, última):**

13. `Mostrar detalhes técnicos` — `Ctrl+Shift+I`
14. `Copiar detalhes técnicos` — `Ctrl+Alt+C`
15. `Ver tarefas em andamento` — `Ctrl+Shift+E`
16. `Abrir configurações` — `Ctrl+Shift+A`

Isto substitui as duas ordens da §6.4, incluindo a numeração fixa de 9 ações do bloco
"Depois (Concluído)", em que `Copiar resposta` era a primária.

## 7. A fila (D-d)

A regra R9 é dura: **no máximo um turno vivo por conversa.** Não há trava entre
superfícies e duas escritas concorrentes se intercalam no estado do Hermes
(`src/lib/hermes-api.ts:855-857`, `src/ask.tsx:670-672`). Enviar durante uma resposta,
portanto, não pode disparar uma segunda execução.

Comportamento:

- `Enter` durante uma resposta **enfileira**. A mensagem aparece imediatamente como um
  turno novo, no fim da lista, com o rótulo `Preparando`, e a barra é limpa.
- Quando o turno em curso chega a estado terminal, o primeiro da fila dispara sozinho.
- A fila é **local e volátil**: vive no estado do React, não no `LocalStorage`. Fechar a
  janela do Raycast descarta o que estava na fila e não descarta o que já virou execução.
  Isto é deliberado — enfileirar no disco criaria mensagens que disparam sem ninguém
  olhando, o que contraria o princípio de que o usuário sempre vê o que pediu.
- Turno enfileirado pode ser removido: ação `Remover da fila` no `ActionPanel` dele.
- Se o turno em curso **falhar ou for cancelado**, a fila NÃO dispara sozinha. Os turnos
  enfileirados ficam com o rótulo `Cancelado` e a linha
  `> Esta mensagem não chegou a ser enviada porque a resposta anterior não terminou.`,
  com `Tentar novamente` disponível. Disparar em cima de um erro repetiria o erro em
  silêncio.

`Orientar execução` continua explícita e separada (`Ctrl+Shift+G`): mandar orientação no
meio da tarefa é outra coisa e continua a ser outra ação.

## 8. Ao abrir o comando (D-b)

1. Guarda de configuração, como hoje: `isConfigured()` antes de qualquer requisição.
   Não configurado ⇒ `NotConfigured`.
2. Se o comando foi lançado com `launchContext.sessionId` (vindo de `Conversas`, do
   detalhe, ou do progresso de execução), essa é a conversa.
3. Senão, lê `StorageKeys.lastSessionId` — que já é gravado a cada turno
   (`src/hooks/use-run-stream.ts:340`).
4. Com uma conversa em mãos, carrega os turnos recentes por
   `getSessionMessages(sessionId, { order: "latest", limit: 120 })` e **adota o
   `session_id` da RESPOSTA**, que pode diferir do pedido (compressão), como
   `session-detail.tsx:519-527` já faz.
5. Sem conversa alguma, ou se o carregamento falhar, a tela abre vazia e pronta para
   escrever. **Falha ao carregar o passado nunca impede escrever o presente** — mostra o
   aviso `> Não foi possível carregar as mensagens anteriores desta conversa.` acima da
   lista e segue.
6. Se o argumento `pergunta` do comando vier preenchido, ele é enviado imediatamente como
   primeiro turno, sem passar por tela nenhuma — preserva o comportamento de hoje
   (`src/ask.tsx:818-825`).

**A conversa continua nascendo só no primeiro envio.** Nada de `POST /api/sessions` ao
abrir a tela: conversa vazia é proibida (`docs/UX-SPEC.md:65-67`, `:73`).

## 9. O motor

### 9.1 O que NÃO muda

Continua em `POST /v1/runs` + `GET /v1/runs/{id}/events`. **Não** migra para
`/api/sessions/{id}/chat/stream`, apesar de já estar implementado e não usado: abortar
aquele fetch interrompe o turno no servidor (`src/lib/hermes-api.ts:613-620`), e a D-02
exige que fechar a janela do Raycast deixe a tarefa viva. Migrar quebraria o princípio 8
do brief.

Continuam intactos e reaproveitados como estão:

- `consumeRunEventStream` — puro, recebe um `Response` e devolve resultado tipado
  (`src/lib/hermes-events.ts:490-496`);
- `createTextBuffer` — o agrupamento de 80 ms que evita um render por pedaço de texto;
- `startConversation` / `askInSession` / `steerRun` / `stopRun` / `respondToApproval` /
  `reconcileRun`;
- `ApprovalView` e `SteerForm` — componentes puros com callback, empurrados e voltando
  com `pop()` para a conversa que segue viva embaixo;
- `source: "desktop"` constante (D-01).

### 9.2 O que muda

`useRunStream` (775 linhas) tem **um único consumidor**: `src/ask.tsx:64`.
`run-task.tsx` roda por outro caminho (`RunProgressView`). Isso permite evoluí-lo sem
tocar em nenhuma outra tela.

O bloqueio estrutural a resolver: `startRef` (`src/hooks/use-run-stream.ts:630-631`)
garante que a execução nasça uma vez só por montagem, e trocar `request.prompt` reexecuta
o efeito mas reaproveita a mesma promessa. O único caminho que reseta `startRef` é
`retry()` — e ele **apaga texto e etapas** (`:739-756`). Ou seja: hoje não existe
"próximo turno", só "refazer este".

Três módulos novos, um que encolhe:

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `src/lib/turns.ts` | **Puro.** Parear mensagens em trocas; montar o markdown de um turno; decidir o próximo da fila | nada de React, nada de rede |
| `src/hooks/use-conversation.ts` | `turns[]`, `send`, `stop`, `steer`, `reattach`, `retry`, `approvalResolved`, `loadOlder`, `switchSession` | `turns.ts`, `hermes-api`, `hermes-events`, `storage` |
| `src/components/conversation-view.tsx` | O `List`, o `ActionPanel`, os textos literais | `use-conversation`, `status.ts`, `shortcuts.ts` |
| `src/ask.tsx` | Encolhe para a casca do comando: guarda de configuração, leitura do `launchContext`, escolha da conversa inicial | as três acima |

`useRunStream` é absorvido por `use-conversation.ts`. O `AnswerView` privado de
`ask.tsx:399` deixa de existir — o que **cancela o "Passo 0 obrigatório"** que o prompt de
continuidade da época registrava (extrair `AnswerView` para
`src/components/answer-view.tsx`). Os comandos da fase 2 que precisavam de
"prompt pronto → resposta escrevendo" passam a montar `ConversationView` com um turno
inicial já enviado. Este desenho **substitui** aquele passo; não convive com ele.

### 9.3 Contratos

```ts
// src/lib/turns.ts — puro, testável com node --test

export type TurnState =
  | { kind: "queued" }                       // na fila local, ainda não enviado
  | { kind: "live"; runId?: string; status: RunStatus }
  | { kind: "past" };                        // veio do servidor, nunca teve stream

export interface Turn {
  /** Identidade estável do item da lista. Nunca reutilizada. */
  id: string;
  /** O que o usuário escreveu. */
  message: string;
  /** O que o Hermes respondeu — acumulado enquanto escreve. */
  answer: string;
  steps: string[];
  state: TurnState;
  startedAt?: number;
  finishedAt?: number;
  error?: HermesError;
}

/** Pareia a resposta de GET /api/sessions/{id}/messages em trocas.
 *  Regra: cada mensagem `user` abre uma troca; tudo que vier depois
 *  (assistant, tool, system) pertence a ela até a próxima `user`.
 *  Mensagens antes da primeira `user` viram uma troca sem mensagem. */
export function pairMessagesIntoTurns(messages: SessionMessage[]): Turn[];

/** O markdown do painel de um turno, nos dois modos. */
export function turnMarkdown(turn: Turn, mode: "resposta" | "etapas"): string;

/** O próximo turno a disparar, ou undefined. Não dispara depois de erro. */
export function nextQueued(turns: Turn[]): Turn | undefined;
```

```ts
// src/hooks/use-conversation.ts

export interface ConversationController {
  turns: Turn[];
  sessionId?: string;
  sessionTitle?: string;
  isLoadingHistory: boolean;
  hasOlder: boolean;
  historyFailed: boolean;

  send(message: string): void;          // enfileira ou dispara
  dequeue(turnId: string): void;
  stop(): Promise<void>;
  steer(text: string): Promise<void>;
  reattach(): void;
  retry(turnId: string): void;
  approvalResolved(resolved: number): void;
  loadOlder(): Promise<void>;
  switchSession(sessionId: string | undefined): void;   // undefined ⇒ nova conversa
}
```

### 9.4 Custo de render

Cada `setState` atravessa a ponte até o host do Raycast. Com `isShowingDetail`, um turno
escrevendo re-renderiza a `List` inteira, não só um `Detail` — mais caro que hoje.

Mitigações, todas já existentes ou baratas:

- o agrupamento de 80 ms de `createTextBuffer` fica, sem alteração;
- só o markdown do turno **vivo** muda; os demais são referências estáveis;
- teto de 40 turnos renderizados (§4.6);
- teto de 6.000 caracteres por mensagem carregada do servidor, o mesmo que
  `session-detail.tsx:61` já aplica.

**Risco aceito e a medir:** não sabemos, sem rodar, se 40 itens com painel e um deles
escrevendo a ~12 atualizações por segundo mantém a interface fluida no Raycast Windows.
Se não mantiver, o teto de 40 cai antes de qualquer outra coisa ser mexida.

## 10. Erros

O catálogo E1..E26 e os textos literais da §5 continuam valendo, sem exceção. O que muda
é **onde** o erro aparece:

- **Erro de um turno** (a execução falhou, o acompanhamento caiu, a execução expirou):
  fica DENTRO do turno, no painel dele, com o texto que já tinha chegado preservado acima
  do bloco de erro. A conversa continua na tela e você pode mandar a próxima mensagem.
- **Erro que impede a tela inteira** (não configurado, chave recusada, Hermes desligado):
  toma a tela, como hoje, porque não há conversa nenhuma para preservar. E2 continua com
  `Detectar configuração automaticamente` como PRIMEIRA ação.
- **Falha ao carregar mensagens anteriores**: aviso acima da lista, nunca bloqueio (§8.5).

As duas condições que não são estado continuam distintas dos 7 rótulos:
`Execução expirada` e `Sem conexão`. Continua **proibido** mapeá-las para `Falhou` ou
`Cancelado`.

## 11. Linguagem

A §10.2 da UX-SPEC (`docs/UX-SPEC.md:1396`) **proíbe as palavras "chat", "thread" e
"histórico"** como termo de interface. O termo é **conversa**, e este desenho o respeita
em todo texto visível — inclusive nos nomes de ação e nos textos de estado.

Continuam proibidos em texto visível: "API", "endpoint", "token", "payload", "SSE",
"JSON", "stream", "run", "session" (`docs/UX-SPEC.md:1385-1386`). Emoji só nas linhas de
etapas e nos blocos de risco, nunca em título de tela. Ações são verbos no infinitivo.

Os 7 rótulos saem de `src/lib/status.ts` e nada mais: `Preparando`, `Executando`,
`Aguardando aprovação`, `Interrompendo`, `Concluído`, `Cancelado`, `Falhou`.

## 12. `session-detail.tsx` (D-e)

Fica. Sai do caminho. É a única superfície que pagina conversa longa, mostra mensagens de
ferramenta e oferece `Copiar conversa inteira` — apagar 872 linhas que cobrem um caso real
seria pior do que escondê-las.

Mudanças:

- `Conversas` (`src/sessions.tsx`) passa a abrir a **conversa**, não o detalhe. A ação
  primária de um item da lista vira `Continuar esta conversa`, que já existe ali
  (`src/sessions.tsx:447-452`) e já faz `launchCommand` com o contexto certo.
- O detalhe vira ação secundária, alcançável de dentro da conversa e da lista, com o nome
  do que ele de fato é: **`Ver mensagens e ferramentas`**.
- **Atalho novo:** `Ctrl+Shift+D`. Significado novo, atalho novo (§9.1 da UX-SPEC). É o
  ÚNICO atalho criado por este desenho; não colide com nada da tabela
  (`src/components/shortcuts.ts`) nem com o que o Raycast reserva. Entra em `SHORTCUTS`
  como `viewMessages`.

## 13. O que este documento substitui na UX-SPEC

A UX-SPEC segue o código aqui, porque a mudança é deliberada e acordada com o usuário.
Seções a reescrever, com o que cai:

| Seção | O que muda |
|---|---|
| §1.1 | O mapa de telas: perguntar e detalhe deixam de ser destinos separados |
| §2.1.1 | O `Form` de entrada deixa de ser a porta. Vira o desvio `Escrever mensagem longa`, sem dropdown de conversa (que subiu para a barra) |
| §2.1.2 | A sequência de envio passa a valer por turno, não por tela |
| §2.1.3 | O `Detail` único vira `List` com painel por turno. Os 5 campos de metadados ficam |
| §2.1.4 | A tabela de 7 estados da tela passa a ser por turno |
| §2.2 | O alvo de `Continuar esta conversa` na lista de conversas |
| §2.3 | O detalhe da conversa deixa de ser o destino de abrir uma conversa |
| §6.1, §6.2 | `Preparando…` / `O Hermes está pensando…` e o buffer de 80 ms passam a ser por turno |
| §6.4 | **As duas ordens de `ActionPanel` são substituídas pela §6 deste documento.** Cai a numeração fixa de 9 ações com `Copiar resposta` como primária |
| §6.5 | O fechamento da janela: o aviso de remontagem passa a ser por turno |
| §9.2 | Entra `Ctrl+Shift+D`; `Ctrl+Shift+Return` fica órfão nesta tela |
| §10.2 | Sem mudança — mas é ele que proíbe chamar isto de "chat" |

O que **não** muda e continua prevalecendo: todas as decisões D-01 a D-08 de
`docs/DECISOES-VERIFICADAS.md`, o catálogo de erros da §5, os 7 rótulos da §4.1, as duas
condições da §4.3, e as regras de tom da §10.1.

## 14. Testes

`node --test` sobre as funções puras — é onde a lógica de verdade mora:

`tests/turns.test.ts`

- `pairMessagesIntoTurns`: conversa normal; conversa que começa com `system`; `tool`
  entre `assistant` e a próxima `user`; mensagem `user` sem resposta (turno em curso no
  Desktop); lista vazia; ordem cronológica preservada.
- `turnMarkdown`: modo resposta e modo etapas; turno sem resposta ainda; turno com erro
  preservando o texto parcial; truncagem em 6.000 caracteres.
- `nextQueued`: fila vazia; um enfileirado com o anterior concluído; um enfileirado com o
  anterior falhado (**não** dispara); dois enfileirados (dispara só o primeiro).

Os 182 testes existentes continuam passando sem alteração — nenhum deles toca `ask.tsx`.

**Os cinco portões, com saída literal, antes de declarar qualquer coisa pronta:**

```
npx tsc --noEmit -p tsconfig.json
npx tsc --noEmit -p tests/tsconfig.json
node --test "tests/**/*.test.ts"
npx ray lint
npx ray build --target release
```

E, porque interface não se prova com portão: percorrer os 13 itens do checklist manual do
fim de `INSTRUCOES_DO_PROJETO.md` com a extensão rodando, incluindo o item 13 (navegação
só por teclado), que nunca foi exercitado.

## 15. Riscos conhecidos

| Risco | Por quê | O que fazemos |
|---|---|---|
| Fluidez do render com 40 itens e um escrevendo | Só medível rodando; `isShowingDetail` re-renderiza a `List` toda | Medir cedo. Se falhar, baixar o teto antes de mexer em qualquer outra coisa |
| `selectedItemId` brigando com a navegação por setas | Corrida conhecida (raycast/extensions#10844) | Sem `onSelectionChange`; soltar `selectedItemId` no estado terminal; exercitar à mão |
| Latência de `askInSession` em conversa longa | O agente recarrega o passado do lado dele; não medimos | Medir num turno de conversa longa antes de fechar o desenho da fila |
| Duas execuções na mesma conversa | Não há trava programática, só a regra R9 | A fila é a trava. Nunca disparar com um turno vivo |
| Aprovação numa conversa com vários turnos | A fila de aprovação é por execução (`run_id`), não por conversa (`D-10`) | Implementado e coberto na extensão atual (`use-conversation.ts`) |

---

## Apêndice — o que ficou sem resposta e só se resolve teclando

1. `Enter` dentro de um `Form.TextArea` no Raycast Windows: quebra linha ou submete?
   Continua UNVERIFIED. **Este desenho não depende mais disso.**
2. O Hermes aceita duas execuções simultâneas na mesma conversa, e o que acontece na
   intercalação? Só há a regra em comentário.
3. `approval.request` chega igual numa segunda execução da mesma conversa? A fila é por
   execução ou por conversa?
4. Custo real do primeiro pedaço de texto em conversa longa.
