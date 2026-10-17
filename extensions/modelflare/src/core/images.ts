import type { ModelflareClient } from './client.js'
import { ModelflareError } from './errors.js'
import type { ClassifiedModel } from './models.js'

export interface ImageCall {
  model: ClassifiedModel
  prompt: string
  /**
   * Model-specific request fields, sent unchanged. The exact contract for each
   * model is on its docs page (`modelDocsUrl` in `docs.ts`).
   */
  parameters?: Record<string, unknown>
  /** Use the edits route for models on the OpenAI-compatible Images API. */
  edit?: boolean
  signal?: AbortSignal
}

export interface GeneratedImage {
  url?: string
  base64?: string
  mimeType?: string
  revisedPrompt?: string
}

interface OpenAIImagesResponse {
  data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>
}

interface GeminiPart {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
}

function fromOpenAI(body: OpenAIImagesResponse): GeneratedImage[] {
  return (body.data ?? []).flatMap((item) => {
    const image: GeneratedImage = {
      ...(item.url ? { url: item.url } : {}),
      ...(item.b64_json ? { base64: item.b64_json } : {}),
      ...(item.revised_prompt ? { revisedPrompt: item.revised_prompt } : {}),
    }
    return image.url || image.base64 ? [image] : []
  })
}

function fromGemini(body: GeminiResponse): GeneratedImage[] {
  const images: GeneratedImage[] = []
  for (const candidate of body.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = part.inlineData?.data ?? part.inline_data?.data
      if (!data) continue
      const mimeType = part.inlineData?.mimeType ?? part.inline_data?.mime_type
      images.push({ base64: data, ...(mimeType ? { mimeType } : {}) })
    }
  }
  return images
}

/**
 * Generates or edits an image on the route the model is served on: Gemini
 * image models use `/v1/models/{model}:generateContent`, every other image
 * model uses `/v1/images/generations` or `/v1/images/edits`.
 */
export async function generateImage(client: ModelflareClient, call: ImageCall): Promise<GeneratedImage[]> {
  const { model, prompt, parameters = {}, edit = false, signal } = call
  if (model.kind !== 'image' || !model.imageRoute) {
    throw new TypeError(`${model.id} is not an image model`)
  }
  const requestOptions = { method: 'POST', ...(signal ? { signal } : {}) }

  let images: GeneratedImage[]
  if (model.imageRoute === 'gemini-generate-content') {
    const { contents, ...rest } = parameters
    const body = {
      contents: contents ?? [{ role: 'user', parts: [{ text: prompt }] }],
      ...rest,
    }
    const response = await client.json<GeminiResponse>(`models/${encodeURIComponent(model.id)}:generateContent`, {
      ...requestOptions,
      body,
    })
    images = fromGemini(response)
  } else {
    const response = await client.json<OpenAIImagesResponse>(edit ? 'images/edits' : 'images/generations', {
      ...requestOptions,
      body: { model: model.id, prompt, ...parameters },
    })
    images = fromOpenAI(response)
  }

  if (images.length === 0) {
    throw new ModelflareError({ kind: 'upstream', message: `${model.id} returned no image` })
  }
  return images
}
