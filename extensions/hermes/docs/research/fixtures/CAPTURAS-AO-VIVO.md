# Capturas ao vivo do Hermes API Server (evidência empírica)

Capturado em 2026-08-19 contra o servidor real em `http://127.0.0.1:8642`
(Hermes Agent v0.20.4). Estas são transcrições literais do fio, não
reconstruções a partir do código-fonte.

## 1. `POST /v1/chat/completions` com `stream: true`

Requisição:
```json
{"model":"hermes-agent","stream":true,"messages":[{"role":"user","content":"Responda apenas: ok"}]}
```

Resposta (SSE literal):
```
data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": null}]}

data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"content": "ok"}, "finish_reason": null}]}

data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 19997, "completion_tokens": 5, "total_tokens": 20002}}

data: [DONE]
```

**Observações que importam para a implementação:**
- Formato OpenAI padrão. Termina com o sentinela `data: [DONE]`.
- O primeiro chunk traz `delta.role` sem conteúdo — não renderizar como texto.
- `usage` chega apenas no último chunk, junto de `finish_reason: "stop"`.
- **Custo:** ~20.000 tokens de entrada por chamada. O Hermes injeta um
  system prompt grande. Isso não é anomalia; é o custo base de qualquer
  turno e deve ser considerado ao sugerir uso da extensão.

## 2. `POST /v1/runs` + `GET /v1/runs/{id}/events`

Requisição: `{"input":"Diga apenas: pronto"}`

Resposta imediata:
```json
{"run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "status": "started"}
```

Stream de eventos (SSE literal):
```
data: {"event": "message.delta", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.501083, "delta": "pr"}

data: {"event": "message.delta", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.5569196, "delta": "onto"}

data: {"event": "reasoning.available", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.948054, "text": "pronto"}

data: {"event": "run.completed", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.9905906, "output": "pronto", "usage": {"input_tokens": 19996, "output_tokens": 6, "total_tokens": 20002}}

: stream closed
```

**Três diferenças em relação ao `/v1/chat/completions` que quebram um
parser ingênuo — todas confirmadas empiricamente:**

1. **Não existe `data: [DONE]` neste stream.** Um parser que espera o
   sentinela do OpenAI fica pendurado até o timeout.
2. **O stream termina com uma linha de comentário SSE: `: stream closed`.**
   Linhas iniciadas por `:` são comentários no protocolo SSE e costumam ser
   descartadas por parsers. Aqui ela é o sinal de término e precisa ser
   tratada.
3. **O tipo do evento vem no campo `event` DENTRO do JSON**, não no campo
   `event:` do protocolo SSE. Ler `event:` do SSE retorna sempre vazio.

Também note que `usage` usa `input_tokens`/`output_tokens` aqui, enquanto
`/v1/chat/completions` usa `prompt_tokens`/`completion_tokens`. Os dois
formatos coexistem e precisam de normalização.

## 3. `GET /v1/capabilities` (trecho relevante)

```json
{"object": "hermes.api_server.capabilities", "platform": "hermes-agent",
 "auth": {"type": "bearer", "required": true},
 "features": {"chat_completions": true, "chat_completions_streaming": true,
  "responses_api": true, "responses_streaming": true, "run_submission": true,
  "run_status": true, "run_events_sse": true, "run_stop": true,
  "run_steer": true, "run_approval_response": true,
  "tool_progress_events": true, "approval_events": true,
  "session_resources": true, "model_options": true, "session_chat": true,
  "session_chat_streaming": true, "session_fork": true,
  "session_model_lock": true, "admin_config_rw": false, "jobs_admin": false,
  "memory_write_api": false, "skills_api": true, "audio_api": false,
  "realtime_voice": false,
  "session_continuity_header": "X-Hermes-Session-Id",
  "session_key_header": "X-Hermes-Session-Key", "cors": false}}
```

**Atenção:** neste servidor `jobs_admin` é `false` e `memory_write_api` é
`false`. As rotas `/api/jobs*` existem no código, mas a capability que as
governa está desligada. O comando de Automações precisa checar
`features.jobs_admin` antes de se oferecer, em vez de assumir que existe.

## 4. `GET /api/sessions?limit=3` — prova da sincronia com o Desktop

Retornou sessões reais criadas pelo Hermes Desktop, com
`"source": "desktop"`, incluindo uma intitulada "Desenvolver plugin Hermes
para Raycast" com 87 mensagens. Confirma na prática que a extensão lê o
mesmo acervo que o Desktop escreve.

Campos por sessão (observados): `id`, `source`, `user_id`, `model`,
`title`, `started_at`, `ended_at`, `end_reason`, `message_count`,
`tool_call_count`, `input_tokens`, `output_tokens`, `cache_read_tokens`,
`cache_write_tokens`, `reasoning_tokens`, `estimated_cost_usd`,
`actual_cost_usd`, `api_call_count`, `parent_session_id`, `last_active`,
`preview`, `pinned`, `archived`, `hidden`, `has_system_prompt`,
`has_model_config`.

Formato de id observado no Desktop: `20260819_153125_397cfb`
(`YYYYMMDD_HHMMSS_6hex`). O formato `api_<epoch>_<8hex>` citado na pesquisa
aplica-se a sessões criadas pelo api_server.
