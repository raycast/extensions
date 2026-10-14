import type { ModelflareClient } from './client.js'
import { ModelflareError } from './errors.js'

export type VideoStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | (string & {})

export interface VideoTask {
  id: string
  status: VideoStatus
  model?: string
  progress?: number
  error?: { message?: string; code?: string }
}

interface VideoResponse {
  id?: string
  task_id?: string
  status?: string
  model?: string
  progress?: number
  error?: { message?: string; code?: string } | null
}

function toTask(body: VideoResponse): VideoTask {
  const id = body.id || body.task_id
  if (!id) throw new ModelflareError({ kind: 'upstream', message: 'The video task response has no id' })
  return {
    id,
    status: body.status ?? 'queued',
    ...(body.model ? { model: body.model } : {}),
    ...(typeof body.progress === 'number' ? { progress: body.progress } : {}),
    ...(body.error ? { error: body.error } : {}),
  }
}

/**
 * Creates an asynchronous video task. The body is the model's documented
 * request envelope and must include `model`.
 */
export async function createVideo(
  client: ModelflareClient,
  body: Record<string, unknown> & { model: string },
  signal?: AbortSignal,
): Promise<VideoTask> {
  const response = await client.json<VideoResponse>('videos', {
    method: 'POST',
    body,
    ...(signal ? { signal } : {}),
  })
  return toTask(response)
}

export async function getVideo(client: ModelflareClient, id: string, signal?: AbortSignal): Promise<VideoTask> {
  const response = await client.json<VideoResponse>(`videos/${encodeURIComponent(id)}`, {
    method: 'GET',
    ...(signal ? { signal } : {}),
  })
  return toTask(response)
}

export interface WaitOptions {
  intervalMs?: number
  /** Gives up after this long. Defaults to 30 minutes. */
  timeoutMs?: number
  signal?: AbortSignal
  onProgress?: (task: VideoTask) => void
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Polls until the task completes; a failed task throws {@link ModelflareError}. */
export async function waitForVideo(client: ModelflareClient, id: string, options: WaitOptions = {}): Promise<VideoTask> {
  const intervalMs = options.intervalMs ?? 5_000
  const deadline = Date.now() + (options.timeoutMs ?? 30 * 60 * 1000)
  for (;;) {
    const task = await getVideo(client, id, options.signal)
    options.onProgress?.(task)
    if (task.status === 'completed') return task
    if (task.status === 'failed') {
      throw new ModelflareError({
        kind: 'upstream',
        message: task.error?.message || `Video task ${id} failed`,
        ...(task.error?.code ? { code: task.error.code } : {}),
      })
    }
    if (Date.now() >= deadline) {
      throw new ModelflareError({ kind: 'timeout', message: `Video task ${id} did not finish in time` })
    }
    await delay(intervalMs, options.signal)
  }
}

/**
 * Streams the finished video. Result URLs expire, so store the file as soon as
 * the task completes.
 */
export async function downloadVideo(client: ModelflareClient, id: string, signal?: AbortSignal): Promise<Response> {
  return client.request(`videos/${encodeURIComponent(id)}/content`, {
    method: 'GET',
    timeoutMs: 10 * 60 * 1000,
    ...(signal ? { signal } : {}),
  })
}
