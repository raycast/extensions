# ARCHITECTURE.md — Hermes para Raycast (macOS e Windows): camadas não-UI

> **Adendo — suporte a macOS.** Este documento foi escrito quando a extensão era declarada só para
> Windows, e o restante do texto continua fiel a esse momento. O que mudou desde então, e vale mais
> que qualquer trecho abaixo que contradiga:
>
> - o manifesto declara `"platforms": ["macOS", "Windows"]`;
> - a §6 (descoberta) mantém a ordem `HERMES_HOME` → `gateway.pid.hermes_home` → **pasta padrão da
>   plataforma**, e a pasta padrão passou a ser `%LOCALAPPDATA%\hermes` no Windows e `~/.hermes` no
>   macOS. Quem resolve isso é `defaultHermesHome()`, que recebe plataforma e `homedir` por
>   parâmetro para poder ser testada nos dois sistemas em qualquer máquina;
> - a preferência `sessionKey` **deixou de ter `default` no manifesto**. O padrão é resolvido em
>   código, por sistema (`raycast:windows:default` / `raycast:macos:default`), justamente para que
>   ninguém que já usa a extensão seja migrado em silêncio;
> - os atalhos customizados usam a forma `{ Windows, macOS }` da API do Raycast
>   (`perPlatform()` em `src/components/shortcuts.ts`). A regra "nunca `cmd`" continua valendo —
>   agora restrita ao bloco Windows;
> - os textos que nomeiam programas e teclas do sistema saem de `src/lib/platform.ts`.
>
> Nada do contrato com o Hermes API Server mudou. **O caminho macOS não foi exercitado ao vivo:**
> a validação manual continua sendo só de Windows 11.

**Escopo deste documento.** Especificação técnica completa e auto-contida de tudo que fica em
`src/lib/`: tipos, descoberta do servidor, cliente HTTP, parser SSE, erros, preferências,
armazenamento, contrato de sincronização com o Hermes Desktop, armadilhas e estratégia de testes.
O agente de implementação **codifica direto daqui** — não precisa dos docs de pesquisa nem do
código-fonte do Hermes.

**Alvo confirmado (não re-discutir):**

| Item | Valor |
|---|---|
| Servidor | gateway `api_server`, aiohttp, `http://127.0.0.1:8642` |
| Auth | `Authorization: Bearer <API_SERVER_KEY>` — única forma aceita |
| Versão Hermes observada | `0.20.4` |
| Runtime Raycast | Node **22.22.2**, React **19.2.1**, `fetch`/`AbortController`/`ReadableStream`/`TextDecoder` globais |
| Deps | `"@raycast/api": "^1.104.20"`, `"@raycast/utils": "^2.2.7"` |
| Plataforma | `"platforms": ["macOS", "Windows"]` (era só `["Windows"]`; ver o adendo no topo) |

**Invariantes de segurança (valem em todo o código):**

1. O valor de `API_SERVER_KEY` **nunca** é exposto, logado, colocado em mensagem de erro,
   fixture, README, commit ou screenshot. Ele vem da preferência `password` ou, somente após
   ação explícita do usuário, da única linha `API_SERVER_KEY` do `.env`; em ambos os casos vai
   apenas para autenticação e armazenamento protegido.
2. Nenhuma função pode retornar/serializar `RequestInit.headers`. `errors.ts` aplica
   `sanitizeTechnical()` que remove `Bearer <algo>` de qualquer string técnica.
3. `discovery.ts` pode ler `config.yaml`, `gateway.pid` e as linhas autorizadas de `.env`:
   `API_SERVER_PORT` para descoberta e `API_SERVER_KEY` somente na ação explícita de detecção.
   Nunca lê `auth.json`, `state.db` ou qualquer outra linha do `.env`.

---

## Histórico de decisões arquiteturais

Os pontos abaixo foram resolvidos pelo usuário e por verificações contra o Hermes real. A tabela
fica como registro de contexto; ela não contém bloqueios de implementação pendentes.

| # | Pendência | Estado nos dois documentos | Recomendação |
|---|---|---|---|
| ~~**P1**~~ | Ler `API_SERVER_KEY` do `.env` | **RESOLVIDA — D-08**: somente sob ação explícita, apenas a linha autorizada, nunca exibida e nunca em background. | Implementação em `discovery.ts` + onboarding; preferência manual continua vencendo. |
| ~~**P2**~~ | Transporte de `Perguntar ao Hermes` | **RESOLVIDA — D-01**: sessão `source:"desktop"` + `/v1/runs` com `session_id`; sobrevive ao fechamento e sincroniza com o Desktop. | Não reintroduzir `chat/stream` como transporte da conversa. |
| ~~**P3**~~ | Modelo padrão da extensão | **RESOLVIDA**: override do próximo envio > `LocalStorage` > preferência. | A escolha da tela de Modelos não altera a preferência global do Raycast. |
| ~~**P4**~~ | **Aprovação sem detalhes**: a UX-SPEC §7.6 oferecia `Aprovar mesmo sem ver os detalhes`, enquanto a armadilha 24 exige `deny`. | **RESOLVIDA por D-12:** postura estrita, sem autorização às cegas. | Quando o payload se perde, oferecer apenas `deny` e explicar a limitação; não inventar uma aprovação nem reabrir o pedido sem dados. |

Já **resolvidas** e removidas da lista de dúvidas: `hermes://open/<sessionId>` foi confirmado ao vivo
nesta máquina (a pendência V-2 da UX-SPEC §12 está fechada). V-3, V-4 e V-5 continuam válidas como
verificações de implementação — nenhuma delas muda arquitetura.

---

## 0. Desvios explícitos do INSTRUCOES_DO_PROJETO.md

A pesquisa verificada vence nos fatos. Cada desvio abaixo é deliberado.

| # | O brief diz | O que fazemos | Por quê (fato verificado) |
|---|---|---|---|
| D1 | `apiUrl` com default `http://127.0.0.1:8642` | `apiUrl` **opcional, sem default** (vazio = detecção automática) | A porta é dirigida por `config.yaml → platforms.api_server.extra.port`; um default fixo esconde instalações com porta diferente. Com o campo vazio rodamos a descoberta ordenada (§3), que também valida `platform === "hermes-agent"`. Se o usuário preencher, a preferência vence e **não há fallback silencioso**. |
| D2 | Header principal `X-Hermes-Session-Id` | **Nunca enviamos** `X-Hermes-Session-Id` | As rotas `/api/sessions/{id}/chat[/stream]` **não leem** esse header (o id do path vence); `/v1/runs` também não. Enviá-lo só teria efeito em `/v1/chat/completions`, que não usamos (D3). |
| D3 | Endpoints `POST /v1/chat/completions` e `POST /v1/responses` | **Não implementados** no cliente | `/v1/chat/completions` deriva ids opacos `api-<sha256[:16]>`, não aparece na lista de sessões e usa `prompt_tokens/completion_tokens` (naming divergente). `/v1/responses` grava em `response_store.db` (LRU de 100), fora do `state.db` que o Desktop lê ⇒ quebra a sincronização. YAGNI: nenhuma jornada do MVP precisa deles. |
| D4 | "não ler diretamente arquivos internos do Hermes" | `discovery.ts` lê `gateway.pid`, `gateway_state.json`, `config.yaml` e no máximo a linha `API_SERVER_PORT` do `.env` | Só assim a auto-descoberta funciona; nenhum arquivo é **escrito** e nenhum segredo é lido. O `/health` continua sendo a autoridade final. |
| D5 | `maxHistoryItems` como campo numérico | `dropdown` com `25/50/100/200` | O schema do manifest tem exatamente 7 tipos de preferência e **nenhum é numérico**; `textfield` exigiria parsing/validação e falharia para usuário não técnico. 200 é o teto real de `GET /api/sessions`. |
| D6 | "estrutura prevista" com 6 arquivos em `lib/` | 8 arquivos (adiciona `discovery.ts` e `status.ts`) | Justificado em §1. |
| D7 | `source` da sessão configurável | **Sempre** `"desktop"`, constante no código | R3 (§8): qualquer outro valor tira a conversa do "Recents" do Desktop. Não é decisão do usuário. |

---

## 1. MODULE MAP

```text
src/lib/
  types.ts          — apenas tipos (erasable). Zero código de runtime, zero imports de @raycast/api.
  status.ts         — rótulos padronizados pt-BR dos 7 estados + predicados de terminalidade.
  errors.ts         — classes de erro tipadas, mapeamento HTTP/rede → erro, mensagem pt-BR + ação de recuperação.
  preferences.ts    — leitura/validação centralizada das preferências. Único módulo que vê a chave.
  discovery.ts      — resolução e cache da baseUrl (preferência > config.yaml > env > .env > 8642) + gate /health.
  hermes-api.ts     — cliente HTTP: wrapper de fetch, headers, timeouts, mapeamento de erro, e uma função tipada por endpoint.
  hermes-events.ts  — parser SSE genérico + vocabulário tipado dos dois streams + consumidores + cancelamento.
  storage.ts        — LocalStorage (durável, pequeno) e Cache (efêmero, TTL). Política do que NÃO se guarda.
```

**Quem depende de quem (sem ciclos):**

```text
types.ts   ← (todos)
status.ts  ← types
errors.ts  ← types
storage.ts ← types
preferences.ts ← types, errors
discovery.ts   ← types, errors, storage
hermes-api.ts  ← types, errors, preferences, discovery
hermes-events.ts ← types, errors
```

`hermes-events.ts` **não** importa `hermes-api.ts`: ele recebe um `Response` já aberto. Isso o torna
100% testável sem servidor.

**Justificativa das duas adições (e por que nada mais entra):**

- **`discovery.ts`** — obrigatório. Nada em disco registra a porta *em uso*; `config.yaml` é a fonte
  declarada, `8642` é o default do adaptador, e a porta `8644` (webhook) também responde `/health`.
  A lógica ordenada + o gate `platform === "hermes-agent"` é algorítmica, tem estado (cache da
  baseUrl com invalidação) e é a parte mais testável do sistema. Enfiá-la em `hermes-api.ts`
  misturaria I/O de filesystem com transporte HTTP e tornaria o cliente intestável.
- **`status.ts`** — 20 linhas. Os 7 rótulos (`Preparando/Executando/Aguardando aprovação/
  Interrompendo/Concluído/Cancelado/Falhou`) são consumidos por `run-task`, `active-runs`,
  `sessions`, `jobs` e `ask-hermes`. Uma fonte única evita a deriva de nomes que o princípio 9 do
  brief proíbe. Não pode ir em `types.ts` (que é `import type` puro) nem em `errors.ts` (domínio
  diferente).

**Rejeitados por YAGNI:** `http.ts` separado do `hermes-api.ts`; `logger.ts` (usar `console.*`, que
já vai para o terminal do `ray develop`); `retry.ts` (o único retry justificado é 429/503 e cabe em
6 linhas dentro do wrapper); `sync.ts` (a sincronização é uma disciplina de chamadas, não um módulo);
pasta `api/` fatiada por recurso (o brief pede um `hermes-api.ts`; refatorar só se passar de ~700 linhas).

---

## 2. `types.ts`

Descreve **a forma do fio**, não uma validação. Nada valida em runtime: trate todo campo como
possivelmente ausente e todo `string` de enum como possivelmente desconhecido.

```ts
/**
 * Tipos derivados das respostas reais do Hermes API Server 0.20.4
 * (gateway/platforms/api_server.py). Somente tipos — nenhum valor de runtime.
 */

/* ────────────────────────────── Erros ────────────────────────────── */

/** Envelope padrão (`_openai_error`). `param`/`code` podem ser null; `param` pode não existir. */
export interface HermesErrorEnvelope {
  error: {
    message: string;
    type?: string;
    param?: string | null;
    code?: string | null;
    /** Presente apenas no 502 `agent_incomplete`. */
    hermes?: { completed: boolean; partial: boolean; failed: boolean };
  };
}

/** Envelope legado das rotas de jobs e do prefixo de perfil: `{"error": "texto"}`. */
export interface HermesBareErrorEnvelope {
  error: string;
}

/** 424 de `POST /api/jobs` (job salvo, scheduler não armado). */
export interface JobRegistrationErrorEnvelope {
  error: string;
  job_id: string;
  job_saved: boolean;
  scheduler_registered: boolean;
  retry_create: boolean;
}

/* ──────────────────────── Saúde e capacidades ────────────────────── */

/** GET /health e GET /v1/health (sem auth). */
export interface HealthResponse {
  status: string;
  /** "hermes-agent" no api_server; "webhook" na porta 8644. */
  platform: string;
  version: string;
}

export interface HermesFeatures {
  chat_completions?: boolean;
  chat_completions_streaming?: boolean;
  responses_api?: boolean;
  responses_streaming?: boolean;
  run_submission?: boolean;
  run_status?: boolean;
  run_events_sse?: boolean;
  run_stop?: boolean;
  run_steer?: boolean;
  run_approval_response?: boolean;
  tool_progress_events?: boolean;
  approval_events?: boolean;
  session_resources?: boolean;
  model_options?: boolean;
  session_chat?: boolean;
  session_chat_streaming?: boolean;
  session_fork?: boolean;
  session_model_lock?: boolean;
  admin_config_rw?: boolean;
  jobs_admin?: boolean;
  memory_write_api?: boolean;
  skills_api?: boolean;
  audio_api?: boolean;
  realtime_voice?: boolean;
  /** String, não boolean: "X-Hermes-Session-Id". */
  session_continuity_header?: string;
  /** String, não boolean: "X-Hermes-Session-Key". */
  session_key_header?: string;
  cors?: boolean;
  [key: string]: boolean | string | undefined;
}

/** GET /v1/capabilities (auth). */
export interface Capabilities {
  object: "hermes.api_server.capabilities";
  platform: string;
  /** Modelo VIRTUAL (normalmente "hermes-agent"). Nunca enviar como model real. */
  model: string;
  auth: { type: "bearer"; required: boolean };
  runtime: {
    mode: string;
    /** "server" — ferramentas executam no host do Hermes, nunca no Raycast. */
    tool_execution: string;
    split_runtime: boolean;
    description: string;
  };
  features: HermesFeatures;
  /** Mapa nome → {method, path-template aiohttp}. 24 entradas em 0.20.4. */
  endpoints: Record<string, { method: string; path: string }>;
}

/* ──────────────────────────── Modelos ────────────────────────────── */

/** GET /v1/models */
export interface ModelListResponse {
  object: "list";
  data: ModelEntry[];
}

export interface ModelEntry {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  permission: unknown[];
  root: string;
  parent: string | null;
}

/** GET /api/model/options */
export interface ModelOptionsResponse {
  providers: ProviderOption[];
  /** Modelo default global (config.model.default). */
  model: string | null;
  /** Provider default global. */
  provider: string | null;
}

export interface ProviderOption {
  /** O valor que se envia em `provider`. */
  slug: string;
  name: string;
  is_current: boolean;
  is_user_defined: boolean;
  models: string[];
  total_models: number;
  /** "built-in" | "hermes" | "canonical" | "user-config" | "model-config" | "virtual" | "configured-current" */
  source: string;
  api_url?: string;
  native_catalog_empty?: boolean;
  /** false em linhas "esqueleto" (provider sem credencial). */
  authenticated?: boolean;
  /** Só em linhas não configuradas: "api_key" | "oauth" | "virtual". */
  auth_type?: string;
  /** NOME da variável de ambiente (ex.: "ANTHROPIC_API_KEY"), nunca o valor. */
  key_env?: string;
  warning?: string;
  /** Chaveado por model id. Contém SOMENTE `fast` e `reasoning`. */
  capabilities?: Record<string, ModelCapability>;
  /** Pode vir vazio; nesse caso usar os N primeiros de `models`. */
  featured_models?: string[];
  pricing?: Record<string, ModelPricing>;
  free_tier?: boolean;
  unavailable_models?: string[];
  /** Só em linhas is_user_defined. Comparar pertinência aqui, não igualdade de slug. */
  aliases?: string[];
}

export interface ModelCapability {
  fast: boolean;
  reasoning: boolean;
}

/** Strings já formatadas para exibição ("$3.00", "free"), não números. */
export interface ModelPricing {
  input: string;
  output: string;
  cache: string | null;
  free: boolean;
  discount_percent?: number;
  was_input?: string;
  was_output?: string;
}

/** Linha achatada para o seletor de modelos da UI (produzida por flattenModelOptions). */
export interface ModelOption {
  provider: string;
  providerName: string;
  model: string;
  fast: boolean;
  reasoning: boolean;
  pricing?: ModelPricing;
  authenticated: boolean;
  isCurrent: boolean;
  isFeatured: boolean;
}

/* ──────────────────────── Skills e toolsets ──────────────────────── */

/** GET /v1/skills — exatamente 3 campos; só skills habilitadas voltam. */
export interface Skill {
  name: string;
  description: string;
  category: string;
}

export interface SkillListResponse {
  object: "list";
  data: Skill[];
}

/** GET /v1/toolsets — 6 campos. `label` já vem com emoji. */
export interface Toolset {
  name: string;
  label: string;
  description: string;
  /** Ligado para a plataforma api_server. */
  enabled: boolean;
  /** Tem credenciais/providers. NÃO implica "não precisa configurar". */
  configured: boolean;
  tools: string[];
}

export interface ToolsetListResponse {
  object: "list";
  /** Literal "api_server": a que plataforma os `enabled` se referem. */
  platform: string;
  data: Toolset[];
}

/* ──────────────────────────── Sessões ────────────────────────────── */

/** Valores aceitos ao CRIAR. Qualquer outro degrada silenciosamente para "api_server". */
export type SessionSourceInput =
  | "desktop"
  | "cli"
  | "dashboard"
  | "hermes_browser"
  | "browser"
  | "api_server"
  | "telegram"
  | "discord"
  | "slack";

/**
 * Projeção de `_session_response`. As chaves só aparecem quando existem na linha do banco:
 * todo campo, exceto `id`, `has_system_prompt` e `has_model_config`, é opcional.
 * NÃO existe `updated_at` (use `last_active`) nem `provider`.
 */
export interface Session {
  id: string;
  source?: string;
  user_id?: string | null;
  /** null quando o cliente não mandou modelo ou mandou o alias virtual. */
  model?: string | null;
  title?: string | null;
  /** epoch em SEGUNDOS, float. */
  started_at?: number;
  ended_at?: number | null;
  /** ex.: "branched" após fork. */
  end_reason?: string | null;
  message_count?: number;
  tool_call_count?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  reasoning_tokens?: number;
  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
  api_call_count?: number;
  parent_session_id?: string | null;
  /** epoch em segundos. É o "última atualização". */
  last_active?: number | null;
  /** ~60 primeiros chars da primeira mensagem do usuário. */
  preview?: string | null;
  /** underscore inicial é intencional (raiz da cadeia de compressão). */
  _lineage_root_id?: string;
  pinned?: boolean;
  archived?: boolean;
  hidden?: boolean;
  /** Sempre presente (derivado). */
  has_system_prompt: boolean;
  /** Sempre presente (derivado). */
  has_model_config: boolean;
}

export interface SessionListResponse {
  object: "list";
  data: Session[];
  limit: number;
  offset: number;
  /** Conta apenas linhas NÃO fixadas contra o limit. */
  has_more: boolean;
}

export interface SessionEnvelope {
  object: "hermes.session";
  session: Session;
}

export interface SessionDeletedResponse {
  object: "hermes.session.deleted";
  id: string;
  /** Pode ser false: não assuma true. */
  deleted: boolean;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** Projeção de `_message_response`. Ordenação real é por `id` (autoincrement), não por timestamp. */
export interface SessionMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content?: string;
  tool_call_id?: string | null;
  /** Já vem parseado como array, não como string JSON. */
  tool_calls?: ToolCall[] | null;
  tool_name?: string | null;
  timestamp?: number;
  token_count?: number | null;
  finish_reason?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
}

export interface SessionMessagesResponse {
  object: "list";
  /** Pode DIFERIR do id pedido (resolve continuações de compressão para frente). */
  session_id: string;
  data: SessionMessage[];
  pagination: {
    limit: number;
    offset: number;
    order: "oldest" | "latest";
    returned: number;
  };
}

/* ───────────────────── Runtime / uso de tokens ───────────────────── */

/** Naming Hermes-nativo (difere do OpenAI prompt_tokens/completion_tokens). */
export interface HermesUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export type RouteSource =
  | "global"
  | "model_routes"
  | "raw_request"
  | "session_model_lock"
  | "session_model_override";

export interface RuntimeMetadata {
  provider: string;
  model: string;
  route_source: RouteSource | string;
  requested?: { provider?: string; model?: string };
  /** "" | "accepted" | "confirmed" */
  model_lock?: string;
}

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface ModelOptionsRequest {
  reasoning?: { enabled?: boolean; effort?: ReasoningEffort };
  service_tier?: string;
  fast?: boolean;
}

/** POST /api/sessions/{id}/chat (não streaming). */
export interface SessionChatResponse {
  object: "hermes.session.chat.completion";
  /** Id EFETIVO — muda se houve compressão no meio do turno. Siga este valor. */
  session_id: string;
  message: { role: "assistant"; content: string };
  usage?: HermesUsage;
  runtime?: RuntimeMetadata;
}

/** POST /api/sessions/{id}/model */
export interface SessionModelLockResponse {
  object: "hermes.session.model_lock";
  session_id: string;
  runtime: RuntimeMetadata;
}

/* ────────────────────────────── Runs ─────────────────────────────── */

/** Os 7 estados possíveis. "started" NÃO é um deles (é só o campo do 202). */
export type RunStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "stopping"
  | "completed"
  | "cancelled"
  | "failed";

/** GET /v1/runs/{run_id}. Campos ACUMULAM entre transições. */
export interface Run {
  object: "hermes.run";
  run_id: string;
  status: RunStatus;
  /** epoch em segundos (float). Nunca ISO, nunca ms. */
  updated_at: number;
  created_at: number;
  session_id?: string;
  model?: string;
  /** Nome do último evento SSE. Mais confiável que `status` quando divergem. */
  last_event?: string;
  /** Só em completed. */
  output?: string;
  /** Só em completed. Contadores CUMULATIVOS da sessão, não deltas do run. */
  usage?: HermesUsage;
  pending_steer?: string;
  /** Só em failed. Já redigido. */
  error?: string;
}

/** 202 de POST /v1/runs — exatamente 2 chaves. */
export interface RunCreatedResponse {
  run_id: string;
  status: "started";
}

export type ApprovalChoice = "once" | "session" | "always" | "deny";

export interface RunApprovalResponse {
  object: "hermes.run.approval_response";
  run_id: string;
  choice: ApprovalChoice;
  resolved: number;
}

export interface RunSteerResponse {
  object: "hermes.run.steer";
  run_id: string;
  accepted: boolean;
}

export interface RunStopResponse {
  run_id: string;
  status: "stopping";
}

/* ───────── Eventos SSE — /v1/runs/{id}/events (discriminados por `event`) ───────── */

interface RunEventBase {
  run_id: string;
  /** epoch em segundos (float). */
  timestamp: number;
}

export type RunEvent =
  | (RunEventBase & { event: "message.delta"; delta: string })
  | (RunEventBase & { event: "tool.started"; tool: string; preview: string | null })
  | (RunEventBase & { event: "tool.completed"; tool: string; duration: number; error: boolean })
  | (RunEventBase & { event: "reasoning.available"; text: string })
  | (RunEventBase & SubagentFields & { event: "subagent.start" })
  | (RunEventBase & SubagentFields & { event: "subagent.complete" })
  | (RunEventBase & ApprovalRequestFields & { event: "approval.request" })
  | (RunEventBase & { event: "approval.responded"; choice: ApprovalChoice; resolved: number })
  | (RunEventBase & { event: "run.steered"; accepted: boolean })
  | (RunEventBase & { event: "run.completed"; output: string; usage: HermesUsage; pending_steer?: string })
  | (RunEventBase & { event: "run.failed"; error: string })
  | (RunEventBase & { event: "run.cancelled" })
  | (RunEventBase & { event: string; [key: string]: unknown });

/** Campos opcionais de subagent.* — cada chave só aparece quando não é null. */
export interface SubagentFields {
  preview?: string;
  goal?: string;
  task_count?: number;
  task_index?: number;
  subagent_id?: string;
  child_session_id?: string;
  parent_id?: string;
  depth?: number;
  model?: string;
  tool_count?: number;
  /** "completed" | "failed" | "timeout" | "error" */
  status?: string;
  summary?: string;
  duration_seconds?: number;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  api_calls?: number;
  cost_usd?: number;
  files_read?: string[];
  files_written?: string[];
  output_tail?: string;
}

/** Payload de approval.request. NÃO existe tool_name nem args estruturados. */
export interface ApprovalRequestFields {
  /** Comando literal ou mensagem de elicitação. Renderizar em bloco monoespaçado. */
  command?: string;
  /** A explicação de risco. Não existe campo numérico de risco. */
  description?: string;
  pattern_key?: string;
  pattern_keys?: string[];
  allow_permanent?: boolean;
  allow_session?: boolean;
  /** Presente somente quando true. */
  smart_denied?: boolean;
  /** 32 hex. Só correlação: NÃO dá para endereçá-lo no POST /approval. */
  request_id?: string;
  /** Use exatamente estas opções nos botões; não hardcode. */
  choices: ApprovalChoice[];
}

/* ── Eventos SSE — /api/sessions/{id}/chat/stream (discriminados pelo nome do evento) ── */

/** Injetado com setdefault em TODO payload deste stream. */
export interface SessionStreamEnvelope {
  /** Id do path — exceto em assistant.completed/run.completed, onde é o EFETIVO. */
  session_id: string;
  /** run_<uuid4hex> — serve para /v1/runs/{id}/stop|steer. */
  run_id: string;
  /** 1-based, monotônico por stream. */
  seq: number;
  ts: number;
}

export type SessionChatEvent =
  | (SessionStreamEnvelope & {
      type: "run.started";
      user_message: { role: "user"; content: unknown };
      runtime?: RuntimeMetadata;
    })
  | (SessionStreamEnvelope & { type: "message.started"; message: { id: string; role: "assistant" } })
  | (SessionStreamEnvelope & { type: "assistant.delta"; message_id: string; delta: string })
  | (SessionStreamEnvelope & {
      type: "tool.progress";
      message_id: string;
      /** default "_thinking" */
      tool_name: string;
      /** preview de raciocínio, ≤500 chars */
      delta: string;
    })
  | (SessionStreamEnvelope & {
      type: "tool.started";
      message_id: string;
      tool_name: string;
      preview: string | null;
      args: unknown;
    })
  | (SessionStreamEnvelope & {
      type: "tool.completed";
      message_id: string;
      tool_name: string;
      /** sempre null na conclusão */
      preview: null;
      args: null;
    })
  /** Reservado: nenhum produtor existe hoje. */
  | (SessionStreamEnvelope & {
      type: "tool.failed";
      message_id: string;
      tool_name: string;
      preview: string | null;
      args: unknown;
    })
  | (SessionStreamEnvelope & {
      type: "assistant.completed";
      message_id: string;
      content: string;
      completed: boolean;
      partial: boolean;
      interrupted: boolean;
      runtime?: RuntimeMetadata;
    })
  | (SessionStreamEnvelope & {
      type: "run.completed";
      message_id: string;
      completed: boolean;
      /** Transcrição autoritativa do turno. Use ISTO, não a concatenação dos deltas. */
      messages: SessionMessage[];
      usage?: HermesUsage;
      runtime?: RuntimeMetadata;
      pending_steer?: string;
    })
  | (SessionStreamEnvelope & { type: "error"; message: string })
  | (SessionStreamEnvelope & { type: "done" })
  | (SessionStreamEnvelope & { type: string; [key: string]: unknown });

/* ──────────────────────────── Jobs (cron) ────────────────────────── */

export type JobState = "scheduled" | "paused" | "completed" | "error";

export type JobSchedule =
  | { kind: "interval"; minutes: number; display?: string }
  | { kind: "cron"; expr: string; display?: string }
  | { kind: "once"; run_at: string; display?: string };

export interface JobExecution {
  id: string;
  job_id: string;
  /** "builtin" | "direct" | nome do provider. String aberta. */
  source?: string;
  process_id?: string;
  pid?: number;
  process_started_at?: number;
  /** "claimed" | "running" | "completed" | "failed" | "unknown" */
  status?: string;
  claimed_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
}

/** Registros antigos não têm campos novos: trate TUDO menos `id` como opcional. */
export interface Job {
  id: string;
  name?: string;
  prompt?: string;
  skills?: string[];
  skill?: string | null;
  model?: string | null;
  provider?: string | null;
  provider_snapshot?: string | null;
  model_snapshot?: string | null;
  base_url?: string | null;
  script?: string | null;
  no_agent?: boolean;
  monitor_script?: string | null;
  monitor_url?: string | null;
  monitor_state?: { last_output_hash?: string; last_changed_at?: string } | null;
  context_from?: string[] | null;
  /** OBJETO na resposta, embora se envie STRING na criação. */
  schedule?: JobSchedule;
  /** String pronta para exibir. "?" quando nada resolve. Use esta. */
  schedule_display?: string;
  repeat?: { times: number | null; completed: number };
  enabled?: boolean;
  /** Já derivado no servidor: não recalcule a partir de `enabled`. */
  state?: JobState;
  paused_at?: string | null;
  paused_reason?: string | null;
  /** ISO com offset. */
  created_at?: string;
  next_run_at?: string | null;
  /** Nome é last_run_at, não last_run. */
  last_run_at?: string | null;
  /** "ok" | "error" | override como "blocked_config". */
  last_status?: string | null;
  last_error?: string | null;
  last_delivery_error?: string | null;
  failure_streak?: number;
  /** "local" | "origin" | "all" | "<plataforma>[:<chat>[:<thread>]]" | combinações com vírgula. */
  deliver?: string;
  origin?: { platform?: string; chat_id?: string; [key: string]: unknown } | null;
  enabled_toolsets?: string[] | null;
  workdir?: string | null;
  attach_to_session?: boolean;
  /** SOMENTE na rota de lista. */
  latest_execution?: JobExecution | null;
}

export interface JobListResponse {
  jobs: Job[];
}

export interface JobEnvelope {
  job: Job;
}

export interface JobDeletedResponse {
  ok: boolean;
}
```

---

## 3. `status.ts`

```ts
import type { JobState, RunStatus } from "./types";

/** Os 7 rótulos canônicos do brief. Não criar sinônimos em lugar nenhum. */
export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Preparando",
  running: "Executando",
  waiting_for_approval: "Aguardando aprovação",
  stopping: "Interrompendo",
  completed: "Concluído",
  cancelled: "Cancelado",
  failed: "Falhou",
};

export const TERMINAL_RUN_STATUSES: ReadonlySet<string> = new Set<RunStatus>([
  "completed",
  "cancelled",
  "failed",
]);

export function isTerminalRunStatus(status: string | undefined): boolean {
  return status !== undefined && TERMINAL_RUN_STATUSES.has(status);
}

/** Tolerante a status futuros desconhecidos. */
export function runStatusLabel(status: string | undefined): string {
  if (status && status in RUN_STATUS_LABEL) return RUN_STATUS_LABEL[status as RunStatus];
  return "Desconhecido";
}

/**
 * Fase de um turno em /api/sessions/{id}/chat/stream, mapeada para os mesmos 7 rótulos.
 * Transições: idle → run.started ⇒ running → error ⇒ failed → done ⇒ completed.
 */
export type StreamPhase = "idle" | "running" | "stopping" | "completed" | "cancelled" | "failed";

export const STREAM_PHASE_LABEL: Record<StreamPhase, string> = {
  idle: "Preparando",
  running: "Executando",
  stopping: "Interrompendo",
  completed: "Concluído",
  cancelled: "Cancelado",
  failed: "Falhou",
};

export const JOB_STATE_LABEL: Record<JobState, string> = {
  scheduled: "Agendado",
  paused: "Pausado",
  completed: "Concluído",
  error: "Falhou",
};

export function jobStateLabel(state: string | undefined): string {
  if (state && state in JOB_STATE_LABEL) return JOB_STATE_LABEL[state as JobState];
  return "Desconhecido";
}
```

---

## 4. `errors.ts`

### 4.1 Contrato

Toda falha vira uma subclasse de `HermesError` com quatro coisas separadas:

- `userMessage` — pt-BR, curta, sem jargão. É o que aparece na tela/Toast.
- `recovery` — ação concreta que a UI deve oferecer (`RecoveryAction`).
- `technical` — detalhe para o botão "Copiar detalhes técnicos". **Oculto por padrão.**
- `retryable` — se "Tentar novamente" faz sentido.

### 4.2 Catálogo completo (status → classe → mensagem → ação)

| Status / condição | `code` observado | Classe | `userMessage` (pt-BR) | `recovery` | retry |
|---|---|---|---|---|---|
| `ECONNREFUSED` / `ECONNRESET` / `ENOTFOUND` | — | `HermesConnectionError` | "Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo." | `start_hermes` | sim |
| timeout do `AbortSignal` interno | — | `HermesTimeoutError` | "O Hermes demorou demais para responder." | `retry` | sim |
| abort pelo usuário / desmontagem | — | `HermesAbortError` | "Operação cancelada." | `none` | não |
| 401 | `gateway_auth_failed` | `HermesAuthError` | "A chave do Hermes não foi aceita. Confira a chave nas configurações." | `open_preferences` | não |
| 403 **corpo vazio** (`Content-Length: 0`) | — | `HermesOriginBlockedError` | "O Hermes recusou a conexão." | `report_bug` | não |
| 403 com JSON | — | `HermesForbiddenError` | "O Hermes bloqueou esta operação." | `open_preferences` | não |
| 404 JSON | `session_not_found` | `HermesNotFoundError` | "Esta conversa não existe mais." | `reload_list` | não |
| 404 JSON | `run_not_found` | `HermesNotFoundError` | "Esta execução não está mais disponível (pode ter expirado ou o Hermes foi reiniciado)." | `reload_list` | não |
| 404 `{"error":"Job not found"}` | — | `HermesNotFoundError` | "Esta automação não existe mais." | `reload_list` | não |
| 404 texto puro `404: Not Found` | — | `HermesNotFoundError` | "Recurso não encontrado no Hermes." | `report_bug` | não |
| 404 `{"error":"Unknown or unconfigured profile"}` | — | `HermesNotFoundError` | "O perfil informado não existe neste Hermes." | `open_preferences` | não |
| 400 | `invalid_title` | `HermesValidationError` | "Já existe uma conversa com esse título. Escolha outro." | `change_input` | não |
| 400 | `unsupported_session_field` / `invalid_session_field` / `invalid_session_id` | `HermesValidationError` | "Não foi possível salvar essa alteração na conversa." | `report_bug` | não |
| 400 | `invalid_pagination` | `HermesValidationError` | "Não foi possível carregar esta parte do histórico." | `retry` | sim |
| 400 | `missing_message` | `HermesValidationError` | "Escreva uma pergunta antes de enviar." | `change_input` | não |
| 400 | `invalid_steer_input` | `HermesValidationError` | "Escreva uma orientação antes de enviar." | `change_input` | não |
| 400 | `invalid_approval_choice` | `HermesValidationError` | "Opção de aprovação inválida." | `report_bug` | não |
| 400 | `invalid_content_length` | `HermesValidationError` | "O Hermes não entendeu o tamanho do envio." | `retry` | sim |
| 400 jobs (`Name is required` etc.) | — | `HermesValidationError` | frase traduzida da tabela `JOB_FIELD_MESSAGES` | `change_input` | não |
| 400 jobs `Blocked: prompt matches threat pattern…` | — | `HermesValidationError` | "Este texto foi bloqueado por segurança. Reescreva a instrução da automação." | `change_input` | não |
| 409 | `session_exists` | `HermesConflictError` | "Já existe uma conversa com esse identificador." | `retry` (com novo id) | sim |
| 409 | `model_lock_unavailable` | `HermesConflictError` | "Este modelo não está disponível agora. Escolha outro." | `change_input` | não |
| 409 | `approval_not_active` | `HermesConflictError` | "Esta execução não está mais esperando aprovação." | `reload_list` | não |
| 409 | `approval_not_pending` | `HermesConflictError` | "Não há nada pendente de aprovação nesta execução." | `reload_list` | não |
| 409 | `run_not_accepting_steer` / `steer_not_accepted` | `HermesConflictError` | "Só é possível orientar enquanto a execução estiver rodando." | `none` | não |
| 413 | `body_too_large` | `HermesPayloadTooLargeError` | "O conteúdo enviado é grande demais (limite de cerca de 10 MB)." | `reduce_size` | não |
| 424 (jobs) | — | `HermesJobRegistrationError` | "A automação foi salva, mas não foi agendada. Pause e retome para tentar de novo." | `none` — **nunca recriar** | não |
| 429 | `rate_limit_exceeded` | `HermesRateLimitError` (+`retryAfterSeconds`) | "O Hermes está com execuções demais no momento. Tente em instantes." | `wait_and_retry` | sim |
| 500 | `model_lock_persistence_failed` | `HermesServerError` | "Não foi possível fixar o modelo desta conversa." | `retry` | sim |
| 500 | `model_options_failed` | `HermesServerError` | "Não foi possível listar os modelos." | `retry` | sim |
| 500 jobs contendo "Invalid schedule" | — | `HermesScheduleError` | "A recorrência informada não é válida. Exemplos aceitos: …" | `change_input` | não |
| 500 genérico | — | `HermesServerError` | "O Hermes encontrou um erro interno." | `retry` | sim |
| 501 | `Cron module not available` | `HermesNotSupportedError` | "As automações não estão disponíveis nesta instalação do Hermes." | `none` | não |
| 502 | `agent_incomplete` | `HermesServerError` | "O Hermes não conseguiu concluir a resposta." | `retry` | sim |
| 503 | `gateway_draining` | `HermesUnavailableError` (+`retryAfterSeconds`) | "O Hermes está finalizando tarefas. Tente novamente em instantes." | `wait_and_retry` | sim |
| 503 | `session_db_unavailable` | `HermesUnavailableError` | "O banco de conversas do Hermes não está acessível." | `start_hermes` | sim |
| corpo não-JSON onde JSON era esperado | — | `HermesProtocolError` | "Resposta inesperada do Hermes." | `report_bug` | não |
| `/health` com `platform !== "hermes-agent"` | — | `HermesWrongServerError` | "O endereço configurado não é o Hermes API Server." | `open_preferences` | não |
| preferência `apiServerKey` vazia | — | `HermesNotConfiguredError` | "Conecte o Raycast ao Hermes: informe a chave do API Server." | `open_preferences` | não |

O envelope de 401 **não tem `param`** e nem sempre tem as mesmas chaves dos demais; por isso o parser
só exige `error.message`. Nunca decida nada pela string `message` — decida por `status` + `error.code`.

### 4.3 Código

```ts
import type { HermesErrorEnvelope } from "./types";

export type RecoveryAction =
  | "open_preferences"
  | "retry"
  | "wait_and_retry"
  | "start_hermes"
  | "reload_list"
  | "change_input"
  | "reduce_size"
  | "report_bug"
  | "none";

/** Rótulos dos botões — para a UI não inventar variações. */
export const RECOVERY_LABEL: Record<RecoveryAction, string | null> = {
  open_preferences: "Abrir configurações",
  retry: "Tentar novamente",
  wait_and_retry: "Tentar novamente",
  start_hermes: "Verificar o Hermes",
  reload_list: "Atualizar",
  change_input: "Editar e reenviar",
  reduce_size: "Reduzir o conteúdo",
  report_bug: "Copiar detalhes técnicos",
  none: null,
};

/** Remove qualquer credencial de um texto antes de exibi-lo ou copiá-lo. */
export function sanitizeTechnical(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/(api[_-]?server[_-]?key\s*[:=]\s*)\S+/gi, "$1***")
    .slice(0, 4000);
}

export interface HermesErrorInit {
  userMessage: string;
  technical: string;
  recovery: RecoveryAction;
  retryable?: boolean;
  status?: number;
  code?: string | null;
  cause?: unknown;
}

export class HermesError extends Error {
  readonly userMessage: string;
  readonly technical: string;
  readonly recovery: RecoveryAction;
  readonly retryable: boolean;
  readonly status?: number;
  readonly code?: string | null;

  constructor(init: HermesErrorInit) {
    super(init.userMessage, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = new.target.name;
    this.userMessage = init.userMessage;
    this.technical = sanitizeTechnical(init.technical);
    this.recovery = init.recovery;
    this.retryable = init.retryable ?? false;
    this.status = init.status;
    this.code = init.code ?? null;
  }
}

export class HermesNotConfiguredError extends HermesError {}
export class HermesConnectionError extends HermesError {}
export class HermesTimeoutError extends HermesError {}
export class HermesAbortError extends HermesError {}
export class HermesAuthError extends HermesError {}
export class HermesOriginBlockedError extends HermesError {}
export class HermesForbiddenError extends HermesError {}
export class HermesNotFoundError extends HermesError {}
export class HermesValidationError extends HermesError {}
export class HermesScheduleError extends HermesValidationError {}
export class HermesConflictError extends HermesError {}
export class HermesPayloadTooLargeError extends HermesError {}
export class HermesJobRegistrationError extends HermesError {}
export class HermesServerError extends HermesError {}
export class HermesNotSupportedError extends HermesError {}
export class HermesProtocolError extends HermesError {}
export class HermesWrongServerError extends HermesError {}

export class HermesRateLimitError extends HermesError {
  readonly retryAfterSeconds: number;
  constructor(init: HermesErrorInit & { retryAfterSeconds: number }) {
    super(init);
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

export class HermesUnavailableError extends HermesError {
  readonly retryAfterSeconds: number;
  constructor(init: HermesErrorInit & { retryAfterSeconds?: number }) {
    super(init);
    this.retryAfterSeconds = init.retryAfterSeconds ?? 1;
  }
}

/* ─────────────────────── Parsing do corpo de erro ─────────────────────── */

export interface ParsedErrorBody {
  message?: string;
  type?: string;
  code?: string | null;
  /** Corpo cru, truncado. */
  raw: string;
  /** true quando o corpo estava vazio (o 403 de CORS). */
  empty: boolean;
}

export function parseErrorBody(raw: string): ParsedErrorBody {
  const text = raw ?? "";
  if (text.trim() === "") return { raw: "", empty: true };
  try {
    const json: unknown = JSON.parse(text);
    if (json && typeof json === "object" && "error" in json) {
      const err = (json as HermesErrorEnvelope | { error: string }).error;
      if (typeof err === "string") return { message: err, raw: text.slice(0, 2000), empty: false };
      return {
        message: typeof err.message === "string" ? err.message : undefined,
        type: typeof err.type === "string" ? err.type : undefined,
        code: err.code ?? null,
        raw: text.slice(0, 2000),
        empty: false,
      };
    }
  } catch {
    /* corpo não-JSON, ex.: "404: Not Found" em text/plain */
  }
  return { message: text.slice(0, 300), raw: text.slice(0, 2000), empty: false };
}

/** Mensagens literais das rotas de jobs (envelope `{"error": "..."}`). */
const JOB_FIELD_MESSAGES: Record<string, string> = {
  "Name is required": "Dê um nome para a automação.",
  "Name must be ≤ 200 characters": "O nome da automação deve ter no máximo 200 caracteres.",
  "Schedule is required": "Informe quando a automação deve rodar.",
  "Prompt must be ≤ 5000 characters": "A instrução da automação deve ter no máximo 5000 caracteres.",
  "Repeat must be a positive integer": "O número de repetições deve ser um inteiro maior que zero.",
  "No valid fields to update": "Nenhuma alteração para salvar.",
  "Invalid job ID format": "Identificador de automação inválido.",
};
// NOTA: as duas chaves com ≤ usam o caractere "≤" literal no servidor (U+2264), não "<=".

/* ───────────────────────── Mapeamento HTTP → erro ───────────────────────── */

export interface HttpErrorContext {
  method: string;
  /** Caminho SEM baseUrl. Nunca inclua headers. */
  path: string;
  status: number;
  retryAfter?: string | null;
  body: string;
}

export function mapHttpError(ctx: HttpErrorContext): HermesError {
  const parsed = parseErrorBody(ctx.body);
  const code = parsed.code ?? undefined;
  const msg = parsed.message ?? "";
  const where = `${ctx.method} ${ctx.path} → HTTP ${ctx.status}`;
  const base = {
    technical: `${where}\ncode=${code ?? "-"} type=${parsed.type ?? "-"}\n${parsed.raw}`,
    status: ctx.status,
    code: parsed.code ?? null,
  };
  const parsedRetry = Number.parseInt(ctx.retryAfter ?? "", 10);
  const wait = Number.isFinite(parsedRetry) && parsedRetry > 0 ? parsedRetry : 1;

  switch (ctx.status) {
    case 401:
      return new HermesAuthError({
        ...base,
        userMessage: "A chave do Hermes não foi aceita. Confira a chave nas configurações.",
        recovery: "open_preferences",
      });

    case 403:
      if (parsed.empty) {
        return new HermesOriginBlockedError({
          ...base,
          technical:
            `${where}\nCorpo vazio: o middleware de CORS rejeitou a requisição porque um header ` +
            `Origin foi enviado. Nenhuma requisição deste cliente pode definir Origin.`,
          userMessage: "O Hermes recusou a conexão.",
          recovery: "report_bug",
        });
      }
      return new HermesForbiddenError({ ...base, userMessage: "O Hermes bloqueou esta operação.", recovery: "open_preferences" });

    case 404:
      if (code === "session_not_found")
        return new HermesNotFoundError({ ...base, userMessage: "Esta conversa não existe mais.", recovery: "reload_list" });
      if (code === "run_not_found")
        return new HermesNotFoundError({
          ...base,
          userMessage: "Esta execução não está mais disponível (pode ter expirado ou o Hermes foi reiniciado).",
          recovery: "reload_list",
        });
      if (msg === "Job not found")
        return new HermesNotFoundError({ ...base, userMessage: "Esta automação não existe mais.", recovery: "reload_list" });
      if (msg.includes("Unknown or unconfigured profile"))
        return new HermesNotFoundError({ ...base, userMessage: "O perfil informado não existe neste Hermes.", recovery: "open_preferences" });
      return new HermesNotFoundError({ ...base, userMessage: "Recurso não encontrado no Hermes.", recovery: "report_bug" });

    case 400:
      if (code === "invalid_title")
        return new HermesValidationError({
          ...base,
          userMessage: "Já existe uma conversa com esse título. Escolha outro.",
          recovery: "change_input",
        });
      if (code === "missing_message")
        return new HermesValidationError({ ...base, userMessage: "Escreva uma pergunta antes de enviar.", recovery: "change_input" });
      if (code === "invalid_steer_input")
        return new HermesValidationError({ ...base, userMessage: "Escreva uma orientação antes de enviar.", recovery: "change_input" });
      if (code === "invalid_pagination")
        return new HermesValidationError({
          ...base,
          userMessage: "Não foi possível carregar esta parte do histórico.",
          recovery: "retry",
          retryable: true,
        });
      if (msg.startsWith("Blocked: prompt matches threat pattern"))
        return new HermesValidationError({
          ...base,
          userMessage: "Este texto foi bloqueado por segurança. Reescreva a instrução da automação.",
          recovery: "change_input",
        });
      if (JOB_FIELD_MESSAGES[msg])
        return new HermesValidationError({ ...base, userMessage: JOB_FIELD_MESSAGES[msg], recovery: "change_input" });
      if (code === "unsupported_session_field" || code === "invalid_session_field" || code === "invalid_session_id")
        return new HermesValidationError({
          ...base,
          userMessage: "Não foi possível salvar essa alteração na conversa.",
          recovery: "report_bug",
        });
      return new HermesValidationError({ ...base, userMessage: "O Hermes recusou os dados enviados.", recovery: "change_input" });

    case 409:
      if (code === "session_exists")
        return new HermesConflictError({
          ...base,
          userMessage: "Já existe uma conversa com esse identificador.",
          recovery: "retry",
          retryable: true,
        });
      if (code === "model_lock_unavailable")
        return new HermesConflictError({
          ...base,
          userMessage: "Este modelo não está disponível agora. Escolha outro.",
          recovery: "change_input",
        });
      if (code === "approval_not_active")
        return new HermesConflictError({
          ...base,
          userMessage: "Esta execução não está mais esperando aprovação.",
          recovery: "reload_list",
        });
      if (code === "approval_not_pending")
        return new HermesConflictError({
          ...base,
          userMessage: "Não há nada pendente de aprovação nesta execução.",
          recovery: "reload_list",
        });
      return new HermesConflictError({
        ...base,
        userMessage: "Só é possível orientar enquanto a execução estiver rodando.",
        recovery: "none",
      });

    case 413:
      return new HermesPayloadTooLargeError({
        ...base,
        userMessage: "O conteúdo enviado é grande demais (limite de cerca de 10 MB).",
        recovery: "reduce_size",
      });

    case 424:
      return new HermesJobRegistrationError({
        ...base,
        userMessage: "A automação foi salva, mas não foi agendada. Pause e retome para tentar de novo.",
        recovery: "none",
      });

    case 429:
      return new HermesRateLimitError({
        ...base,
        userMessage: "O Hermes está com execuções demais no momento. Tente em instantes.",
        recovery: "wait_and_retry",
        retryable: true,
        retryAfterSeconds: wait,
      });

    case 501:
      return new HermesNotSupportedError({
        ...base,
        userMessage: "As automações não estão disponíveis nesta instalação do Hermes.",
        recovery: "none",
      });

    case 503:
      if (code === "session_db_unavailable")
        return new HermesUnavailableError({
          ...base,
          userMessage: "O banco de conversas do Hermes não está acessível.",
          recovery: "start_hermes",
          retryable: true,
        });
      return new HermesUnavailableError({
        ...base,
        userMessage: "O Hermes está finalizando tarefas. Tente novamente em instantes.",
        recovery: "wait_and_retry",
        retryable: true,
        retryAfterSeconds: wait,
      });

    default:
      if (ctx.status >= 500) {
        if (msg.includes("Invalid schedule"))
          return new HermesScheduleError({
            ...base,
            userMessage:
              "A recorrência informada não é válida. Exemplos aceitos: 'every 30m', '0 9 * * *', '2h', '2026-06-01T09:00:00'.",
            recovery: "change_input",
          });
        if (code === "model_lock_persistence_failed")
          return new HermesServerError({
            ...base,
            userMessage: "Não foi possível fixar o modelo desta conversa.",
            recovery: "retry",
            retryable: true,
          });
        if (code === "model_options_failed")
          return new HermesServerError({ ...base, userMessage: "Não foi possível listar os modelos.", recovery: "retry", retryable: true });
        if (code === "agent_incomplete")
          return new HermesServerError({
            ...base,
            userMessage: "O Hermes não conseguiu concluir a resposta.",
            recovery: "retry",
            retryable: true,
          });
        return new HermesServerError({ ...base, userMessage: "O Hermes encontrou um erro interno.", recovery: "retry", retryable: true });
      }
      return new HermesProtocolError({ ...base, userMessage: "Resposta inesperada do Hermes.", recovery: "report_bug" });
  }
}

/* ────────────────────── Erros de rede / cancelamento ────────────────────── */

/** Converte QUALQUER exceção (inclusive de fetch) num HermesError. */
export function toHermesError(err: unknown, context = ""): HermesError {
  if (err instanceof HermesError) return err;

  const e = err as { name?: string; message?: string; code?: string; cause?: { code?: string } };
  const nodeCode = e?.code ?? e?.cause?.code;
  const detail = `${context}\n${e?.name ?? "Error"}: ${e?.message ?? String(err)}${nodeCode ? `\ncode=${nodeCode}` : ""}`;

  if (e?.name === "TimeoutError")
    return new HermesTimeoutError({
      userMessage: "O Hermes demorou demais para responder.",
      technical: detail,
      recovery: "retry",
      retryable: true,
      cause: err,
    });

  if (e?.name === "AbortError")
    return new HermesAbortError({ userMessage: "Operação cancelada.", technical: detail, recovery: "none", cause: err });

  if (
    nodeCode === "ECONNREFUSED" ||
    nodeCode === "ECONNRESET" ||
    nodeCode === "ENOTFOUND" ||
    nodeCode === "EHOSTUNREACH" ||
    nodeCode === "UND_ERR_SOCKET" ||
    nodeCode === "UND_ERR_CONNECT_TIMEOUT"
  )
    return new HermesConnectionError({
      userMessage: "Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo.",
      technical: detail,
      recovery: "start_hermes",
      retryable: true,
      cause: err,
    });

  return new HermesProtocolError({
    userMessage: "Resposta inesperada do Hermes.",
    technical: detail,
    recovery: "report_bug",
    cause: err,
  });
}

/** true quando o erro deve ser silenciosamente ignorado (desmontagem do comando). */
export function isAbort(err: unknown): boolean {
  return err instanceof HermesAbortError || (err as { name?: string })?.name === "AbortError";
}
```

### 4.4 Regra de apresentação (obrigatória)

```tsx
const e = toHermesError(err, "listSessions");
await showToast({ style: Toast.Style.Failure, title: e.userMessage });
// e SOMENTE dentro de um ActionPanel:
<Action.CopyToClipboard title="Copiar detalhes técnicos" content={e.technical} />
```

Nunca renderize `e.message` cru, nunca renderize o corpo HTTP, nunca inclua headers em lugar nenhum.

---

## 5. `preferences.ts` (+ o bloco `preferences` do manifest)

### 5.1 Bloco a colar em `package.json` (nível da extensão)

> **Fonte única de verdade das preferências.** Este bloco manda; a tabela da UX-SPEC §1.4 só descreve
> os textos visíveis destes mesmos campos. Se divergirem, este bloco vence.
>
> **Todas as preferências têm `"required": false`** — inclusive `apiServerKey`. Com `required: true`
> o Raycast intercepta o comando numa tela nativa de preenchimento **antes** do nosso onboarding, o
> que mataria a tela `SemConfiguracao` (UX-SPEC §3.4) e a sequência de §13 (`isConfigured() === false
> → tela de boas-vindas`). A obrigatoriedade é aplicada por nós, em código, com mensagem em pt-BR.

```json
"preferences": [
  {
    "name": "apiServerKey",
    "title": "Chave do Hermes",
    "description": "Chave local do Hermes API Server (API_SERVER_KEY). Ela fica no arquivo .env da sua instalação do Hermes. Nunca é enviada para fora do seu computador.",
    "type": "password",
    "required": false
  },
  {
    "name": "apiUrl",
    "title": "Endereço do Hermes",
    "description": "Deixe em branco para detectar automaticamente. Preencha apenas se o seu Hermes usa outra porta.",
    "type": "textfield",
    "required": false,
    "placeholder": "Detectar automaticamente"
  },
  {
    "name": "sessionKey",
    "title": "Escopo de memória",
    "description": "Identificador estável usado pelo Hermes para separar a memória de longo prazo desta origem. Em branco, a extensão usa o padrão do seu sistema: raycast:windows:default no Windows e raycast:macos:default no macOS.",
    "type": "textfield",
    "required": false,
    "placeholder": "Padrão do sistema"
  },
  {
    "name": "defaultProvider",
    "title": "Provedor padrão",
    "description": "Opcional. Provedor usado quando você não escolhe outro na hora.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "defaultModel",
    "title": "Modelo padrão",
    "description": "Opcional. Modelo usado quando você não escolhe outro na hora.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "streamResponses",
    "title": "Respostas",
    "label": "Mostrar a resposta enquanto o Hermes escreve",
    "description": "Desligue se preferir receber a resposta apenas quando estiver completa.",
    "type": "checkbox",
    "required": false,
    "default": true
  },
  {
    "name": "maxHistoryItems",
    "title": "Itens por página",
    "description": "Quantas conversas carregar de uma vez nas listas.",
    "type": "dropdown",
    "required": false,
    "default": "50",
    "data": [
      { "title": "25", "value": "25" },
      { "title": "50", "value": "50" },
      { "title": "100", "value": "100" },
      { "title": "200", "value": "200" }
    ]
  }
]
```

Notas obrigatórias sobre o schema (verificado): há exatamente 7 tipos
(`textfield, password, checkbox, dropdown, appPicker, file, directory`); `checkbox` **exige** `label`
e aceita `title: ""`; `dropdown` **exige** `data` com `{title,value}`; `description` tem 8–1024 chars.
Não existe `Action.OpenExtensionPreferences` — use `<Action title="Abrir configurações"
onAction={openExtensionPreferences} />`.

### 5.2 Código

```ts
import { getPreferenceValues } from "@raycast/api";
import { HermesNotConfiguredError } from "./errors";

/** Gerado em raycast-env.d.ts a partir do manifest; redeclarado aqui para clareza. */
interface RawPreferences {
  /** Opcional no tipo gerado: `required: false` e sem `default` ⇒ o campo sai como `?`. */
  apiServerKey?: string;
  apiUrl?: string;
  sessionKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  streamResponses: boolean;
  maxHistoryItems?: string;
}

export interface HermesPreferences {
  /** NUNCA logar, nunca serializar, nunca colocar em erro. */
  apiServerKey: string;
  /** undefined ⇒ usar auto-descoberta. Já normalizado (sem barra final, localhost → 127.0.0.1). */
  apiUrl?: string;
  /** Sempre preenchido; em branco cai em `defaultSessionKey()`, que é por sistema. Máx. 256 chars. */
  sessionKey: string;
  defaultProvider?: string;
  defaultModel?: string;
  streamResponses: boolean;
  /** Inteiro 1..200. */
  maxHistoryItems: number;
}

/**
 * Normaliza uma base URL do Hermes.
 * - remove barras finais
 * - substitui "localhost" por "127.0.0.1" (a porta 8642 é IPv4-only; Node pode resolver ::1)
 * - assume http:// quando o usuário digita só "127.0.0.1:8642"
 */
export function normalizeBaseUrl(input: string): string | undefined {
  const raw = input.trim();
  if (raw === "") return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return undefined;
  }
  if (url.hostname === "localhost" || url.hostname === "::1" || url.hostname === "[::1]") {
    url.hostname = "127.0.0.1";
  }
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`.replace(/\/+$/, "");
}

export function getHermesPreferences(): HermesPreferences {
  const raw = getPreferenceValues<RawPreferences>();
  const parsedLimit = Number.parseInt(raw.maxHistoryItems ?? "50", 10);
  const maxHistoryItems = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

  return {
    apiServerKey: (raw.apiServerKey ?? "").trim(),
    apiUrl: raw.apiUrl ? normalizeBaseUrl(raw.apiUrl) : undefined,
    sessionKey: (raw.sessionKey?.trim() || defaultSessionKey()).slice(0, 256),
    defaultProvider: raw.defaultProvider?.trim() || undefined,
    defaultModel: raw.defaultModel?.trim() || undefined,
    streamResponses: raw.streamResponses !== false,
    maxHistoryItems,
  };
}

export function isConfigured(): boolean {
  return getHermesPreferences().apiServerKey.length > 0;
}

/** Chame no topo de todo comando que fala com o Hermes. */
export function requireApiKey(): string {
  const key = getHermesPreferences().apiServerKey;
  if (key.length === 0) {
    throw new HermesNotConfiguredError({
      userMessage: "Conecte o Raycast ao Hermes: informe a chave do API Server.",
      technical: "Preferência apiServerKey vazia.",
      recovery: "open_preferences",
    });
  }
  return key;
}
```

**Regras invioláveis:**

- `apiServerKey` só sai deste módulo para o header `Authorization` dentro de `hermes-api.ts`.
- O header `X-Hermes-Session-Key` recebe `sessionKey` **somente** nas rotas que o leem
  (`/api/sessions/{id}/chat`, `/api/sessions/{id}/chat/stream`, `POST /v1/runs`). O servidor rejeita
  `\r`, `\n`, `\0` (400) e >256 chars (400) — o `.slice(0, 256)` acima cobre o comprimento; os
  caracteres de controle nunca aparecem em preferências digitadas, mas o cliente ainda assim filtra
  (§7.2).

---

## 6. `discovery.ts`

### 6.1 Algoritmo (ordem exata)

```text
S0  Preferência apiUrl preenchida?
      sim → probe /health nessa URL.
             platform === "hermes-agent"  → PRONTO (source: "preference")
             platform === outro           → HermesWrongServerError (ex.: apontou para 8644)
             sem resposta                 → HermesConnectionError
             *** nunca cai para descoberta automática: escolha explícita do usuário manda ***
      não → S1

S1  Cache em LocalStorage válido? (mesmo gateway pid + start_time, < 12 h)
      sim → probe rápido (600 ms). OK → PRONTO (source: "cache"). Falhou → invalida e segue.

S2  Resolver HERMES_HOME:
      process.env.HERMES_HOME
      || readJSON(<pasta padrão>/gateway.pid).hermes_home
      || <pasta padrão>

      <pasta padrão> = Windows: path.join(%LOCALAPPDATA% ?? ~/AppData/Local, "hermes")
                       macOS:   path.join(~, ".hermes")

S3  Lista ordenada de portas candidatas (deduplicada, na ordem):
      a) config.yaml → primeira que existir entre:
             platforms.api_server.extra.port
             platforms.api_server.port
             gateway.platforms.api_server.extra.port
             gateway.api_server.port
      b) process.env.API_SERVER_PORT
      c) <HERMES_HOME>\.env  → linha API_SERVER_PORT   (só se (a) e (b) falharem)
      d) 8642                                          (default do adaptador)

S4  Para cada candidata: GET http://127.0.0.1:<porta>/health  (1500 ms, sem auth, SEM Origin)
      aceita SOMENTE se  res.ok && json.status === "ok" && json.platform === "hermes-agent"

S5  Nenhuma passou?
      probe 8644: se responder com platform "webhook" → HermesWrongServerError com dica precisa
      senão → HermesConnectionError ("Hermes API Server não está ativo")

S6  Gravar cache {baseUrl, version, gatewayPid, gatewayStartTime, checkedAt} em LocalStorage.
```

**Host é SEMPRE a string literal `127.0.0.1`.** Nunca `localhost`: 8642 escuta somente IPv4 e o
Node pode resolver `localhost` para `::1` e falhar com `ECONNREFUSED` mesmo com o servidor no ar.

**Nunca enviar header `Origin`.** O `fetch` do Node não envia por padrão — basta não adicionar.

**Por que não adicionar dependência de YAML.** Precisamos de **um único escalar inteiro** de um
arquivo de ~15 KB cujo formato relevante é sempre `chave: valor` indentado com espaços. Um scanner
sensível a indentação (abaixo, ~50 linhas) resolve os 4 caminhos equivalentes e degrada para
`undefined` em qualquer construção que não entenda (âncoras, escalares multilinha, listas). Como o
gate `/health` é a autoridade final, um falso negativo custa no máximo uma tentativa extra na porta
8642 — enquanto uma dependência custa bundle, superfície de supply-chain e contraria a regra
"evitar dependências quando a API nativa resolver". Também tratamos o caso de mapeamento em fluxo
(`extra: {port: 8642}`) com um regex direcionado.

### 6.2 Código

```ts
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { HermesConnectionError, HermesWrongServerError, toHermesError } from "./errors";
import { getHermesPreferences } from "./preferences";
import { readJson, writeJson, StorageKeys } from "./storage";
import type { HealthResponse } from "./types";

export const DEFAULT_PORT = 8642;
const WEBHOOK_PORT = 8644;
const PROBE_TIMEOUT_MS = 1500;
const CACHE_PROBE_TIMEOUT_MS = 600;
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type EndpointSource = "preference" | "cache" | "config" | "env" | "dotenv" | "default";

export interface ResolvedEndpoint {
  /** Ex.: "http://127.0.0.1:8642" — sem barra final. */
  baseUrl: string;
  version: string;
  source: EndpointSource;
}

interface CachedEndpoint extends ResolvedEndpoint {
  gatewayPid?: number;
  gatewayStartTime?: number;
  checkedAt: number;
}

/** Injeção de dependências — só para testes. Em produção fica tudo undefined. */
export interface DiscoveryDeps {
  env?: NodeJS.ProcessEnv;
  readTextFile?: (filePath: string) => Promise<string | undefined>;
  probe?: (baseUrl: string, timeoutMs: number) => Promise<HealthResponse | undefined>;
}

let memo: ResolvedEndpoint | undefined;

/* ─────────────────────────── Probe /health ─────────────────────────── */

/** Devolve o corpo de /health seja qual for a plataforma; undefined se não respondeu. */
export async function probeHealth(baseUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<HealthResponse | undefined> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" }, // NUNCA Origin
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as Partial<HealthResponse>;
    if (typeof json?.status !== "string" || typeof json?.platform !== "string") return undefined;
    return { status: json.status, platform: json.platform, version: json.version ?? "desconhecida" };
  } catch {
    return undefined;
  }
}

export function isHermesAgent(health: HealthResponse | undefined): boolean {
  return health?.status === "ok" && health.platform === "hermes-agent";
}

/* ───────────────────── Leitura de arquivos do Hermes ───────────────── */

async function readTextSafe(filePath: string, deps?: DiscoveryDeps): Promise<string | undefined> {
  if (deps?.readTextFile) return deps.readTextFile(filePath);
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export function resolveLocalAppData(env: NodeJS.ProcessEnv = process.env, homeDir = homedir()): string {
  const localAppData = (env.LOCALAPPDATA ?? "").trim();
  return localAppData !== "" ? localAppData : path.win32.join(homeDir, "AppData", "Local");
}

/**
 * A pasta padrão da plataforma. `path.win32`/`path.posix` explícitos para que o resultado
 * não dependa da máquina que roda o teste.
 */
export function defaultHermesHome(context: DefaultHermesHomeContext = {}): string {
  const env = context.env ?? process.env;
  const platform = context.platform ?? process.platform;
  const home = context.homeDir ?? homedir();

  if (platform === "win32") return path.win32.join(resolveLocalAppData(env, home), "hermes");
  return path.posix.join(home, ".hermes");
}

/** HERMES_HOME → gateway.pid.hermes_home → pasta padrão da plataforma */
export async function resolveHermesHome(deps?: DiscoveryDeps): Promise<string> {
  const env = deps?.env ?? process.env;
  const fromEnv = (env.HERMES_HOME ?? "").trim();
  if (fromEnv !== "") return fromEnv;

  const fallback = defaultHermesHome({ env, platform: deps?.platform, homeDir: deps?.homeDir });
  const pidRaw = await readTextSafe(path.join(fallback, "gateway.pid"), deps);
  if (pidRaw) {
    try {
      const parsed = JSON.parse(pidRaw) as { hermes_home?: unknown };
      if (typeof parsed.hermes_home === "string" && parsed.hermes_home.trim() !== "") return parsed.hermes_home;
    } catch {
      /* arquivo corrompido: ignora */
    }
  }
  return fallback;
}

/** Identidade do gateway, usada como chave de invalidação do cache. */
export async function readGatewayIdentity(
  hermesHome: string,
  deps?: DiscoveryDeps,
): Promise<{ pid?: number; startTime?: number }> {
  const raw = await readTextSafe(path.join(hermesHome, "gateway.pid"), deps);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown; start_time?: unknown };
    return {
      pid: typeof parsed.pid === "number" ? parsed.pid : undefined,
      startTime: typeof parsed.start_time === "number" ? parsed.start_time : undefined,
    };
  } catch {
    return {};
  }
}

/* ───────────────── Scanner YAML mínimo (sem dependência) ──────────── */

interface YamlNode {
  value?: string;
  children: Map<string, YamlNode>;
}

/**
 * Constrói uma árvore a partir de linhas `chave: valor` indentadas por espaços.
 * Ignora comentários, linhas em branco, itens de lista e qualquer coisa que não case.
 * NÃO suporta âncoras, escalares multilinha nem listas — o que é aceitável porque
 * o gate /health é a autoridade final.
 */
export function parseSimpleYaml(text: string): YamlNode {
  const root: YamlNode = { children: new Map() };
  const stack: Array<{ indent: number; node: YamlNode }> = [{ indent: -1, node: root }];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, " ");
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("- ")) continue;

    const match = /^(\s*)([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2];
    const value = match[3].replace(/\s+#.*$/, "").trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();

    const node: YamlNode = { children: new Map() };
    if (value !== "") node.value = value;
    stack[stack.length - 1].node.children.set(key, node);
    stack.push({ indent, node });
  }
  return root;
}

function yamlLookup(root: YamlNode, dotted: string): YamlNode | undefined {
  let node: YamlNode | undefined = root;
  for (const segment of dotted.split(".")) {
    node = node?.children.get(segment);
    if (!node) return undefined;
  }
  return node;
}

function coercePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/^['"]|['"]$/g, "").trim();
  const port = Number.parseInt(cleaned, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

/** Os 4 caminhos que o Hermes considera equivalentes, na ordem de precedência. */
const CONFIG_PORT_PATHS = [
  "platforms.api_server.extra.port",
  "platforms.api_server.port",
  "gateway.platforms.api_server.extra.port",
  "gateway.api_server.port",
] as const;

export function extractConfigPort(yamlText: string): number | undefined {
  const root = parseSimpleYaml(yamlText);
  for (const dotted of CONFIG_PORT_PATHS) {
    const port = coercePort(yamlLookup(root, dotted)?.value);
    if (port !== undefined) return port;
  }
  // Mapeamento em fluxo: `extra: {host: 127.0.0.1, port: 8642}`
  for (const dotted of ["platforms.api_server.extra", "gateway.platforms.api_server.extra"]) {
    const inline = yamlLookup(root, dotted)?.value;
    if (inline?.startsWith("{")) {
      const flow = /(?:^|[{,\s])port\s*:\s*(\d{1,5})/.exec(inline);
      const port = coercePort(flow?.[1]);
      if (port !== undefined) return port;
    }
  }
  return undefined;
}

/**
 * Extrai SOMENTE a linha API_SERVER_PORT do .env.
 * SEGURANÇA: esta função nunca devolve, loga ou propaga qualquer outra linha do arquivo.
 * Mesma disciplina de parsing do Hermes: ignora vazias/#, remove `export `, usa o PRIMEIRO `=`.
 */
export function extractDotenvPort(dotenvText: string): number | undefined {
  for (const rawLine of dotenvText.split(/\r?\n/)) {
    const line = rawLine.replace(/^﻿/, "").trim();
    if (line === "" || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    if (withoutExport.slice(0, eq).trim() !== "API_SERVER_PORT") continue;
    const value = withoutExport.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    return coercePort(value);
  }
  return undefined;
}

/* ──────────────────────── Portas candidatas ───────────────────────── */

export interface PortCandidate {
  port: number;
  source: EndpointSource;
}

export async function buildPortCandidates(hermesHome: string, deps?: DiscoveryDeps): Promise<PortCandidate[]> {
  const env = deps?.env ?? process.env;
  const candidates: PortCandidate[] = [];

  const configText = await readTextSafe(path.join(hermesHome, "config.yaml"), deps);
  const configPort = configText ? extractConfigPort(configText) : undefined;
  if (configPort !== undefined) candidates.push({ port: configPort, source: "config" });

  const envPort = coercePort(env.API_SERVER_PORT);
  if (envPort !== undefined) candidates.push({ port: envPort, source: "env" });

  if (configPort === undefined && envPort === undefined) {
    const dotenvText = await readTextSafe(path.join(hermesHome, ".env"), deps);
    const dotenvPort = dotenvText ? extractDotenvPort(dotenvText) : undefined;
    if (dotenvPort !== undefined) candidates.push({ port: dotenvPort, source: "dotenv" });
  }

  candidates.push({ port: DEFAULT_PORT, source: "default" });

  const seen = new Set<number>();
  return candidates.filter((c) => (seen.has(c.port) ? false : (seen.add(c.port), true)));
}

/* ─────────────────────────── Resolução ────────────────────────────── */

export async function resolveBaseUrl(options?: { force?: boolean; deps?: DiscoveryDeps }): Promise<ResolvedEndpoint> {
  const deps = options?.deps;
  const probe = deps?.probe ?? probeHealth;

  if (!options?.force && memo) return memo;

  // S0 — preferência explícita vence e não tem fallback.
  const { apiUrl } = getHermesPreferences();
  if (apiUrl) {
    const health = await probe(apiUrl, PROBE_TIMEOUT_MS);
    if (isHermesAgent(health)) {
      memo = { baseUrl: apiUrl, version: health!.version, source: "preference" };
      return memo;
    }
    if (health) {
      throw new HermesWrongServerError({
        userMessage: "O endereço configurado não é o Hermes API Server.",
        technical: `GET ${apiUrl}/health respondeu platform="${health.platform}". Esperado "hermes-agent". A porta 8644 é o adaptador de webhook.`,
        recovery: "open_preferences",
      });
    }
    throw new HermesConnectionError({
      userMessage: "Não foi possível conectar ao Hermes no endereço configurado.",
      technical: `GET ${apiUrl}/health não respondeu em ${PROBE_TIMEOUT_MS} ms.`,
      recovery: "open_preferences",
      retryable: true,
    });
  }

  const hermesHome = await resolveHermesHome(deps);
  const identity = await readGatewayIdentity(hermesHome, deps);

  // S1 — cache
  if (!options?.force) {
    const cached = await readJson<CachedEndpoint>(StorageKeys.endpointCache);
    const fresh =
      cached &&
      Date.now() - cached.checkedAt < CACHE_MAX_AGE_MS &&
      cached.gatewayPid === identity.pid &&
      cached.gatewayStartTime === identity.startTime;
    if (fresh) {
      const health = await probe(cached.baseUrl, CACHE_PROBE_TIMEOUT_MS);
      if (isHermesAgent(health)) {
        memo = { baseUrl: cached.baseUrl, version: health!.version, source: "cache" };
        return memo;
      }
    }
  }

  // S2..S4
  const candidates = await buildPortCandidates(hermesHome, deps);
  for (const candidate of candidates) {
    const baseUrl = `http://127.0.0.1:${candidate.port}`;
    const health = await probe(baseUrl, PROBE_TIMEOUT_MS);
    if (isHermesAgent(health)) {
      memo = { baseUrl, version: health!.version, source: candidate.source };
      await writeJson<CachedEndpoint>(StorageKeys.endpointCache, {
        ...memo,
        gatewayPid: identity.pid,
        gatewayStartTime: identity.startTime,
        checkedAt: Date.now(),
      });
      return memo;
    }
  }

  // S5 — diagnóstico preciso
  const webhook = await probe(`http://127.0.0.1:${WEBHOOK_PORT}`, PROBE_TIMEOUT_MS);
  if (webhook && webhook.platform !== "hermes-agent") {
    throw new HermesWrongServerError({
      userMessage: "O Hermes está rodando, mas o API Server não respondeu.",
      technical:
        `Portas testadas: ${candidates.map((c) => `${c.port} (${c.source})`).join(", ")}. ` +
        `A porta ${WEBHOOK_PORT} respondeu com platform="${webhook.platform}" (adaptador de webhook, não é o API Server). ` +
        `Verifique platforms.api_server em ${path.join(hermesHome, "config.yaml")}.`,
      recovery: "open_preferences",
    });
  }
  throw new HermesConnectionError({
    userMessage: "Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo.",
    technical: `HERMES_HOME=${hermesHome}. Portas testadas: ${candidates.map((c) => `${c.port} (${c.source})`).join(", ")}.`,
    recovery: "start_hermes",
    retryable: true,
  });
}

/** Chamar sempre que uma requisição falhar com erro de conexão. */
export async function invalidateBaseUrl(): Promise<void> {
  memo = undefined;
  await writeJson(StorageKeys.endpointCache, undefined);
}

/** Só para a tela "Verificar conexão": devolve o diagnóstico sem lançar. */
export async function diagnose(): Promise<
  { ok: true; endpoint: ResolvedEndpoint } | { ok: false; error: ReturnType<typeof toHermesError> }
> {
  try {
    return { ok: true, endpoint: await resolveBaseUrl({ force: true }) };
  } catch (err) {
    return { ok: false, error: toHermesError(err, "resolveBaseUrl") };
  }
}
```

### 6.3 Deep link para o Desktop (função pura, mora aqui)

```ts
/**
 * hermes://open/<sessionId> foca aquela conversa num Hermes Desktop já aberto.
 * Restrições do parser do Desktop: o id não pode conter "/", "\", ":" nem "..".
 * Ids do api_server (api_<epoch>_<8hex>) e do Desktop (8 hex) satisfazem tudo isso.
 * A UI chama `open(hermesDesktopSessionUrl(id))` de @raycast/api.
 */
export function hermesDesktopSessionUrl(sessionId: string): string | undefined {
  if (sessionId === "" || /[\\/:]/.test(sessionId) || sessionId.includes("..")) return undefined;
  return `hermes://open/${encodeURIComponent(sessionId)}`;
}
```

---

## 7. `hermes-api.ts`

### 7.1 Regras do transporte

| Regra | Motivo |
|---|---|
| Host literal `127.0.0.1` (vem de `discovery.ts`) | 8642 escuta só IPv4 |
| **Nunca** header `Origin` | 403 de corpo vazio, antes da autenticação |
| Só `Authorization: Bearer <key>` | Não existe `X-Api-Key`, `?api_key=`, Basic nem cookie. Prefixo `Bearer ` é case-sensitive |
| `Content-Type: application/json` só quando há corpo | — |
| `X-Hermes-Session-Key` só em `/api/sessions/{id}/chat[/stream]` e `POST /v1/runs` | Únicas rotas que o leem |
| `X-Hermes-Session-Id` **nunca** | Não é lido nas rotas que usamos |
| `Idempotency-Key` **nunca** | Só é honrado em `/v1/chat/completions` e `/v1/responses`, que não usamos (D3) |
| Timeout de streams cobre só o *time-to-headers* | Um run pode durar minutos; abortar por tempo total mataria o turno |
| `ECONNREFUSED` ⇒ `invalidateBaseUrl()` e um único re-resolve | O gateway pode ter reiniciado em outra porta |
| 429/503 ⇒ um único retry após `Retry-After` (máx. 5 s), somente em GET | Idempotência: nunca repetir POST automaticamente |
| Corpo máximo 10 MB | 413 `body_too_large` |

### 7.2 Wrapper base

```ts
import { randomUUID } from "node:crypto";
import { invalidateBaseUrl, resolveBaseUrl } from "./discovery";
import { HermesConnectionError, HermesProtocolError, mapHttpError, toHermesError } from "./errors";
import { getHermesPreferences, requireApiKey } from "./preferences";
import type * as T from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;
/** Turno síncrono: o agente pode levar minutos. */
const CHAT_TIMEOUT_MS = 300_000;
/** /v1/toolsets resolve 27+ toolsets no event loop do servidor — é lento. */
const SLOW_TIMEOUT_MS = 30_000;
/** Só até os headers chegarem; depois o corpo pode fluir indefinidamente. */
const STREAM_HEADERS_TIMEOUT_MS = 20_000;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  /** Caminho absoluto começando com "/". */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Serializado com JSON.stringify quando definido. */
  body?: unknown;
  /** AbortSignal do componente (desmontagem/botão Parar). */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Envia X-Hermes-Session-Key. Só nas rotas que o leem. */
  withSessionKey?: boolean;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(baseUrl + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Remove caracteres que o servidor rejeita com 400 e corta em 256. */
function safeSessionKey(raw: string): string {
  return raw.replace(/[\r\n\0]/g, "").slice(0, 256);
}

function buildHeaders(key: string, options: RequestOptions, accept: string): Headers {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Accept", accept);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.withSessionKey) {
    const sessionKey = safeSessionKey(getHermesPreferences().sessionKey);
    if (sessionKey !== "") headers.set("X-Hermes-Session-Key", sessionKey);
  }
  // PROIBIDO: Origin, Cookie, X-Hermes-Session-Id.
  return headers;
}

function linkSignals(internal: AbortSignal, external?: AbortSignal): AbortSignal {
  return external ? AbortSignal.any([internal, external]) : internal;
}

/** Executa a requisição e devolve o Response cru, já com o erro HTTP mapeado. */
async function rawRequest(options: RequestOptions, accept: string, headersOnlyTimeout: boolean): Promise<Response> {
  const key = requireApiKey();
  const endpoint = await resolveBaseUrl();
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? (headersOnlyTimeout ? STREAM_HEADERS_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint.baseUrl, options.path, options.query), {
      method,
      headers: buildHeaders(key, options, accept),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: linkSignals(controller.signal, options.signal),
      // Sem `mode`, sem `credentials`, sem `referrer`: são conceitos de browser e
      // qualquer polyfill que os traduza em Origin quebraria tudo.
    });
  } catch (err) {
    clearTimeout(timer);
    const mapped = toHermesError(err, `${method} ${options.path}`);
    if (mapped instanceof HermesConnectionError) await invalidateBaseUrl();
    throw mapped;
  }

  if (headersOnlyTimeout) clearTimeout(timer);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (!headersOnlyTimeout) clearTimeout(timer);
    throw mapHttpError({
      method,
      path: options.path,
      status: response.status,
      retryAfter: response.headers.get("Retry-After"),
      body,
    });
  }

  if (!headersOnlyTimeout) {
    // O timer segue armado até o corpo ser lido por requestJson().
    (response as Response & { __timer?: NodeJS.Timeout }).__timer = timer;
  }
  return response;
}

/** Requisição JSON. Faz UM retry em 429/503 quando o método é GET. */
export async function requestJson<TResult>(options: RequestOptions): Promise<TResult> {
  const method = options.method ?? "GET";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await rawRequest(options, "application/json", false);
      const timer = (response as Response & { __timer?: NodeJS.Timeout }).__timer;
      try {
        const text = await response.text();
        if (text.trim() === "") return undefined as TResult;
        try {
          return JSON.parse(text) as TResult;
        } catch {
          throw new HermesProtocolError({
            userMessage: "Resposta inesperada do Hermes.",
            technical: `${method} ${options.path} devolveu HTTP ${response.status} com corpo não-JSON: ${text.slice(0, 500)}`,
            recovery: "report_bug",
          });
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (err) {
      const retryable =
        attempt === 0 &&
        method === "GET" &&
        (err as { status?: number })?.status !== undefined &&
        [429, 503].includes((err as { status: number }).status);
      if (!retryable) throw err;
      const seconds = (err as { retryAfterSeconds?: number }).retryAfterSeconds ?? 1;
      await new Promise((resolve) => setTimeout(resolve, Math.min(seconds, 5) * 1000));
    }
  }
  /* inalcançável */
  throw new HermesProtocolError({ userMessage: "Resposta inesperada do Hermes.", technical: "retry loop", recovery: "report_bug" });
}

/**
 * Abre um stream SSE. Devolve o Response com o corpo ainda intacto — quem consome é
 * hermes-events.ts. Erros ANTES do stream abrir chegam aqui como HermesError (JSON comum);
 * erros DEPOIS chegam como eventos dentro do stream, com HTTP 200.
 */
export async function requestStream(options: RequestOptions): Promise<Response> {
  const response = await rawRequest({ ...options, method: options.method ?? "POST" }, "text/event-stream", true);
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new HermesProtocolError({
      userMessage: "Resposta inesperada do Hermes.",
      technical: `${options.method ?? "POST"} ${options.path} deveria devolver text/event-stream, veio "${contentType}".`,
      recovery: "report_bug",
    });
  }
  if (!response.body) {
    throw new HermesProtocolError({
      userMessage: "Resposta inesperada do Hermes.",
      technical: `${options.path}: response.body é null.`,
      recovery: "report_bug",
    });
  }
  return response;
}
```

### 7.3 Diagnóstico e capacidades

```ts
/**
 * GET /health/detailed (COM auth — ao contrário de /health).
 * FASE 2 / opcional: nenhuma tela do MVP consome isto (a §2.7 da UX-SPEC usa /health,
 * /v1/models, /v1/capabilities e /api/sessions?limit=1). Só implemente se alguma tela pedir.
 */
export function getHealthDetailed(signal?: AbortSignal): Promise<HealthDetailedResponse> {
  return requestJson<HealthDetailedResponse>({ path: "/health/detailed", signal });
}

export interface HealthDetailedResponse {
  status: string;
  readiness?: { status: string; checks?: Record<string, { status: string; [k: string]: unknown }> };
  platform: string;
  version: string;
  gateway_state?: string;
  platforms?: Record<string, { state: string; error_code: string | null; error_message: string | null; updated_at: string | null }>;
  active_agents?: number;
  gateway_busy?: boolean;
  gateway_drainable?: boolean;
  exit_reason?: string | null;
  updated_at?: string | null;
  pid?: number;
}

/** GET /v1/capabilities. Um 401 aqui significa CHAVE ERRADA — é o teste de chave canônico. */
export function getCapabilities(signal?: AbortSignal): Promise<T.Capabilities> {
  return requestJson<T.Capabilities>({ path: "/v1/capabilities", signal });
}

/** Feature-detection tolerante: chave ausente ⇒ trata como indisponível. */
export function hasFeature(caps: T.Capabilities | undefined, feature: keyof T.HermesFeatures): boolean {
  return caps?.features?.[feature] === true;
}

/** Existe endpoint com este nome no mapa `endpoints`? (jobs/toolsets não têm flag em `features`.) */
export function hasEndpoint(caps: T.Capabilities | undefined, name: string): boolean {
  return Boolean(caps?.endpoints?.[name]);
}
```

### 7.4 Modelos

```ts
export function listModels(signal?: AbortSignal): Promise<T.ModelListResponse> {
  return requestJson<T.ModelListResponse>({ path: "/v1/models", signal });
}

/** GET /api/model/options. `refresh=true` re-sonda TODOS os provedores: é lento, use só sob ação explícita. */
export function getModelOptions(refresh = false, signal?: AbortSignal): Promise<T.ModelOptionsResponse> {
  return requestJson<T.ModelOptionsResponse>({
    path: "/api/model/options",
    query: refresh ? { refresh: "true" } : undefined,
    timeoutMs: SLOW_TIMEOUT_MS,
    signal,
  });
}

/** Achata providers × models numa lista pronta para o seletor. */
export function flattenModelOptions(payload: T.ModelOptionsResponse): T.ModelOption[] {
  const out: T.ModelOption[] = [];
  for (const provider of payload.providers ?? []) {
    const featured = new Set(provider.featured_models ?? []);
    for (const model of provider.models ?? []) {
      const caps = provider.capabilities?.[model];
      out.push({
        provider: provider.slug,
        providerName: provider.name,
        model,
        fast: caps?.fast ?? false,
        reasoning: caps?.reasoning ?? false,
        pricing: provider.pricing?.[model],
        authenticated: provider.authenticated !== false,
        isCurrent: provider.is_current === true && payload.model === model,
        isFeatured: featured.has(model),
      });
    }
  }
  return out;
}

/** Provedores sem credencial (linhas "esqueleto"): mostrar em seção separada, com `warning`. */
export function unconfiguredProviders(payload: T.ModelOptionsResponse): T.ProviderOption[] {
  return (payload.providers ?? []).filter((p) => p.authenticated === false);
}
```

**Contrato importante:** `capabilities` traz **apenas** `fast` e `reasoning`. Não existem
`context_window`, `supports_vision`, `supports_tools` nem `max_output_tokens` neste endpoint —
não prometa isso na UI. `pricing` são strings já formatadas (`"$3.00"`, `"free"`), nunca números.
Enviar `model: "hermes-agent"` (o alias virtual de `/v1/models`) significa "usar o padrão do
gateway" e o valor **não é persistido** na sessão.

### 7.5 Sessões (CRUD)

```ts
/** R3: constante, nunca configurável. */
export const RAYCAST_SESSION_SOURCE: T.SessionSourceInput = "desktop";

/**
 * Id legível e compatível com R7 e com o deep link do Desktop:
 * sem "/", "\", ":" nem "..", ≤ 256 chars, e reconhecível como vindo do Raycast.
 */
export function newSessionId(): string {
  return `raycast_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  source?: string;
  includeChildren?: boolean;
  signal?: AbortSignal;
}

export function listSessions(params: ListSessionsParams = {}): Promise<T.SessionListResponse> {
  const limit = Math.min(Math.max(params.limit ?? getHermesPreferences().maxHistoryItems, 1), 200);
  return requestJson<T.SessionListResponse>({
    path: "/api/sessions",
    query: {
      limit,
      offset: params.offset ?? 0,
      source: params.source,
      include_children: params.includeChildren ? "1" : undefined,
    },
    signal: params.signal,
  });
}

/**
 * ARMADILHA DE PAGINAÇÃO: linhas fixadas (`pinned`) são inseridas ALÉM do `limit` e
 * `has_more` conta somente as NÃO fixadas. O próximo offset é o atual + o número de
 * linhas não fixadas retornadas.
 */
export function nextSessionOffset(currentOffset: number, page: T.SessionListResponse): number {
  return currentOffset + page.data.filter((s) => s.pinned !== true).length;
}

export interface CreateSessionInput {
  /** Opcional. Sem ele o servidor gera `api_<epoch>_<8hex>`. Máx. 256, sem \r \n \0 nem "..". */
  id?: string;
  title?: string;
  systemPrompt?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  requireModelLock?: boolean;
}

/** POST /api/sessions → 201. `source` é SEMPRE "desktop" (R3). */
export function createSession(input: CreateSessionInput = {}, signal?: AbortSignal): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({
    method: "POST",
    path: "/api/sessions",
    body: {
      ...(input.id ? { id: input.id } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.systemPrompt ? { system_prompt: input.systemPrompt } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.modelOptions ? { model_options: input.modelOptions } : {}),
      ...(input.requireModelLock ? { require_model_lock: true } : {}),
      source: RAYCAST_SESSION_SOURCE,
    },
    signal,
  });
}

export function getSession(sessionId: string, signal?: AbortSignal): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({ path: `/api/sessions/${encodeURIComponent(sessionId)}`, signal });
}

/** Exatamente estes 6 campos são aceitos; qualquer outro ⇒ 400 unsupported_session_field. */
export interface SessionPatch {
  title?: string | null;
  pinned?: boolean;
  archived?: boolean;
  hidden?: boolean;
  unread?: boolean;
  /** Truthy ENCERRA a sessão. Não use como metadado. */
  end_reason?: string;
}

export function updateSession(sessionId: string, patch: SessionPatch, signal?: AbortSignal): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({
    method: "PATCH",
    path: `/api/sessions/${encodeURIComponent(sessionId)}`,
    body: patch,
    signal,
  });
}

export function deleteSession(sessionId: string, signal?: AbortSignal): Promise<T.SessionDeletedResponse> {
  return requestJson<T.SessionDeletedResponse>({
    method: "DELETE",
    path: `/api/sessions/${encodeURIComponent(sessionId)}`,
    signal,
  });
}

export interface MessagesPage {
  limit?: number;
  offset?: number;
  order?: "oldest" | "latest";
  signal?: AbortSignal;
}

/**
 * GET /api/sessions/{id}/messages.
 * Com `order=latest` o offset conta a partir da mensagem MAIS NOVA e a página volta
 * em ordem cronológica — é o idioma para paginar "para trás".
 * O `session_id` da resposta pode DIFERIR do pedido (resolve compressão para frente).
 */
export function getSessionMessages(sessionId: string, page: MessagesPage = {}): Promise<T.SessionMessagesResponse> {
  return requestJson<T.SessionMessagesResponse>({
    path: `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    query: {
      limit: Math.min(page.limit ?? 120, 500),
      offset: page.offset ?? 0,
      order: page.order ?? "latest",
    },
    signal: page.signal,
  });
}

/** POST /api/sessions/{id}/fork → 201. O PAI é encerrado com end_reason "branched". */
export function forkSession(
  sessionId: string,
  input: { id?: string; title?: string } = {},
  signal?: AbortSignal,
): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/fork`,
    body: { ...(input.id ? { id: input.id } : {}), ...(input.title ? { title: input.title } : {}) },
    signal,
  });
}
```

**Corpo real de criação (o que sai no fio):**

```json
{"title":"Resumo do contrato","source":"desktop"}
```

**Resposta 201 (forma real):**

```json
{"object":"hermes.session","session":{"id":"api_1755631234_9f3c1d2e","source":"desktop","model":null,
"title":"Resumo do contrato","started_at":1755631234.567,"message_count":0,"pinned":false,
"archived":false,"hidden":false,"has_system_prompt":false,"has_model_config":false}}
```

### 7.6 Turno de conversa

```ts
export interface SessionChatRequest {
  /** Obrigatório e com conteúdo visível, senão 400 missing_message. */
  message: string;
  /** System prompt efêmero deste turno. */
  systemMessage?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  requireModelLock?: boolean;
}

/**
 * P3: a precedência completa é `request` > LocalStorage (`nextTurnModel` → `defaultModel`) >
 * preferência. Como LocalStorage é assíncrono e `chatBody` não é, quem chama resolve antes com
 * `resolveModelChoice()` (storage.ts) e passa o resultado em `request.model`/`request.provider`.
 * Aqui só resta o fallback pela preferência.
 */
function chatBody(request: SessionChatRequest): Record<string, unknown> {
  const prefs = getHermesPreferences();
  const model = request.model ?? prefs.defaultModel;
  const provider = request.provider ?? prefs.defaultProvider;
  return {
    message: request.message,
    ...(request.systemMessage ? { system_message: request.systemMessage } : {}),
    ...(model ? { model } : {}),
    ...(provider ? { provider } : {}),
    ...(request.modelOptions ? { model_options: request.modelOptions } : {}),
    ...(request.requireModelLock ? { require_model_lock: true } : {}),
  };
}

/** POST /api/sessions/{id}/chat — turno síncrono. */
export function sendSessionChat(
  sessionId: string,
  request: SessionChatRequest,
  signal?: AbortSignal,
): Promise<T.SessionChatResponse> {
  return requestJson<T.SessionChatResponse>({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/chat`,
    body: chatBody(request),
    withSessionKey: true,
    timeoutMs: CHAT_TIMEOUT_MS,
    signal,
  });
}

/**
 * POST /api/sessions/{id}/chat/stream — SSE com eventos nomeados.
 * ATENÇÃO: abortar este fetch INTERROMPE o turno do agente no servidor. É exatamente
 * assim que se implementa "Parar", e é exatamente por isso que este endpoint NÃO serve
 * para tarefas longas que precisam sobreviver ao fechamento da janela (use /v1/runs).
 */
export function openSessionChatStream(
  sessionId: string,
  request: SessionChatRequest,
  signal?: AbortSignal,
): Promise<Response> {
  return requestStream({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
    body: chatBody(request),
    withSessionKey: true,
    signal,
  });
}

/** POST /api/sessions/{id}/model — fixa o modelo da conversa (require_model_lock é forçado no servidor). */
export function setSessionModel(
  sessionId: string,
  request: { model?: string; provider?: string; modelOptions?: T.ModelOptionsRequest },
  signal?: AbortSignal,
): Promise<T.SessionModelLockResponse> {
  return requestJson<T.SessionModelLockResponse>({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/model`,
    body: {
      ...(request.model ? { model: request.model } : {}),
      ...(request.provider ? { provider: request.provider } : {}),
      ...(request.modelOptions ? { model_options: request.modelOptions } : {}),
    },
    signal,
  });
}
```

**Fluxo composto que garante R4 (nunca deixar sessão vazia):**

```ts
/**
 * Compatibilidade do cliente HTTP para o stream de sessão. As telas atuais usam
 * `startConversation()` + `/v1/runs` (D-01); esta função não é o transporte da conversa contínua.
 * Se o stream não abrir,
 * apaga a sessão recém-criada para não deixar uma linha vazia (invisível no Desktop,
 * mas real no banco).
 */
export async function createSessionAndStreamFirstTurn(
  input: CreateSessionInput & { message: string },
  signal?: AbortSignal,
): Promise<{ sessionId: string; response: Response }> {
  const created = await createSession(input, signal);
  const sessionId = created.session.id;
  try {
    const response = await openSessionChatStream(sessionId, { message: input.message, systemMessage: input.systemPrompt }, signal);
    return { sessionId, response };
  } catch (err) {
    await deleteSession(sessionId).catch(() => undefined);
    throw err;
  }
}

/** Limpeza defensiva: usar quando o usuário cancela antes do primeiro delta. */
export async function deleteSessionIfEmpty(sessionId: string): Promise<void> {
  try {
    const { session } = await getSession(sessionId);
    if ((session.message_count ?? 0) === 0) await deleteSession(sessionId);
  } catch {
    /* silencioso: é limpeza best-effort */
  }
}
```

### 7.7 Runs

```ts
export interface CreateRunInput {
  /** SEMPRE string. Um array com content-blocks no último item chega não-achatado ao agente. */
  input: string;
  instructions?: string;
  /** Sem ele o servidor usa o próprio run_id como session_id e NENHUMA linha de sessão é criada. */
  sessionId?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  conversationHistory?: Array<{ role: string; content: string }>;
}

/** POST /v1/runs → 202 {"run_id","status":"started"}. "started" NÃO é um RunStatus. */
export function createRun(input: CreateRunInput, signal?: AbortSignal): Promise<T.RunCreatedResponse> {
  const prefs = getHermesPreferences();
  return requestJson<T.RunCreatedResponse>({
    method: "POST",
    path: "/v1/runs",
    body: {
      input: input.input,
      ...(input.instructions ? { instructions: input.instructions } : {}),
      ...(input.sessionId ? { session_id: input.sessionId } : {}),
      ...(input.model ?? prefs.defaultModel ? { model: input.model ?? prefs.defaultModel } : {}),
      ...(input.provider ?? prefs.defaultProvider ? { provider: input.provider ?? prefs.defaultProvider } : {}),
      ...(input.modelOptions ? { model_options: input.modelOptions } : {}),
      ...(input.conversationHistory ? { conversation_history: input.conversationHistory } : {}),
    },
    withSessionKey: true,
    signal,
  });
}

export function getRun(runId: string, signal?: AbortSignal): Promise<T.Run> {
  return requestJson<T.Run>({ path: `/v1/runs/${encodeURIComponent(runId)}`, signal });
}

/**
 * GET /v1/runs/{id}/events — stream de consumidor ÚNICO e NÃO retomável.
 * Assine imediatamente após o 202. Ao desconectar, a fila é destruída para sempre
 * e uma nova assinatura devolve 404 — a recuperação é polling de GET /v1/runs/{id}.
 */
export function openRunEventStream(runId: string, signal?: AbortSignal): Promise<Response> {
  return requestStream({ method: "GET", path: `/v1/runs/${encodeURIComponent(runId)}/events`, signal });
}

/** Não existe forma de endereçar um request_id: resolve o mais antigo da fila (FIFO). */
export function respondToApproval(
  runId: string,
  choice: T.ApprovalChoice,
  resolveAll = false,
  signal?: AbortSignal,
): Promise<T.RunApprovalResponse> {
  return requestJson<T.RunApprovalResponse>({
    method: "POST",
    path: `/v1/runs/${encodeURIComponent(runId)}/approval`,
    body: { choice, ...(resolveAll ? { resolve_all: true } : {}) },
    signal,
  });
}

/** Só é aceito quando o status é EXATAMENTE "running" (senão 409). */
export function steerRun(runId: string, text: string, signal?: AbortSignal): Promise<T.RunSteerResponse> {
  return requestJson<T.RunSteerResponse>({
    method: "POST",
    path: `/v1/runs/${encodeURIComponent(runId)}/steer`,
    body: { input: text },
    signal,
  });
}

/** Corpo ignorado pelo servidor. 404 aqui significa "já terminou", não erro. */
export function stopRun(runId: string, signal?: AbortSignal): Promise<T.RunStopResponse> {
  return requestJson<T.RunStopResponse>({ method: "POST", path: `/v1/runs/${encodeURIComponent(runId)}/stop`, signal });
}

/** Não existe GET /v1/runs (lista). Reconstrua a lista a partir do LocalStorage. */
export async function reconcileRun(runId: string): Promise<T.Run | "expired"> {
  try {
    return await getRun(runId);
  } catch (err) {
    if ((err as { code?: string }).code === "run_not_found") return "expired";
    throw err;
  }
}
```

**Corpos reais:**

```json
POST /v1/runs
{"input":"Refatore o módulo de autenticação e rode os testes","session_id":"api_1755631234_9f3c1d2e"}

202 {"run_id":"run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12","status":"started"}

POST /v1/runs/{id}/approval   {"choice":"once"}
200 {"object":"hermes.run.approval_response","run_id":"run_9f4c...","choice":"once","resolved":1}

POST /v1/runs/{id}/steer      {"input":"seja mais breve no final"}
200 {"object":"hermes.run.steer","run_id":"run_9f4c...","accepted":true}

POST /v1/runs/{id}/stop       (sem corpo)
200 {"run_id":"run_9f4c...","status":"stopping"}
```

### 7.8 Skills e toolsets — **IMPLEMENTADO em 2026-08-20**

> A nota de YAGNI abaixo cumpriu o papel dela e **caducou**: a fase 2 começou e o código existe em
> `src/lib/hermes-api.ts` (`listSkills`, `listToolsets`, `toolsetAvailability`), em `src/lib/status.ts`
> (`TOOLSET_AVAILABILITY_LABEL`, `TOOLSET_AVAILABILITY_APPEARANCE`) e nas telas `src/skills.tsx` e
> `src/toolsets.tsx`. **Duas divergências do bloco abaixo, e o código vence:** `listToolsets` usa
> `TOOLSETS_TIMEOUT_MS` (12 s), não `SLOW_TIMEOUT_MS`; e `CacheTtl.toolsets` é de 10 min, não 15 —
> o handler pode travar o Hermes inteiro por ~8 s, e o corte curto é proteção, não impaciência.
> Os 8 s são o pior caso, não o normal: são o `timeout=8` de uma leitura HTTP bloqueante ao
> portal da Nous. Medido ao vivo em 2026-08-21, o custo real foi ~1,9 s na primeira chamada e
> ~0,7 s nas seguintes — ver D-15 em `docs/DECISOES-VERIFICADAS.md`.
> Os rótulos moram em `status.ts`, não em `hermes-api.ts`, pela mesma regra que vale para os 7
> estados de execução: nenhuma tela monta rótulo por conta própria.

> **Contrato vigente:** os comandos `skills` e `toolsets` já estão no manifesto e usam as funções
> abaixo. A origem histórica como Fase 2 explica a pesquisa, mas não é uma pendência de código.

```ts
/** Devolve SOMENTE skills habilitadas; não existe campo `enabled` nem paginação nem filtro. */
export function listSkills(signal?: AbortSignal): Promise<T.SkillListResponse> {
  return requestJson<T.SkillListResponse>({ path: "/v1/skills", signal });
}

/** LENTO (resolve 27+ toolsets no event loop). Sempre servir do Cache primeiro. */
export function listToolsets(signal?: AbortSignal): Promise<T.ToolsetListResponse> {
  return requestJson<T.ToolsetListResponse>({ path: "/v1/toolsets", timeoutMs: SLOW_TIMEOUT_MS, signal });
}

/** Não existe campo "available": derive de enabled × configured. */
export type ToolsetAvailability = "disponivel" | "precisa_configurar" | "desligado" | "indisponivel";

export function toolsetAvailability(toolset: T.Toolset): ToolsetAvailability {
  if (toolset.enabled && toolset.configured) return "disponivel";
  if (toolset.enabled && !toolset.configured) return "precisa_configurar";
  if (!toolset.enabled && toolset.configured) return "desligado";
  return "indisponivel";
}

export const TOOLSET_AVAILABILITY_LABEL: Record<ToolsetAvailability, string> = {
  disponivel: "Disponível",
  precisa_configurar: "Precisa configurar",
  desligado: "Desligado",
  indisponivel: "Indisponível",
};
```

### 7.9 Jobs (automações) — **IMPLEMENTADO em 2026-08-20**

> Idem §7.8: a nota de YAGNI abaixo caducou. A tela é `src/jobs.tsx`, os tipos `Job*` e
> `JOB_STATE_LABEL` estão em uso, e o gate é o HTTP (`200` lista, `501` estado vazio, `401`
> primeiro uso) — **nunca** `features.jobs_admin`, conforme a D-04 revisada.

> **Contrato vigente:** `Automações do Hermes` já está no manifesto. O comando usa o gate HTTP real:
> `200` lista, `501` informa indisponibilidade e `401` leva ao primeiro uso; `features.jobs_admin`
> não é usado como gate.

```ts
const JOB_ID_RE = /^[a-f0-9]{12}$/;

export function isValidJobId(jobId: string): boolean {
  return JOB_ID_RE.test(jobId);
}

/** SEMPRE com include_disabled=true: sem isso as automações pausadas somem da lista. */
export function listJobs(includeDisabled = true, signal?: AbortSignal): Promise<T.JobListResponse> {
  return requestJson<T.JobListResponse>({
    path: "/api/jobs",
    query: includeDisabled ? { include_disabled: "true" } : undefined,
    signal,
  });
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ path: `/api/jobs/${jobId}`, signal });
}

export interface CreateJobInput {
  /** Obrigatório, ≤200 chars. */
  name: string;
  /** Obrigatório. STRING (o servidor devolve objeto). Validar com validateSchedule antes! */
  schedule: string;
  /** ≤5000 chars, passa por varredura de ameaça. */
  prompt?: string;
  /** Default "local". Para jobs criados via REST, prefira "local". */
  deliver?: string;
  skills?: string[];
  /** Inteiro ≥1. */
  repeat?: number;
}

/** POST /api/jobs → 200 (não 201). Apenas estes 6 campos são lidos. */
export function createJob(input: CreateJobInput, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({
    method: "POST",
    path: "/api/jobs",
    body: {
      name: input.name,
      schedule: input.schedule,
      prompt: input.prompt ?? "",
      deliver: input.deliver ?? "local",
      ...(input.skills && input.skills.length > 0 ? { skills: input.skills } : {}),
      ...(input.repeat !== undefined ? { repeat: input.repeat } : {}),
    },
    signal,
  });
}

/** NUNCA inclua `repeat` aqui: o servidor grava o inteiro cru e quebra o job na próxima execução. */
export interface UpdateJobInput {
  name?: string;
  schedule?: string;
  prompt?: string;
  deliver?: string;
  skills?: string[];
  enabled?: boolean;
}

export function updateJob(jobId: string, patch: UpdateJobInput, signal?: AbortSignal): Promise<T.JobEnvelope> {
  const { ...safe } = patch;
  delete (safe as Record<string, unknown>).repeat;
  return requestJson<T.JobEnvelope>({ method: "PATCH", path: `/api/jobs/${jobId}`, body: safe, signal });
}

export function deleteJob(jobId: string, signal?: AbortSignal): Promise<T.JobDeletedResponse> {
  return requestJson<T.JobDeletedResponse>({ method: "DELETE", path: `/api/jobs/${jobId}`, signal });
}

/** Use SEMPRE pause/resume — nunca PATCH {enabled:false}, que deixa o job "morto silencioso". */
export function pauseJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${jobId}/pause`, signal });
}

export function resumeJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${jobId}/resume`, signal });
}

/** NÃO executa agora: apenas marca next_run_at = agora. O ticker roda a cada ~60 s. */
export function queueJobRun(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${jobId}/run`, signal });
}

/* ── Validador local de schedule: obrigatório, porque schedule inválido retorna 500 ── */

const DURATION_RE = /^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i;
const CRON_FIELD_RE = /^[\d*\-,/]+$/;

export function validateSchedule(raw: string): { ok: true } | { ok: false; reason: string } {
  const value = raw.trim();
  if (value === "") return { ok: false, reason: "Informe quando a automação deve rodar." };

  if (value.toLowerCase().startsWith("every ")) {
    return DURATION_RE.test(value.slice(6).trim())
      ? { ok: true }
      : { ok: false, reason: "Use por exemplo: every 30m, every 2h, every 1d." };
  }

  const parts = value.split(/\s+/);
  if (parts.length >= 5 && parts.slice(0, 5).every((p) => CRON_FIELD_RE.test(p))) return { ok: true };

  if (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return Number.isNaN(Date.parse(value.replace("Z", "+00:00")))
      ? { ok: false, reason: "Data e hora inválidas. Use 2026-06-01T09:00:00." }
      : { ok: true };
  }

  if (DURATION_RE.test(value)) return { ok: true };

  return {
    ok: false,
    reason: "Formatos aceitos: 30m · 2h · 1d (uma vez) · every 30m (repetido) · 0 9 * * * (cron) · 2026-06-01T09:00:00.",
  };
}
```

**Notas obrigatórias sobre jobs:** `@daily`, `MON`, "amanhã às 9" **não** são aceitos.
`every 2h` volta como `schedule_display: "every 120m"` (o servidor normaliza para minutos) — mostre
sempre `schedule_display`, nunca o que o usuário digitou. `latest_execution` só existe na rota de
lista. Não há endpoint que devolva a saída de um job: exiba `last_status` / `last_error` /
`last_delivery_error`. Nunca chame `POST /api/cron/fire` (autenticação diferente, uso interno).

---

## 8. `hermes-events.ts` — o módulo de maior risco

### 8.1 Fatos do fio que o parser precisa respeitar

| Fato | Consequência no código |
|---|---|
| Não existe `EventSource` global garantido no Node do Raycast | Parser manual sobre `response.body.getReader()` |
| Precisamos do header `Authorization` | `EventSource` não permitiria headers de qualquer forma |
| `/api/sessions/{id}/chat/stream` usa `event: <nome>` + `data: {...}` | Discriminar pelo **nome do evento SSE** |
| `/v1/runs/{id}/events` **não** usa `event:` — só `data: {...}` | Discriminar pelo campo **`event` dentro do JSON** |
| Nenhum dos dois emite `id:` | `Last-Event-ID` não existe; retomada é impossível |
| Comentários reais no fio: `: keepalive` (a cada 30 s) e `: stream closed` (fim do run) | Comentários **não** podem ser tratados como evento nem como fim prematuro |
| `/v1/runs` usa `ensure_ascii=True` | Acentos chegam como `\uXXXX` — `JSON.parse` resolve; um parser por regex **não** |
| `/api/sessions/.../chat/stream` usa `ensure_ascii=False` | UTF-8 cru: o `TextDecoder` precisa de `{ stream: true }` para não cortar multibyte entre chunks |
| Um `data:` pode teoricamente vir em múltiplas linhas | Juntar com `\n` antes do `JSON.parse` |
| Chunks TCP quebram em qualquer byte | Buffer entre leituras; CRLF partido entre chunks |
| `[DONE]` só existe em `/v1/chat/completions` (não usado) | Não implementar sentinela `[DONE]` |
| Fim do stream de sessão = evento `done` (sempre, em `finally`) | Terminal explícito |
| Fim do stream de run = `: stream closed` **ou** evento terminal **ou** EOF | Aceitar os três |

### 8.2 Parser SSE genérico

```ts
import { HermesProtocolError, isAbort, toHermesError } from "./errors";
import type * as T from "./types";

export interface SseFrame {
  /** Valor do último campo `event:`; undefined em frames sem nome. */
  event?: string;
  /** Linhas `data:` unidas por "\n". "" quando não havia data. */
  data: string;
  id?: string;
  retry?: number;
  /** Preenchido quando a linha era um comentário (`: texto`). data fica "". */
  comment?: string;
}

/**
 * Máquina de estados incremental. `push()` aceita qualquer fatia de texto e devolve
 * os frames completos; `flush()` fecha o que sobrou no buffer no fim do stream.
 *
 * Trata: CRLF, LF, CR isolado, CRLF partido entre chunks, BOM inicial,
 * campo sem ":", espaço único opcional após ":", data multilinha, comentários.
 */
export function createSseParser() {
  let buffer = "";
  let dataLines: string[] = [];
  let eventName: string | undefined;
  let lastId: string | undefined;
  let retry: number | undefined;
  let sawField = false;
  let bomChecked = false;

  function reset(): void {
    dataLines = [];
    eventName = undefined;
    retry = undefined;
    sawField = false;
  }

  function dispatch(out: SseFrame[]): void {
    if (!sawField) return reset();
    if (dataLines.length === 0 && eventName === undefined) return reset();
    out.push({ event: eventName, data: dataLines.join("\n"), id: lastId, retry });
    reset();
  }

  function handleLine(line: string, out: SseFrame[]): void {
    if (line === "") return dispatch(out);
    if (line.startsWith(":")) {
      // Comentário: NÃO encerra o evento em curso e NÃO é um evento.
      out.push({ data: "", comment: line.slice(1).trim() });
      return;
    }
    const colon = line.indexOf(":");
    let field: string;
    let value: string;
    if (colon === -1) {
      field = line;
      value = "";
    } else {
      field = line.slice(0, colon);
      value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
    }
    sawField = true;
    switch (field) {
      case "event":
        eventName = value;
        break;
      case "data":
        dataLines.push(value);
        break;
      case "id":
        if (!value.includes("\0")) lastId = value;
        break;
      case "retry": {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed >= 0) retry = parsed;
        break;
      }
      default:
        break; // campo desconhecido: ignorar, conforme a spec
    }
  }

  return {
    push(chunk: string): SseFrame[] {
      const out: SseFrame[] = [];
      let text = chunk;
      if (!bomChecked) {
        bomChecked = true;
        if (text.startsWith("﻿")) text = text.slice(1);
      }
      buffer += text;

      let index = 0;
      let start = 0;
      while (index < buffer.length) {
        const ch = buffer[index];
        if (ch === "\n") {
          handleLine(buffer.slice(start, index), out);
          index += 1;
          start = index;
        } else if (ch === "\r") {
          // CRLF possivelmente partido entre chunks: espera o próximo push.
          if (index === buffer.length - 1) break;
          handleLine(buffer.slice(start, index), out);
          index += buffer[index + 1] === "\n" ? 2 : 1;
          start = index;
        } else {
          index += 1;
        }
      }
      buffer = buffer.slice(start);
      return out;
    },

    flush(): SseFrame[] {
      const out: SseFrame[] = [];
      const rest = buffer.replace(/\r$/, "");
      buffer = "";
      if (rest !== "") handleLine(rest, out);
      dispatch(out);
      return out;
    },
  };
}

/**
 * Lê um Response SSE como um AsyncGenerator de frames.
 * Cancelamento: quando `signal` aborta, o reader é cancelado e o gerador termina.
 * O `finally` cancela o reader mesmo em `break` do consumidor (fecha o socket).
 */
export async function* readSseFrames(response: Response, signal?: AbortSignal): AsyncGenerator<SseFrame> {
  if (!response.body) {
    throw new HermesProtocolError({
      userMessage: "Resposta inesperada do Hermes.",
      technical: "readSseFrames: response.body é null.",
      recovery: "report_bug",
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = createSseParser();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // { stream: true } é obrigatório: sem ele um caractere multibyte partido vira "�".
      for (const frame of parser.push(decoder.decode(value, { stream: true }))) yield frame;
    }
    for (const frame of parser.push(decoder.decode())) yield frame;
    for (const frame of parser.flush()) yield frame;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await reader.cancel().catch(() => undefined);
  }
}

function parseFrameJson(frame: SseFrame): Record<string, unknown> | undefined {
  if (frame.data === "") return undefined;
  try {
    const value: unknown = JSON.parse(frame.data);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined; // frame corrompido: descartar, nunca derrubar o stream
  }
}
```

### 8.3 Vocabulário: `/api/sessions/{id}/chat/stream`

11 nomes de evento. O discriminador é o **nome do evento SSE**, copiado para o campo `type`.
Todo payload já carrega `session_id`, `run_id`, `seq`, `ts`.

| Evento | Carga além do envelope |
|---|---|
| `run.started` | `user_message: {role,content}`, `runtime?` |
| `message.started` | `message: {id: "msg_<hex>", role: "assistant"}` |
| `assistant.delta` | `message_id`, `delta` (deltas vazios são suprimidos) |
| `tool.progress` | `message_id`, `tool_name` (default `_thinking`), `delta` (preview de raciocínio, ≤500) |
| `tool.started` | `message_id`, `tool_name`, `preview`, `args` |
| `tool.completed` | idem, mas `preview` e `args` são **sempre null** |
| `tool.failed` | reservado — **nenhum produtor existe** |
| `assistant.completed` | `message_id`, `content` (texto final completo), `completed`, `partial`, `interrupted`, `runtime?`, `session_id` **efetivo** |
| `run.completed` | `message_id`, `completed`, `messages[]` (transcrição autoritativa do turno), `usage?`, `runtime?`, `pending_steer?` |
| `error` | `message` (já redigido) |
| `done` | `{}` — **sempre o último**, emitido em `finally` |

```ts
export const SESSION_CHAT_EVENT_NAMES = [
  "run.started",
  "message.started",
  "assistant.delta",
  "tool.progress",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "assistant.completed",
  "run.completed",
  "error",
  "done",
] as const;

export function parseSessionChatEvent(frame: SseFrame): T.SessionChatEvent | undefined {
  if (frame.comment !== undefined || !frame.event) return undefined;
  const payload = parseFrameJson(frame);
  if (!payload) return undefined;
  return { ...payload, type: frame.event } as T.SessionChatEvent;
}
```

### 8.4 Vocabulário: `/v1/runs/{id}/events`

12 tipos. Frames **sem** `event:` — o discriminador é `payload.event`. Todos trazem
`run_id` e `timestamp`.

| `event` | Carga |
|---|---|
| `message.delta` | `delta` — **único** carregador do texto do assistente |
| `tool.started` | `tool`, `preview` (pode ser null). **`args` NÃO é transmitido aqui** |
| `tool.completed` | `tool`, `duration` (s), `error` (bool). Falha de tool = este evento com `error: true` |
| `reasoning.available` | `text` (≤500 chars) |
| `subagent.start` / `subagent.complete` | allowlist opcional (`goal`, `status`, `summary`, tokens, `files_read`…) |
| `approval.request` | `command`, `description`, `pattern_key(s)`, `allow_permanent`, `allow_session`, `smart_denied?`, `request_id`, `choices[]` |
| `approval.responded` | `choice`, `resolved` |
| `run.steered` | `accepted` |
| `run.completed` | `output`, `usage`, `pending_steer?` |
| `run.failed` | `error` |
| `run.cancelled` | — |

**Não existem aqui:** `run.started`, `run.stopping`, `tool.failed`, `tool.output_risk`,
`assistant.delta`, `message.started`, `done`, `error`.

```ts
export const RUN_TERMINAL_EVENTS = new Set(["run.completed", "run.failed", "run.cancelled"]);

export function parseRunEvent(frame: SseFrame): T.RunEvent | undefined {
  if (frame.comment !== undefined) return undefined;
  const payload = parseFrameJson(frame);
  if (!payload || typeof payload.event !== "string") return undefined;
  return payload as unknown as T.RunEvent;
}

/** `: stream closed` é o comentário que o servidor escreve ao encerrar o run. */
export function isStreamClosedComment(frame: SseFrame): boolean {
  return frame.comment === "stream closed";
}

export function isKeepAliveComment(frame: SseFrame): boolean {
  return frame.comment === "keepalive";
}
```

### 8.5 Consumidor do stream de conversa

```ts
export interface SessionChatHandlers {
  /** Recebe todo evento já tipado (inclusive os desconhecidos). */
  onEvent?: (event: T.SessionChatEvent) => void;
  /** Texto incremental já acumulado (use com createTextBuffer para não re-renderizar por token). */
  onText?: (fullText: string) => void;
  onToolStarted?: (toolName: string, preview: string | null) => void;
  onToolCompleted?: (toolName: string) => void;
  /** Preview de raciocínio (tool.progress). */
  onThinking?: (text: string) => void;
  onError?: (message: string) => void;
}

export interface SessionChatResult {
  /** Id EFETIVO ao fim do turno — pode diferir do inicial se houve compressão. Persistir ESTE. */
  sessionId: string;
  runId?: string;
  messageId?: string;
  /** Texto final autoritativo (de assistant.completed), com fallback para os deltas. */
  content: string;
  usage?: T.HermesUsage;
  runtime?: T.RuntimeMetadata;
  /** Transcrição do turno (de run.completed). Fonte da verdade para renderizar tool calls. */
  messages: T.SessionMessage[];
  interrupted: boolean;
  completed: boolean;
  /** Preenchido quando veio um evento `error` (HTTP já era 200). */
  errorMessage?: string;
  pendingSteer?: string;
}

export async function consumeSessionChatStream(
  response: Response,
  initialSessionId: string,
  handlers: SessionChatHandlers = {},
  signal?: AbortSignal,
): Promise<SessionChatResult> {
  const result: SessionChatResult = {
    sessionId: initialSessionId,
    content: "",
    messages: [],
    interrupted: false,
    completed: false,
  };
  let deltaText = "";

  try {
    for await (const frame of readSseFrames(response, signal)) {
      if (frame.comment !== undefined) continue; // keepalive
      const event = parseSessionChatEvent(frame);
      if (!event) continue;
      handlers.onEvent?.(event);

      switch (event.type) {
        case "run.started":
          result.runId = event.run_id;
          break;
        case "message.started":
          result.messageId = (event as { message?: { id?: string } }).message?.id;
          break;
        case "assistant.delta": {
          const delta = (event as { delta?: string }).delta ?? "";
          if (delta !== "") {
            deltaText += delta;
            handlers.onText?.(deltaText);
          }
          break;
        }
        case "tool.progress":
          handlers.onThinking?.((event as { delta?: string }).delta ?? "");
          break;
        case "tool.started":
          handlers.onToolStarted?.(
            (event as { tool_name?: string }).tool_name ?? "",
            (event as { preview?: string | null }).preview ?? null,
          );
          break;
        case "tool.completed":
        case "tool.failed":
          handlers.onToolCompleted?.((event as { tool_name?: string }).tool_name ?? "");
          break;
        case "assistant.completed": {
          const e = event as unknown as {
            session_id: string;
            message_id?: string;
            content?: string;
            partial?: boolean;
            interrupted?: boolean;
            runtime?: T.RuntimeMetadata;
          };
          result.sessionId = e.session_id ?? result.sessionId; // segue o id efetivo
          result.messageId = e.message_id ?? result.messageId;
          result.content = e.content ?? deltaText;
          result.interrupted = e.interrupted === true;
          result.runtime = e.runtime ?? result.runtime;
          handlers.onText?.(result.content);
          break;
        }
        case "run.completed": {
          const e = event as unknown as {
            session_id: string;
            messages?: T.SessionMessage[];
            usage?: T.HermesUsage;
            runtime?: T.RuntimeMetadata;
            pending_steer?: string;
          };
          result.sessionId = e.session_id ?? result.sessionId;
          result.messages = e.messages ?? [];
          result.usage = e.usage;
          result.runtime = e.runtime ?? result.runtime;
          result.pendingSteer = e.pending_steer;
          result.completed = true;
          break;
        }
        case "error": {
          const message = (event as { message?: string }).message ?? "Erro desconhecido.";
          result.errorMessage = message;
          handlers.onError?.(message);
          break;
        }
        case "done":
          break;
        default:
          break; // evento futuro desconhecido: ignorar sem quebrar
      }
    }
  } catch (err) {
    if (!isAbort(err)) throw toHermesError(err, "consumeSessionChatStream");
    result.interrupted = true;
  }

  if (result.content === "") result.content = deltaText;
  return result;
}
```

**Regra derivada da fonte:** não reconstrua a transcrição só concatenando `assistant.delta` —
segmentos de texto que precedem chamadas de ferramenta ficam indistinguíveis num buffer único.
Use `run.completed.messages` para renderizar o turno completo; os deltas servem só para o
feedback ao vivo.

### 8.6 Consumidor do stream de run

```ts
export interface RunStreamHandlers {
  onEvent?: (event: T.RunEvent) => void;
  onText?: (fullText: string) => void;
  onToolStarted?: (tool: string, preview: string | null) => void;
  onToolCompleted?: (tool: string, durationSeconds: number, failed: boolean) => void;
  onReasoning?: (text: string) => void;
  onSubagent?: (event: T.RunEvent & T.SubagentFields) => void;
  /** OBRIGATÓRIO persistir no LocalStorage imediatamente: não há como re-obter isto. */
  onApprovalRequest?: (request: T.ApprovalRequestFields & { run_id: string; timestamp: number }) => void;
  onApprovalResponded?: (choice: T.ApprovalChoice, resolved: number) => void;
}

export interface RunStreamResult {
  runId: string;
  text: string;
  output?: string;
  usage?: T.HermesUsage;
  error?: string;
  pendingSteer?: string;
  /** Último evento terminal observado, se houve. */
  terminalEvent?: "run.completed" | "run.failed" | "run.cancelled";
  /** true quando o servidor escreveu ": stream closed". */
  closedByServer: boolean;
  /** true quando o consumidor abortou (janela fechada / Parar). O RUN CONTINUA no servidor. */
  aborted: boolean;
}

export async function consumeRunEventStream(
  response: Response,
  runId: string,
  handlers: RunStreamHandlers = {},
  signal?: AbortSignal,
): Promise<RunStreamResult> {
  const result: RunStreamResult = { runId, text: "", closedByServer: false, aborted: false };

  try {
    for await (const frame of readSseFrames(response, signal)) {
      if (frame.comment !== undefined) {
        if (isStreamClosedComment(frame)) result.closedByServer = true;
        continue; // keepalive e qualquer outro comentário
      }
      const event = parseRunEvent(frame);
      if (!event) continue;
      handlers.onEvent?.(event);

      switch (event.event) {
        case "message.delta": {
          const delta = (event as { delta?: string }).delta ?? "";
          if (delta !== "") {
            result.text += delta;
            handlers.onText?.(result.text);
          }
          break;
        }
        case "tool.started":
          handlers.onToolStarted?.((event as { tool?: string }).tool ?? "", (event as { preview?: string | null }).preview ?? null);
          break;
        case "tool.completed":
          handlers.onToolCompleted?.(
            (event as { tool?: string }).tool ?? "",
            (event as { duration?: number }).duration ?? 0,
            (event as { error?: boolean }).error === true,
          );
          break;
        case "reasoning.available":
          handlers.onReasoning?.((event as { text?: string }).text ?? "");
          break;
        case "subagent.start":
        case "subagent.complete":
          handlers.onSubagent?.(event as T.RunEvent & T.SubagentFields);
          break;
        case "approval.request":
          handlers.onApprovalRequest?.(event as unknown as T.ApprovalRequestFields & { run_id: string; timestamp: number });
          break;
        case "approval.responded":
          handlers.onApprovalResponded?.(
            (event as { choice?: T.ApprovalChoice }).choice ?? "once",
            (event as { resolved?: number }).resolved ?? 0,
          );
          break;
        case "run.completed":
          result.output = (event as { output?: string }).output;
          result.usage = (event as { usage?: T.HermesUsage }).usage;
          result.pendingSteer = (event as { pending_steer?: string }).pending_steer;
          result.terminalEvent = "run.completed";
          break;
        case "run.failed":
          result.error = (event as { error?: string }).error;
          result.terminalEvent = "run.failed";
          break;
        case "run.cancelled":
          result.terminalEvent = "run.cancelled";
          break;
        default:
          break;
      }
    }
  } catch (err) {
    if (!isAbort(err)) throw toHermesError(err, "consumeRunEventStream");
    result.aborted = true;
  }

  return result;
}
```

### 8.7 Cancelamento e limpeza na desmontagem (padrão obrigatório)

```tsx
useEffect(() => {
  const controller = new AbortController();
  let cancelled = false; // guarda contra o duplo-invoke do StrictMode/React 19

  (async () => {
    try {
      const response = await openSessionChatStream(sessionId, { message }, controller.signal);
      const buffer = createTextBuffer((text) => {
        if (!cancelled) setMarkdown(text);
      });
      const result = await consumeSessionChatStream(response, sessionId, { onText: buffer.push }, controller.signal);
      buffer.flush();
      if (!cancelled) applyResult(result);
    } catch (err) {
      if (!cancelled && !isAbort(err)) setError(toHermesError(err, "ask"));
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  })();

  return () => {
    cancelled = true;
    controller.abort(); // ÚNICO lugar que cancela o stream
  };
}, [sessionId, message]);
```

Semântica **diferente** por endpoint, e isso muda o desenho da UI:

- **`/api/sessions/{id}/chat/stream`**: abortar **interrompe o turno do agente no servidor**.
  É a implementação correta de "Parar". Mas também significa que fechar a janela do Raycast
  **cancela** o turno — o que contraria o princípio 8 do brief ("fechar a janela não deve ser
  cancelamento"). Portanto: use este endpoint apenas para perguntas curtas e interativas
  (`Perguntar ao Hermes`), e avise no rodapé enquanto estiver em streaming.
- **`/v1/runs`**: a execução é uma task destacada. Abortar o stream **não** cancela nada; só
  perde os eventos. É o único endpoint correto para "Executar tarefa".

```ts
/**
 * Agrupa deltas para não re-renderizar o Detail a cada token (cada setState atravessa a
 * ponte IPC até o host WPF). ~80 ms é imperceptível e reduz drasticamente os re-renders.
 */
export function createTextBuffer(onFlush: (text: string) => void, intervalMs = 80) {
  let latest = "";
  let timer: NodeJS.Timeout | undefined;

  return {
    push(text: string): void {
      latest = text;
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        onFlush(latest);
      }, intervalMs);
    },
    flush(): void {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      onFlush(latest);
    },
  };
}
```

### 8.8 Exemplo literal do fio (para os testes)

Stream de conversa (`ensure_ascii=False`, eventos nomeados):

```text
event: run.started
data: {"user_message": {"role": "user", "content": "liste os arquivos"}, "runtime": {"provider": "", "model": "", "route_source": "global"}, "session_id": "api_1755631234_9f3c1d2e", "run_id": "run_2f0c...", "seq": 1, "ts": 1755631234.11}

event: assistant.delta
data: {"message_id": "msg_9a7b...", "delta": "Aqui estão ", "session_id": "api_1755631234_9f3c1d2e", "run_id": "run_2f0c...", "seq": 5, "ts": 1755631235.20}

: keepalive

event: done
data: {"session_id": "api_1755631234_9f3c1d2e", "run_id": "run_2f0c...", "seq": 9, "ts": 1755631235.32}

```

Stream de run (sem `event:`, `ensure_ascii=True`):

```text
data: {"event": "tool.started", "run_id": "run_9f4c...", "timestamp": 1755631207.902, "tool": "terminal", "preview": "ls -la"}

data: {"event": "message.delta", "run_id": "run_9f4c...", "timestamp": 1755631203.771, "delta": "Concluído"}

: stream closed
```

---

## 9. `storage.ts`

### 9.1 Política: o que vai onde

| Dado | Onde | TTL / limite | Por quê |
|---|---|---|---|
| `lastSessionId` | LocalStorage | — | "lembrar a última sessão usada" (MVP #1) |
| Modelo padrão da extensão (`{provider, model}`) | LocalStorage | — | O Raycast **não** tem API para escrever preferências, então a ação `Usar como modelo padrão` (UX-SPEC §2.6) só pode gravar aqui. Precedência (decisão **P3**): override da tarefa > este valor > preferência `defaultModel`/`defaultProvider`. `chatBody()` e `createRun()` precisam consultá-lo. |
| Modelo só do próximo envio (`{provider, model}`) | LocalStorage | consumido e apagado no 1º uso | Ação `Usar só na próxima pergunta` (UX-SPEC §2.6) — é o "override por tarefa sem alterar o default global" exigido pelo MVP #5 do brief |
| Endpoint resolvido (`baseUrl`, versão, pid/start_time do gateway) | LocalStorage | 12 h + invalidação por pid | Evita re-sondar portas a cada comando |
| Índice de runs iniciados pelo Raycast (`run_id`, `session_id`, prompt truncado, `created_at`, último status) | LocalStorage | máx. **20** entradas, poda ≥ 7 dias | **Não existe `GET /v1/runs`**: o rastreamento é 100% do cliente |
| Último `approval.request` por run | LocalStorage | apagado ao terminar o run; poda em 2 h | Não há endpoint que liste aprovações pendentes; sem isso o usuário aprova às cegas |
| Resultado final de um run (`output`/`error`, truncado em 4000 chars) | LocalStorage | poda em 24 h | O servidor descarta o status terminal após 1 h; sem cache o resultado some da tela de execuções |
| `capabilities` | Cache | 5 min | Feature-detection; muda só com upgrade do Hermes |
| `/api/model/options` | Cache | 10 min | Payload grande e caro |
| `/v1/skills` | Cache | 5 min | O servidor já tem cache de 30 s |
| `/v1/toolsets` | Cache | **10 min** | Endpoint lento E perigoso: pode travar o Hermes inteiro por ~8 s no pior caso. Medido em 2026-08-21: ~1,9 s na chamada fria, ~0,7 s nas seguintes (D-15). Corte de 12 s, nunca em segundo plano |
| Primeira página de `/api/sessions` | Cache | 30 s | Só para pintura instantânea; **sempre** revalidar |
| **Transcrições completas** (`/api/sessions/{id}/messages`) | **em lugar nenhum** | — | Regra do brief: "não cachear transcripts completos por padrão" |
| Conteúdo de mensagens, previews longos, argumentos de ferramentas | **em lugar nenhum** | — | idem |
| `apiServerKey` | **em lugar nenhum** | — | Vive só na preferência protegida |

**A única exceção deliberada** à regra de transcrições é o *resultado final de um run iniciado pelo
próprio usuário no Raycast*, truncado em 4000 caracteres. Justificativa: o servidor evicta o status
terminal em 1 h (`_RUN_STATUS_TTL = 3600`) e o stream de eventos não é retomável — sem esse cache o
usuário perderia o resultado da própria tarefa. Está sujeito à poda de 24 h e à ação
"Limpar dados locais".

### 9.2 Código

```ts
import { Cache, LocalStorage } from "@raycast/api";

export const StorageKeys = {
  endpointCache: "hermes.endpoint.v1",
  lastSessionId: "hermes.lastSessionId.v1",
  /** {provider?, model?} — ação "Usar como modelo padrão". Vence a preferência (P3). */
  defaultModel: "hermes.defaultModel.v1",
  /** {provider?, model?} — ação "Usar só na próxima pergunta". Apagar após consumir. */
  nextTurnModel: "hermes.nextTurnModel.v1",
  runIndex: "hermes.runs.v1",
  approvalPrefix: "hermes.approval.v1.",
  runResultPrefix: "hermes.runResult.v1.",
} as const;

/* ───────────────── LocalStorage (durável, assíncrono) ───────────────── */

export async function readJson<TValue>(key: string): Promise<TValue | undefined> {
  const raw = await LocalStorage.getItem<string>(key);
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw) as TValue;
  } catch {
    await LocalStorage.removeItem(key);
    return undefined;
  }
}

export async function writeJson<TValue>(key: string, value: TValue | undefined): Promise<void> {
  if (value === undefined) {
    await LocalStorage.removeItem(key);
    return;
  }
  await LocalStorage.setItem(key, JSON.stringify(value));
}

/* ───────────────────── Cache (síncrono, LRU 10 MB) ──────────────────── */

const cache = new Cache({ namespace: "hermes" });

interface CacheEnvelope<TValue> {
  v: 1;
  at: number;
  data: TValue;
}

export function cacheRead<TValue>(key: string, maxAgeMs: number): TValue | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const envelope = JSON.parse(raw) as CacheEnvelope<TValue>;
    if (envelope.v !== 1 || Date.now() - envelope.at > maxAgeMs) return undefined;
    return envelope.data;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

export function cacheWrite<TValue>(key: string, data: TValue): void {
  cache.set(key, JSON.stringify({ v: 1, at: Date.now(), data } satisfies CacheEnvelope<TValue>));
}

export const CacheTtl = {
  capabilities: 5 * 60_000,
  modelOptions: 10 * 60_000,
  skills: 5 * 60_000,
  toolsets: 10 * 60_000,
  sessionsFirstPage: 30_000,
} as const;

/** Padrão stale-while-revalidate: devolve o cache na hora e atualiza em segundo plano. */
export async function cachedFetch<TValue>(key: string, ttlMs: number, loader: () => Promise<TValue>): Promise<TValue> {
  const hit = cacheRead<TValue>(key, ttlMs);
  if (hit !== undefined) return hit;
  const fresh = await loader();
  cacheWrite(key, fresh);
  return fresh;
}

/* ─────────────────────── Índice de runs (R: §7.7) ───────────────────── */

export interface StoredRun {
  runId: string;
  sessionId?: string;
  /** Prompt truncado em 200 chars só para identificar o item na lista. */
  promptPreview: string;
  createdAt: number;
  lastKnownStatus: string;
  lastKnownEvent?: string;
  baseUrl: string;
}

const MAX_STORED_RUNS = 20;
const RUN_INDEX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function listStoredRuns(): Promise<StoredRun[]> {
  const runs = (await readJson<StoredRun[]>(StorageKeys.runIndex)) ?? [];
  const cutoff = Date.now() - RUN_INDEX_MAX_AGE_MS;
  return runs.filter((run) => run.createdAt >= cutoff);
}

/** Chamar ANTES de renderizar qualquer coisa após o 202, para nunca órfãos um run. */
export async function rememberRun(run: StoredRun): Promise<void> {
  const runs = await listStoredRuns();
  const next = [run, ...runs.filter((r) => r.runId !== run.runId)].slice(0, MAX_STORED_RUNS);
  await writeJson(StorageKeys.runIndex, next);
}

export async function updateStoredRun(runId: string, patch: Partial<StoredRun>): Promise<void> {
  const runs = await listStoredRuns();
  await writeJson(
    StorageKeys.runIndex,
    runs.map((run) => (run.runId === runId ? { ...run, ...patch } : run)),
  );
}

export async function forgetRun(runId: string): Promise<void> {
  const runs = await listStoredRuns();
  await writeJson(
    StorageKeys.runIndex,
    runs.filter((run) => run.runId !== runId),
  );
  await LocalStorage.removeItem(StorageKeys.approvalPrefix + runId);
  await LocalStorage.removeItem(StorageKeys.runResultPrefix + runId);
}

/* ──────────────────── Aprovações e resultados de run ────────────────── */

export interface StoredApproval {
  runId: string;
  command?: string;
  description?: string;
  choices: string[];
  requestId?: string;
  receivedAt: number;
}

export function saveApprovalRequest(approval: StoredApproval): Promise<void> {
  return writeJson(StorageKeys.approvalPrefix + approval.runId, approval);
}

export function loadApprovalRequest(runId: string): Promise<StoredApproval | undefined> {
  return readJson<StoredApproval>(StorageKeys.approvalPrefix + runId);
}

export function clearApprovalRequest(runId: string): Promise<void> {
  return LocalStorage.removeItem(StorageKeys.approvalPrefix + runId);
}

export interface StoredRunResult {
  runId: string;
  status: string;
  /** Truncado em 4000 chars. */
  output?: string;
  error?: string;
  savedAt: number;
}

export function saveRunResult(result: StoredRunResult): Promise<void> {
  return writeJson(StorageKeys.runResultPrefix + result.runId, {
    ...result,
    output: result.output?.slice(0, 4000),
    error: result.error?.slice(0, 2000),
  });
}

export function loadRunResult(runId: string): Promise<StoredRunResult | undefined> {
  return readJson<StoredRunResult>(StorageKeys.runResultPrefix + runId);
}

/* ─────────────────────────── Manutenção ─────────────────────────────── */

const APPROVAL_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Chamar no início de "Execuções do Hermes". Barato: um allItems + alguns removeItem. */
export async function pruneLocalData(): Promise<void> {
  const all = await LocalStorage.allItems<Record<string, string>>();
  const now = Date.now();
  for (const [key, raw] of Object.entries(all)) {
    const isApproval = key.startsWith(StorageKeys.approvalPrefix);
    const isResult = key.startsWith(StorageKeys.runResultPrefix);
    if (!isApproval && !isResult) continue;
    try {
      const parsed = JSON.parse(raw) as { receivedAt?: number; savedAt?: number };
      const stamp = parsed.receivedAt ?? parsed.savedAt ?? 0;
      const maxAge = isApproval ? APPROVAL_MAX_AGE_MS : RESULT_MAX_AGE_MS;
      if (now - stamp > maxAge) await LocalStorage.removeItem(key);
    } catch {
      await LocalStorage.removeItem(key);
    }
  }
}

/** Ação "Limpar dados locais" das configurações. Não toca em nada no Hermes. */
export async function clearAllLocalData(): Promise<void> {
  await LocalStorage.clear();
  cache.clear();
}
```

### 9.3 Contratos de otimização incremental

- **Derivações de turnos:** `createTurnDerivationCache()` mantém uma LRU de no máximo
  128 entradas. A troca de `sessionId` chama `clear()`; dentro da mesma conversa, a
  identidade do objeto e `revision` do turno (junto de modo e janela de pensamento)
  evitam remontar pergunta, resposta e etapas a cada delta.
- **Cache e retry:** `cachedFetch` compartilha o loader em voo por chave, grava no
  `Cache` somente após sucesso e libera a entrada quando a Promise termina. Como a Promise
  é COMPARTILHADA, o loader nunca recebe o `AbortSignal` de uma tela: cancelar uma tela
  rejeitaria o pedido de outra. Quem precisa cancelar guarda o próprio `cancelled`. O atraso do
  retry HTTP observa o `AbortSignal`, de modo que cancelar a ação interrompe a espera e
  não dispara a segunda chamada.
- **Lista de conversas:** o polling de 4 s consulta somente a primeira página e a
  mescla na frente do feed, preservando páginas antigas já carregadas. A fronteira da
  primeira página anterior (fixadas + limite de não-fixadas) é removida antes da mescla,
  para que uma sessão removida não sobreviva na cauda quando outra subir de página. A
  carga inicial, **Atualizar lista**/atualização manual revalidam a janela inteira;
  `loadMore` apenas acrescenta a próxima página. Com mais de uma página carregada, o
  `has_more` da primeira só pode DERRUBAR o flag do feed: ele fala do que vem depois da
  página 1, não depois da última carregada, e religá-lo reexibiria "carregar mais" numa
  lista completa a cada ciclo.
- **Títulos das execuções:** os `sessionId` são deduplicados antes dos `GET` de
  enriquecimento; no máximo três requisições rodam em paralelo. O `AbortSignal` do
  efeito cancela os pedidos e o cleanup impede que respostas tardias gravem títulos ou
  atualizem a tela.
- **Aprovações:** gravação, leitura e limpeza do pedido pendente passam pelo
  `withStorageLock` da própria chave, para que uma aprovação automática (pedido e resposta
  no mesmo burst do stream) não deixe registro órfão. A chave é o `run_id` DO PEDIDO,
  guardado à parte: `runIdRef` aponta para a run viva e já mudou quando a fila avança.

---

## 10. O CONTRATO DE SINCRONIZAÇÃO (R1–R10)

O Desktop e o Raycast falam com **servidores HTTP diferentes**, mas gravam no **mesmo
`state.db`**. O backend do Desktop roda um watcher de mtime a cada 0,5 s sobre
`state.db`/`state.db-wal` e empurra `sessions.changed` para a UI dele. Latência típica de uma
escrita do Raycast aparecer no Desktop: **1–3 s**; pior caso ≈ **12 s** (0,5 s de detecção + piso de
2 s de broadcast + 10 s de throttle do cliente). O caminho é um push por socket, então funciona
mesmo com a janela do Desktop escondida.

Estas dez regras são o que mais provavelmente será violado em silêncio. Cada uma tem uma
consequência de código verificável.

**R1 — Falar SOMENTE com `http://127.0.0.1:<porta>` usando `Authorization: Bearer <API_SERVER_KEY>`.**
O backend próprio do Desktop usa porta efêmera (`--port 0`, anunciada só no stdout do processo
filho) e um token de 32 bytes que **nunca** toca o disco. É inalcançável — nem tente port-scan.
*Código:* toda requisição passa por `rawRequest()`; nenhum outro `fetch` no projeto. A porta vem de
`discovery.ts`, nunca é hardcoded fora do fallback documentado.

**R2 — Resolver `HERMES_HOME` e o perfil como o Hermes resolve, e ficar nesse perfil.**
`HERMES_HOME` → senão a pasta padrão da plataforma (`%LOCALAPPDATA%\hermes` no Windows, `~/.hermes` no macOS). Perfil: `%APPDATA%\Hermes\active-profile.json` →
`<home>\active_profile` → `default`. Para perfil nomeado, toda rota também existe sob `/p/{perfil}`,
**mas exige a `API_SERVER_KEY` daquele perfil** (falha fechada, 401).
*Código:* MVP assume perfil `default` e rotas sem prefixo. `discovery.ts` já lê o `hermes_home` de
`gateway.pid`. Um 404 com `{"error":"Unknown or unconfigured profile"}` é o sinal preciso de perfil
errado — já mapeado em `errors.ts`.

**R3 — `"source": "desktop"` em TODA sessão criada.**
O default `api_server` é classificado como *plataforma de mensageria* e é **excluído** dos Recents
do Desktop; a conversa vai parar na seção "Messaging" com o rótulo "API". Valores aceitos:
`api_server, hermes_browser, browser, cli, telegram, discord, slack, desktop, dashboard` —
**qualquer outra coisa vira `api_server` silenciosamente**.
*Código:* `createSession()` sempre injeta `source: RAYCAST_SESSION_SOURCE` e a constante é
`"desktop"`. Não existe preferência para isso. Nunca aceite `source` como parâmetro.

**R4 — Uma sessão só é "real" para o Desktop com ≥ 1 mensagem.**
A barra lateral consulta `min_messages=1`. Uma sessão criada e abandonada é uma linha invisível no
banco — exatamente o lixo "Untitled" que o Desktop passou a evitar criando linhas preguiçosamente.
*Código:* nunca chame `createSession()` isolado a partir de um botão "Nova conversa". Use
`startConversation()`, que cria a sessão `source:"desktop"`, inicia a run em `/v1/runs` e limpa
a sessão se a criação da run falhar; a tela só nasce no primeiro envio.

**R5 — Metadados duráveis só por `PATCH /api/sessions/{id}`; nunca escrever no `state.db`.**
Campos aceitos: exatamente `title, end_reason, pinned, archived, hidden, unread`. Qualquer outro ⇒
400 `unsupported_session_field`; valor não-booleano num dos 4 flags ⇒ 400 `invalid_session_field`.
Escrever SQLite direto pularia a validação de unicidade de título, o bookkeeping derivado e a
disciplina de WAL — e ainda assim dispararia o watcher, deixando a UI inconsistente.
*Código:* `SessionPatch` tem literalmente esses 6 campos e nada mais. Nenhum módulo importa `sqlite`.
Bônus verificado: `pinned` é reconciliado nos dois sentidos pelo Desktop — um `PATCH {pinned:true}`
do Raycast é adotado por ele no próximo refresh.

**R6 — Nunca presuma que o cache local está fresco. Não existe push do Hermes para clientes externos.**
`sessions.changed` só é transmitido no WebSocket do backend do Desktop.
*Código:* revalidar em cada ativação de view (`useCachedPromise` com revalidate, ou
`revalidate()` no `onAppear`); TTL de 30 s para a primeira página; enquanto uma lista estiver em
foreground, poll de 2–5 s é o equivalente pragmático do `sessions.changed`. Nunca renderize só o
Cache sem disparar a revalidação.

**R7 — Respeitar as convenções de id e ciclo de vida.**
Ids gerados pelo servidor: `api_<epoch>_<8hex>`; do Desktop: 8 chars hex. Id não pode ter `\r`,
`\n`, `\0`, formas de path traversal, nem passar de 256 chars. Id duplicado ⇒ 409 `session_exists`.
**Títulos são globalmente únicos no banco** — colisão faz rollback do create inteiro e devolve 400
`invalid_title`. Para ramificar, use `POST /api/sessions/{id}/fork` (encerra o pai com
`end_reason: "branched"` e liga `parent_session_id`, que é o que o aninhamento do Desktop espera).
*Código:* gere ids com `raycast_${Date.now()}_${randomUUID().slice(0, 8)}`; trate 409 gerando outro
id automaticamente uma vez; trate 400 `invalid_title` pedindo outro título ao usuário.
**Atenção:** o fork sempre carimba `source: "api_server"` no filho, e `source` **não é patchável** —
então um fork **não** aparece nos Recents do Desktop. Diga isso na UI ou ofereça "nova conversa"
como alternativa quando a visibilidade importar.

**R8 — Deep link em vez de tentar controlar o Desktop.**
`hermes://open/<sessionId>` foca aquela conversa num Desktop já rodando. É a ação
"Abrir no Hermes Desktop". Não injete em `localStorage`, IPC ou plugin socket do Desktop.
*Código:* `hermesDesktopSessionUrl()` + `open()` do `@raycast/api`. Valide o id (sem `/`, `\`, `:`,
`..`) antes de abrir.

**R9 — Não disputar a mesma sessão com o gateway.**
Dois turnos concorrentes no mesmo `session_id` são *permitidos* por design (o `session_id` é escopo
de conversa, não de autorização) mas **não há trava entre superfícies** — as escritas se intercalam.
*Código:* mantenha no máximo um turno vivo por `session_id` no Raycast; desabilite "Enviar" enquanto
houver stream aberto para aquela sessão; para tarefas longas prefira `/v1/runs` com um `session_id`
próprio do Raycast.

**R10 — Degradar com elegância quando o gateway estiver fora.**
O processo `hermes gateway run` é **destacado**: sobrevive ao fechamento do Desktop, mas também pode
ser parado sozinho.
*Código:* `GET /health` (público) antes de qualquer trabalho — é o que `discovery.ts` já faz; estado
vazio claro "Hermes não está em execução" com ação de recuperação `start_hermes`; em
`ECONNREFUSED`, `invalidateBaseUrl()` e re-resolver uma vez antes de mostrar erro.

**Corolário de segurança (C2 da pesquisa):** `session_id` e `session_key` são escopos de
conversa/memória, **não** namespaces de autorização. Quem tem a chave lê qualquer sessão. Já as
aprovações de ferramenta são isoladas por `run_id` — aprovar num run nunca desbloqueia outro.
Nunca aprove automaticamente: mostre sempre `command` e `description` ao usuário.

---

## 11. ARMADILHAS (cada uma com o sintoma que o dev veria)

1. **Header `Origin`.** Qualquer requisição com `Origin` recebe **403 com corpo vazio**, *antes* da
   autenticação. **Sintoma:** 403 inexplicável, `Content-Length: 0`, mesmo com a chave certa; e
   `/health`, que não precisa de auth, também falha. **Regra:** nunca defina `Origin`, `mode` ou
   `credentials`; o `fetch` do Node não envia `Origin` sozinho.
2. **`localhost` vs `127.0.0.1`.** A porta 8642 escuta **só IPv4**. O Node pode resolver `localhost`
   para `::1`. **Sintoma:** `ECONNREFUSED` com o Hermes visivelmente rodando; `curl` funciona e o
   extension não. **Regra:** literal `127.0.0.1` sempre; `normalizeBaseUrl()` já reescreve.
3. **Porta 8644 responde `/health`.** É o adaptador de **webhook** e devolve
   `{"status":"ok","platform":"webhook"}`. **Sintoma:** a descoberta "acha" o Hermes e todo endpoint
   depois dá 404. **Regra:** aceitar só `platform === "hermes-agent"`.
4. **`source` default `api_server` some dos Recents.** **Sintoma:** a conversa criada pelo Raycast
   não aparece no Desktop — mas existe se você buscar. Ela foi para "Messaging → API". **Regra:** R3.
5. **Sessão com 0 mensagens é invisível.** **Sintoma:** "criei a conversa e o Desktop não mostra".
   **Regra:** R4 — criar e mandar o primeiro turno na mesma ação.
6. **Título é único no banco inteiro.** Criar/renomear com título repetido faz **rollback do create**
   e devolve **400 `invalid_title`**. **Sintoma:** "Nova conversa" falha na segunda vez que o usuário
   usa o mesmo título sugerido. **Regra:** títulos derivados do prompt + sufixo; tratar 400
   `invalid_title` como validação de formulário, não como erro de sistema.
7. **Fork carimba `source: "api_server"` no filho** e `source` não é patchável. **Sintoma:** o fork
   não aparece nos Recents do Desktop, embora a conversa original apareça.
8. **Paginação de sessões com fixados.** Linhas `pinned` são inseridas **além** do `limit` e
   `has_more` conta só as não fixadas. **Sintoma:** paginação repetindo itens ou pulando páginas.
   **Regra:** `nextSessionOffset()`.
9. **`GET /api/sessions/{id}/messages` pode devolver outro `session_id`.** Ele resolve continuações
   de compressão para frente. **Sintoma:** ações subsequentes batem na sessão errada. **Regra:**
   sempre adotar o `session_id` da resposta.
10. **Compressão rotaciona a sessão no meio do turno.** `assistant.completed.session_id` e
    `run.completed.session_id` podem ser um id **filho**. **Sintoma:** depois de uma conversa longa,
    "Continuar" abre um histórico truncado. **Regra:** persistir o id efetivo do fim do turno.
11. **`order=latest` conta o offset a partir da mensagem mais nova**, mas devolve a página em ordem
    cronológica. **Sintoma:** paginar "para trás" com `order=oldest` traz o começo da conversa.
12. **Não existe `include_compacted` nesta API.** Em sessões que sofreram compactação in-place, a
    transcrição termina na fronteira da compactação. **Sintoma:** faltam mensagens antigas que o
    Desktop mostra. Não há workaround — apenas não prometa histórico completo.
13. **Abortar `/api/sessions/{id}/chat/stream` INTERROMPE o agente.** **Sintoma:** fechar a janela do
    Raycast cancela a resposta. **Regra:** só para perguntas curtas; tarefas longas em `/v1/runs`.
14. **`/v1/runs` sobrevive ao fechamento da janela, mas o stream de eventos NÃO é retomável.**
    Ao desconectar, a fila é destruída; reconectar dá **404 `run_not_found`** enquanto o run continua
    rodando. **Sintoma:** "a execução sumiu" ao reabrir. **Regra:** recuperação por polling de
    `GET /v1/runs/{id}` a cada ~2 s; persistir eventos importantes na hora.
15. **Consumidor único no stream de run.** Dois `GET .../events` simultâneos disputam a mesma fila e
    o primeiro que sair mata o outro. **Sintoma:** eventos faltando/intercalados entre duas telas.
    **Regra:** no máximo um stream por `run_id` no processo inteiro.
16. **TTL de transporte de 5 min.** Um run sem assinante por >300 s perde a fila; assinar depois dá
    404 — **mas o run segue vivo** e `stop`/`steer`/`approval` continuam funcionando. **Sintoma:**
    404 no `/events` de um run que `GET /v1/runs/{id}` mostra como `running`.
17. **Status terminal expira em 1 h; reinício do gateway apaga tudo.** **Sintoma:** 404 em um run que
    você sabe que terminou. **Regra:** 404 significa "expirado/perdido", **nunca** "falhou".
18. **`status: "started"` do 202 não é um estado.** **Sintoma:** switch de UI sem caso
    correspondente. **Regra:** os estados são exatamente os 7; o 202 só confirma o aceite.
19. **`waiting_for_approval` é "grudento".** Se a aprovação for respondida em outra superfície
    (Telegram, CLI, Desktop), `GET /v1/runs/{id}` continua reportando `waiting_for_approval` até o
    run terminar. **Sintoma:** UI travada em "Aguardando aprovação" com o run avançando. **Regra:**
    quando `status` e `last_event` divergirem, confie em `last_event` e nos eventos do stream.
20. **`stopping` não é terminal e não emite evento.** Não existe `run.stopping` no stream: o stop é
    invisível até o `run.cancelled`. **Sintoma:** clicou em Parar e "nada acontece". **Regra:**
    renderizar "Interrompendo" a partir do 200 do próprio `/stop` e continuar o polling.
21. **`POST /v1/runs/{id}/stop` devolve 404 quando o run já acabou** (ele checa as referências vivas,
    não o registro de status). **Regra:** tratar como "já finalizou".
22. **Steer só com status exatamente `running`** — `queued`, `waiting_for_approval`, `stopping` e
    terminais dão **409**. **Regra:** desabilitar o campo fora de `running`.
23. **Aprovação é FIFO e não endereçável.** O `request_id` do evento é só correlação; o POST resolve
    a **mais antiga** (ou todas com `resolve_all`). **Sintoma:** aprovar "a segunda" aprova a
    primeira. **Regra:** mostrar uma por vez.
24. **Não existe endpoint que liste aprovações pendentes.** **Regra:** persistir todo
    `approval.request` recebido; se o run estiver `waiting_for_approval` sem payload em cache, ofereça
    apenas `deny` (sempre seguro) e explique que os detalhes se perderam.
25. **`choices` varia.** Pode ser `["once","session","always","deny"]`, `["once","session","deny"]` ou
    `["once","deny"]`. **Regra:** renderizar exatamente o array recebido; nunca hardcode.
26. **Timeout de aprovação de 300 s no servidor.** A thread do agente fica bloqueada até alguém
    responder. **Sintoma:** run parado por 5 min e depois seguindo como negado.
27. **`tool.started` do stream de run NÃO traz `args`** (o stream de sessão traz). Também não há id
    de tool call para correlacionar com `tool.completed`. **Sintoma:** impossível parear ferramentas
    concorrentes; correlacione por nome + ordem.
28. **Falha de ferramenta em `/v1/runs` é `tool.completed` com `error: true`.** Não existe
    `tool.failed` nesse stream (existe no vocabulário do stream de sessão, mas sem produtor).
29. **`usage` do run é cumulativo da sessão**, não o custo daquele run. **Sintoma:** números
    absurdamente altos numa tarefa curta. Rotule como "uso da sessão".
30. **`ensure_ascii=True` no stream de runs.** Acentos chegam como `\uXXXX`. **Sintoma:** um parser
    por regex mostra "Concluído". **Regra:** sempre `JSON.parse`.
31. **`TextDecoder` sem `{stream:true}` corta caracteres multibyte** entre chunks. **Sintoma:** "�"
    esporádico no meio de palavras acentuadas no stream de sessão.
32. **`: keepalive` a cada 30 s.** Um timeout de inatividade < 30 s mata streams saudáveis; e tratar
    o comentário como evento quebra o parser. **Regra:** timeout só até os headers.
33. **Erros depois do stream abrir vêm com HTTP 200.** No stream de sessão: `event: error` seguido de
    `event: done`. **Sintoma:** `response.ok` é true e a UI declara sucesso com resposta vazia.
34. **Nem todo `jobs` está disponível, mas `capabilities.jobs_admin` é `false` mesmo com as rotas
    registradas.** **Sintoma:** você esconde o comando de automações sem motivo. **Regra:** não gate
    jobs por capabilities; chame `GET /api/jobs` e trate **501** `Cron module not available` como
    indisponível.
35. **Schedule inválido devolve 500, não 400** (o `ValueError` vaza pelo handler genérico).
    **Sintoma:** "erro interno do servidor" ao digitar "amanhã às 9". **Regra:** `validateSchedule()`
    local antes de enviar; e 500 cujo corpo contenha "Invalid schedule" vira erro de validação.
36. **`POST /api/jobs/{id}/run` NÃO executa na hora** — só marca `next_run_at = agora`; o ticker roda
    a cada ~60 s e precisa de um gateway vivo. **Sintoma:** "Executar agora" parece não fazer nada.
    **Regra:** rotule "Agendar para agora" e avise sobre o ~1 minuto.
37. **`PATCH {enabled:false}` NÃO é pausar.** O job fica `enabled:false` com `state:"scheduled"` e
    nunca dispara — um morto silencioso. **Regra:** sempre `/pause` e `/resume`.
38. **Nunca envie `repeat` num PATCH de job.** O servidor grava o inteiro cru onde o resto do código
    espera `{times, completed}` e a próxima execução quebra com `AttributeError`. `updateJob()` já
    remove o campo.
39. **`GET /api/jobs` sem `include_disabled=true` esconde os pausados.** **Sintoma:** o usuário pausa
    uma automação e ela desaparece da lista.
40. **`job_id` precisa casar `^[a-f0-9]{12}$`**, senão 400 antes de qualquer coisa.
41. **`deliver: "origin"` em job criado por REST não entrega nada** — a origem carimbada é
    `api_server`, que não é uma plataforma de mensageria. **Regra:** default `"local"`.
42. **Não existe `GET /v1/runs` (lista)** nem busca de sessões (`/api/sessions/search` é só do
    dashboard). **Regra:** índice de runs no LocalStorage; busca de conversas é filtro client-side
    sobre a página carregada.
43. **`/v1/skills` não tem `enabled`, `source`, paginação nem filtro** — e já vem só com as
    habilitadas, ordenadas por `(category, name)`. Filtre no cliente.
44. **`/v1/toolsets` é lento** (resolve 27+ toolsets no event loop do servidor) e não tem flag em
    `features` — gate pela presença de `endpoints.toolsets`. Sempre sirva do Cache primeiro.
45. **`capabilities` de modelo só tem `fast` e `reasoning`.** Não prometa janela de contexto, visão
    ou suporte a ferramentas na UI.
46. **Enviar `model: "hermes-agent"`** significa "usar o padrão do gateway" e **não** é persistido na
    sessão. **Sintoma:** o modelo escolhido "não gruda".
47. **`/health/detailed` exige auth** (diferente de `/health`). Um 401 ali é chave errada, não
    servidor fora.
48. **Só `Bearer ` com B maiúsculo e um espaço.** `bearer`, `Token`, `X-Api-Key`, `?api_key=` e
    cookies **não existem** — todos dão 401.
49. **Cap de 10 execuções concorrentes** (`max_concurrent_runs`, default 10) ⇒ 429 com
    `Retry-After: 1`. Vale para `/v1/runs`; as rotas de chat de sessão não contam nesse cap, mas
    podem dar 503 durante drain.
50. **Corpo > 10 MB ⇒ 413.** Relevante ao colar clipboard gigante.
51. **Menu Bar Commands não existem no Windows.** Não declare `mode: "menu-bar"`.
52. **Não existe `Action.OpenExtensionPreferences`.** Use `<Action onAction={openExtensionPreferences} />`.
53. **`EventSource` global não é garantido no Node do Raycast.** Use `fetch` + `getReader()` — nunca
   adicione a dependência `eventsource` "por segurança".
54. **React 19 pode invocar efeitos duas vezes em desenvolvimento.** Sem a flag `cancelled` +
    `AbortController` você abre dois streams que se intercalam no mesmo texto.
55. **Cada `setState` de streaming atravessa a ponte IPC até o host WPF.** Sem `createTextBuffer` a
    UI engasga em respostas longas.

---

## 12. ESTRATÉGIA DE TESTES

### 12.1 Ferramenta: **vitest**, como `devDependency`

Justificativa contra a regra "evitar dependências adicionais quando a API nativa resolver": essa
regra é sobre dependências de **runtime**, que entram no bundle do `ray build`, aumentam a superfície
de supply-chain e precisam funcionar dentro do sandbox do Raycast. `vitest` é `devDependency`: não é
importado por nenhum arquivo de `src/`, logo o esbuild do `ray build` nunca o inclui. A alternativa
sem dependência (`node --test` + type stripping) depende da versão de Node instalada na máquina do
desenvolvedor (o type stripping só é estável a partir do 22.18) e não dá watch nem cobertura —
trocaríamos uma devDependency por fragilidade de ambiente. O brief exige explicitamente testes de
"cliente HTTP, parsing de eventos e tratamento de erros"; `vitest` é o menor caminho para isso.

```jsonc
// package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "ray lint",
  "build": "ray build -e dist"
},
"devDependencies": { "vitest": "^2.1.0" }
```

Os testes ficam em **`tests/`**, na raiz, importando de `../src/lib/...`. Nunca dentro de `src/`,
para não confundir a varredura de comandos do `ray build`.

### 12.2 Testável sem servidor (a maior parte)

| Alvo | O que testar |
|---|---|
| `createSseParser` | **O caso de maior risco.** Fixtures reais do §8.8 alimentadas em fatias de 1 byte, em 3 bytes, e num único chunk — o resultado precisa ser idêntico. CRLF partido entre chunks (`"...\r"` + `"\n..."`). CR isolado. BOM inicial. `data:` sem espaço após o `:`. `data` multilinha. Campo sem `:`. Bloco sem `data` (não deve emitir). `: keepalive` e `: stream closed` como comentários, sem encerrar o evento em curso. `flush()` com linha final sem `\n\n`. |
| `parseSessionChatEvent` / `parseRunEvent` | Discriminação correta (nome do evento vs campo `event`), JSON inválido devolve `undefined` sem lançar, evento desconhecido não quebra o `switch`. |
| `consumeSessionChatStream` | Response falso: `new Response(new Blob([bytes]).stream())`. Verificar: adoção do `session_id` efetivo de `assistant.completed`/`run.completed`; `content` vindo de `assistant.completed` e não da concatenação; `run.completed.messages` preservado; `error` + `done` produzindo `errorMessage` com HTTP 200; abort a meio caminho marcando `interrupted`. |
| `consumeRunEventStream` | Acúmulo de `message.delta`; `tool.completed` com `error:true`; `approval.request` chamando o handler; `: stream closed` marcando `closedByServer`; EOF sem evento terminal. |
| `mapHttpError` | Uma asserção por linha da tabela §4.2, com os corpos **literais** da pesquisa (401, 403 vazio, 404 `session_not_found`, 400 `invalid_title`, 409 `session_exists`, 413, 429 com `Retry-After`, 500 "Invalid schedule", 501, 503 `gateway_draining`, `404: Not Found` em text/plain). Verificar `userMessage`, `recovery` e `retryable`. |
| `sanitizeTechnical` | Um `Authorization: Bearer <token>` colado no texto sai como `Bearer ***`. **Teste obrigatório de segurança.** |
| `toHermesError` | `ECONNREFUSED`, `AbortError`, `TimeoutError`. |
| `parseSimpleYaml` / `extractConfigPort` | O bloco real (`platforms: → api_server: → extra: → port: 8642`); os 4 caminhos equivalentes; comentários e linhas em branco; mapeamento em fluxo `extra: {port: 8642}`; arquivo sem a chave ⇒ `undefined`; indentação inconsistente ⇒ `undefined` (nunca lançar). |
| `extractDotenvPort` | Só devolve `API_SERVER_PORT`; `export API_SERVER_PORT=8642`; valor entre aspas; **teste explícito de que uma linha `API_SERVER_KEY=...` no fixture nunca aparece na saída**. |
| `buildPortCandidates` / `resolveBaseUrl` | Com `deps` injetado (`readTextFile`, `env`, `probe` falsos): ordem config → env → dotenv → 8642; deduplicação; preferência explícita vence e **não** cai para descoberta; 8644 respondendo `webhook` produz `HermesWrongServerError`; cache invalidado quando o `pid` do gateway muda. |
| `validateSchedule` | `every 30m`, `every 2 hours`, `0 9 * * *`, `*/5 * * * *`, `30m`, ISO; e as rejeições `@daily`, `MON`, "amanhã às 9", vazio. |
| `nextSessionOffset` | Página com 3 fixados e 47 normais ⇒ próximo offset = +47. |
| `flattenModelOptions` | Provedor sem `capabilities`; linha esqueleto (`authenticated:false`); `featured_models` vazio. |
| `normalizeBaseUrl` | `localhost` → `127.0.0.1`; sem esquema; barra final; entrada inválida ⇒ `undefined`. |
| `status.ts` | Os 7 rótulos exatos; `isTerminalRunStatus`; fallback "Desconhecido". |
| `cacheRead` / TTL, `rememberRun` (cap de 20, poda de 7 dias) | Com um duplo de `LocalStorage`/`Cache` injetado por `vi.mock("@raycast/api")`. |

Padrão para o cliente HTTP sem rede: `vi.stubGlobal("fetch", vi.fn())` devolvendo `Response`
sintéticos. Cobrir: header `Authorization` presente e **`Origin` ausente** (asserção explícita),
`Content-Type` só com corpo, `X-Hermes-Session-Key` apenas nas 3 rotas certas, retry único de GET em
429/503, `invalidateBaseUrl()` chamado em `ECONNREFUSED`.

### 12.3 Só com Hermes real (checklist manual, documentado no README)

1. `/health` e `/v1/capabilities` com chave certa e com chave errada (401 amigável).
2. Descoberta automática com `apiUrl` vazio; e apontando `apiUrl` para `http://127.0.0.1:8644`
   (deve dar "não é o Hermes API Server").
3. Criar conversa pelo Raycast → **conferir no Desktop em ≤ 12 s, na seção Recents**.
4. Continuar no Raycast uma conversa criada no Desktop.
5. Renomear/fixar/arquivar pelo Raycast → refletir no Desktop.
6. `hermes://open/<id>` focando a conversa certa.
7. Resposta em streaming com acentuação e emoji (valida o `TextDecoder`).
8. Parar no meio do streaming (verificar que o turno realmente para).
9. Run longo: fechar a janela do Raycast, reabrir, ver o status recuperado por polling.
10. Pedido de aprovação real: `command`/`description` exibidos, aprovar `once`, negar.
11. Steer durante `running` e a rejeição 409 fora dele.
12. 429 (disparar 11 runs simultâneos) e 503 durante `hermes gateway restart`.
13. Sessão com centenas de mensagens (paginação `order=latest`).
14. Derrubar o gateway no meio de um stream (erro de rede tratado).
15. Criar job com schedule inválido (500 virando mensagem de validação), pausar, retomar,
    "agendar para agora", excluir.
16. `npx ray lint` e `npx ray build` limpos; e uma passada de teclado puro por todos os comandos.

### 12.4 Regras de projeto que mantêm isso testável

- Nada em `src/lib/` importa `react`. Só `preferences.ts`, `storage.ts` e a função de deep link
  tocam `@raycast/api`.
- `hermes-events.ts` recebe um `Response` — nunca faz `fetch`.
- `discovery.ts` aceita `DiscoveryDeps` opcional; em produção fica `undefined`.
- Nenhuma fixture de teste contém segredo: os fixtures de `.env` usam
  `API_SERVER_KEY=NAO_E_UMA_CHAVE_REAL_apenas_fixture`, e existe um teste que garante que esse valor
  jamais aparece em nenhuma saída de função.

---

## 13. Sequência de chamadas de referência

```text
Primeiro uso
  isConfigured() == false → tela de boas-vindas → openExtensionPreferences()

Todo comando
  requireApiKey() → resolveBaseUrl() → (Cache) getCapabilities()

Perguntar ao Hermes (pergunta nova)
  resolveModelChoice() (override do próximo envio → default local → preferência)
  createConversation({source:"desktop"}) + POST /v1/runs({session_id, input})
    → openRunEventStream() com createTextBuffer; queda cai para polling
    → persistir run_id e sessionId efetivo antes de pintar a execução
  Ações: Copiar · Colar · Continuar · Nova conversa · Abrir no Hermes Desktop

Conversas
  listSessions({limit: maxHistoryItems}) → filtro client-side por título
  getSessionMessages(id, {limit:120, order:"latest"}) → paginar com offset += 120
  updateSession / forkSession / deleteSession (com Alert de confirmação)

Executar tarefa
  createRun({input, sessionId}) → rememberRun(...) ANTES de renderizar
  openRunEventStream(runId) IMEDIATAMENTE (TTL de transporte é 5 min)
  approval.request → saveApprovalRequest → botões vindos de choices → respondToApproval
  Parar: stopRun → render "Interrompendo" → polling de getRun até cancelled/completed
  Sem stream: polling de getRun a cada 2 s; 404 = "expirado", nunca "falhou"

Modelos
  getModelOptions() → flattenModelOptions() → escolha por tarefa (não altera a preferência)
  setSessionModel(id, {...}) quando o usuário quiser fixar o modelo da conversa
```
