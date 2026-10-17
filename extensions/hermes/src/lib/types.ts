/**
 * Tipos derivados das respostas reais do Hermes API Server 0.20.4
 * (gateway/platforms/api_server.py), conferidos contra as capturas ao vivo em
 * docs/research/fixtures/CAPTURAS-AO-VIVO.md.
 *
 * Este arquivo descreve **a forma do fio**, não uma validação: nada aqui roda em
 * runtime. Trate todo campo como possivelmente ausente e todo literal de status
 * como possivelmente desconhecido — o servidor pode evoluir sem avisar.
 *
 * Regras deste módulo: somente tipos (100% apagável), zero import de @raycast/api,
 * zero `enum` (a remoção nativa de tipos do Node não transforma `enum`).
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
  /** "hermes-agent" no api_server; "webhook" na porta 8644. Este campo é o gate da descoberta. */
  platform: string;
  version: string;
}

/**
 * Mapa `features` de GET /v1/capabilities. As 27 chaves abaixo são as observadas
 * ao vivo; ficam opcionais porque a versão do servidor pode não trazer todas.
 */
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
  /** `false` no servidor de referência: as rotas /api/jobs* existem mas estão desligadas. */
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
  "desktop" | "cli" | "dashboard" | "hermes_browser" | "browser" | "api_server" | "telegram" | "discord" | "slack";

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

export type RouteSource = "global" | "model_routes" | "raw_request" | "session_model_lock" | "session_model_override";

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

/**
 * Os 7 estados possíveis, enumerados a partir de todo `_set_run_status(...)` do servidor.
 * "started" NÃO é um deles (é só o campo do 202 de POST /v1/runs).
 * Acrescentar um literal aqui quebra a compilação de `status.ts` de propósito.
 */
export type RunStatus =
  "queued" | "running" | "waiting_for_approval" | "stopping" | "completed" | "cancelled" | "failed";

export type TransportPhase = "not_sent" | "starting" | "accepted" | "streaming" | "reconciling";

export interface RunDiagnostic {
  kind: "provider_authentication" | "connection" | "expired" | "storage" | "other";
  message: string;
}

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
  /** Só em failed. Já redigido pelo servidor. */
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

/**
 * Os 12 eventos deste stream. A união é FECHADA de propósito: um membro coringa
 * (`event: string` com index signature) faria toda propriedade virar `unknown`
 * depois do narrowing, o que anula a discriminação. Frames de nomes futuros
 * chegam ao parser e caem no `default` do switch — a asserção mora lá, num
 * lugar só.
 */
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
  | (RunEventBase & { event: "run.cancelled" });

/** Nomes válidos do campo `event`. Derivado da união: não repetir a lista à mão. */
export type RunEventName = RunEvent["event"];

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

/**
 * Os 11 eventos deste stream. Aqui o discriminador é o nome do evento SSE, que o
 * parser copia para `type` (o campo não vem dentro do JSON). União fechada pelo
 * mesmo motivo de `RunEvent`.
 */
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
  | (SessionStreamEnvelope & { type: "done" });

/** Nomes válidos do evento SSE deste stream. */
export type SessionChatEventName = SessionChatEvent["type"];

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
