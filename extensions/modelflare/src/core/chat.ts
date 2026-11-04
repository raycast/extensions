import type { ModelflareClient } from './client.js'
import { ModelflareError } from './errors.js'

export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: string }
  | { type: 'finish'; reason: string | null }

interface ChunkToolCall {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface Chunk {
  choices?: Array<{
    delta?: { content?: string | null; tool_calls?: ChunkToolCall[] }
    finish_reason?: string | null
  }>
  error?: { message?: string; code?: string }
}

async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let boundary = buffer.indexOf('\n')
    while (boundary !== -1) {
      const line = buffer.slice(0, boundary).replace(/\r$/u, '')
      buffer = buffer.slice(boundary + 1)
      if (line.startsWith('data:')) yield line.slice(5).trimStart()
      boundary = buffer.indexOf('\n')
    }
  }
  const rest = buffer.trim()
  if (rest.startsWith('data:')) yield rest.slice(5).trimStart()
}

/**
 * Streams `POST /v1/chat/completions`. Text deltas are yielded as they arrive;
 * tool calls are yielded once complete, after the stream ends.
 */
export async function* streamChatCompletion(
  client: ModelflareClient,
  body: Record<string, unknown> & { model: string; messages: unknown[] },
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const response = await client.request('chat/completions', {
    method: 'POST',
    body: { ...body, stream: true },
    headers: { Accept: 'text/event-stream' },
    timeoutMs: 10 * 60 * 1000,
    ...(signal ? { signal } : {}),
  })
  if (!response.body) throw new ModelflareError({ kind: 'upstream', message: 'The chat response has no body' })

  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>()
  let finishReason: string | null = null
  for await (const data of sseData(response.body)) {
    if (data === '[DONE]') break
    let chunk: Chunk
    try {
      chunk = JSON.parse(data) as Chunk
    } catch {
      continue
    }
    if (chunk.error) {
      throw new ModelflareError({
        kind: chunk.error.code === 'model_not_found' ? 'model_not_found' : 'upstream',
        message: chunk.error.message ?? 'The model returned an error',
        ...(chunk.error.code ? { code: chunk.error.code } : {}),
      })
    }
    for (const choice of chunk.choices ?? []) {
      const content = choice.delta?.content
      if (content) yield { type: 'text', text: content }
      for (const call of choice.delta?.tool_calls ?? []) {
        const index = call.index ?? 0
        const current = toolCalls.get(index) ?? { id: '', name: '', arguments: '' }
        if (call.id) current.id = call.id
        if (call.function?.name) current.name += call.function.name
        if (call.function?.arguments) current.arguments += call.function.arguments
        toolCalls.set(index, current)
      }
      if (choice.finish_reason) finishReason = choice.finish_reason
    }
  }

  for (const [index, call] of [...toolCalls.entries()].sort(([a], [b]) => a - b)) {
    if (!call.name) continue
    yield { type: 'tool_call', id: call.id || `call_${index}`, name: call.name, arguments: call.arguments }
  }
  yield { type: 'finish', reason: finishReason }
}
