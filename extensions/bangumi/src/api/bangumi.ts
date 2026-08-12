import createClient from "openapi-fetch"
import type { paths } from "@/types/generated"
import { getAccessToken } from "@raycast/utils"
import { EpisodeCollectionType, EpisodeType, SubjectCollectionType, SubjectType } from "@/shared/const"

interface BangumiErrorResponse {
  title: string
  description: string
  request_id?: string
  details?:
    | string
    | {
        error?: string
        path?: string
        method?: string
      }
}

class BangumiApiError extends Error {
  readonly response: BangumiErrorResponse

  constructor(response: BangumiErrorResponse) {
    let message = response.description || response.title || "Unknown API Error"

    if (response.details) {
      if (typeof response.details === "string") {
        message += ` - ${response.details}`
      } else {
        const parts = []
        if (response.details.error) parts.push(response.details.error)
        if (response.details.path) {
          const method = response.details.method ? `${response.details.method} ` : ""
          parts.push(`[${method}${response.details.path}]`)
        }

        if (parts.length > 0) {
          message += ` - ${parts.join(" ")}`
        } else {
          message += ` - ${JSON.stringify(response.details)}`
        }
      }
    }
    super(message)

    this.name = "BangumiApiError"
    this.response = response
  }
}

class Bangumi {
  client = createClient<paths>({
    baseUrl: "https://api.bgm.tv/",
    headers: {
      "User-Agent": `maxchang3/raycast-bangumi (https://github.com/maxchang3/raycast-bangumi)`,
    },
  })

  constructor() {
    this.client.use({
      onRequest({ request }) {
        const { token } = getAccessToken()
        request.headers.set("Authorization", `Bearer ${token}`)
        return request
      },
    })
  }

  private username?: string

  private async getUsername({ signal }: { signal?: AbortSignal } = {}): Promise<string> {
    if (this.username) return this.username
    const { data, error } = await this.client.GET("/v0/me", { signal })
    if (error) throw new BangumiApiError(error)
    this.username = data.username
    return this.username
  }

  async getUserSubjectEpisodeCollection({
    subjectId,
    query,
    signal,
  }: {
    subjectId: number
    query?: {
      offset?: number
      limit?: number
      episode_type?: EpisodeType
    }
    signal?: AbortSignal
  }) {
    const { data, error } = await this.client.GET("/v0/users/-/collections/{subject_id}/episodes", {
      params: {
        query,
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getMyCollections({
    query,
    signal,
  }: {
    query: {
      subject_type?: SubjectType
      type?: SubjectCollectionType
      limit?: number
      offset?: number
    }
    signal?: AbortSignal
  }) {
    const username = await this.getUsername({ signal })
    const { data, error } = await this.client.GET("/v0/users/{username}/collections", {
      params: {
        query,
        path: { username },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getSubjectById({ subjectId, signal }: { subjectId: number; signal?: AbortSignal }) {
    const { data, error } = await this.client.GET("/v0/subjects/{subject_id}", {
      params: {
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getSubjectCharacters({ subjectId, signal }: { subjectId: number; signal?: AbortSignal }) {
    const { data, error } = await this.client.GET("/v0/subjects/{subject_id}/characters", {
      params: {
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getCharacterById({ characterId, signal }: { characterId: number; signal?: AbortSignal }) {
    const { data, error } = await this.client.GET("/v0/characters/{character_id}", {
      params: {
        path: { character_id: characterId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getRelatedSubjectsByCharacterId({ characterId, signal }: { characterId: number; signal?: AbortSignal }) {
    const { data, error } = await this.client.GET("/v0/characters/{character_id}/subjects", {
      params: {
        path: { character_id: characterId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getRelatedSubjectsBySubjectId({ subjectId, signal }: { subjectId: number; signal?: AbortSignal }) {
    const { data, error } = await this.client.GET("/v0/subjects/{subject_id}/subjects", {
      params: {
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async searchSubjects({
    keyword,
    limit,
    offset,
    subjectType,
    signal,
  }: {
    keyword: string
    limit: number
    offset: number
    subjectType?: SubjectType
    signal?: AbortSignal
  }) {
    const { data, error } = await this.client.POST("/v0/search/subjects", {
      params: {
        query: { limit, offset },
      },
      body: {
        keyword,
        filter: subjectType ? { type: [subjectType] } : undefined,
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async searchCharacters({
    keyword,
    limit,
    offset,
    signal,
  }: {
    keyword: string
    limit: number
    offset: number
    signal?: AbortSignal
  }) {
    const { data, error } = await this.client.POST("/v0/search/characters", {
      params: {
        query: { limit, offset },
      },
      body: { keyword },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async updateEpisodeCollection({
    episodeId,
    type,
    signal,
  }: {
    episodeId: number
    type: EpisodeCollectionType
    signal?: AbortSignal
  }) {
    const { data, error } = await this.client.PUT("/v0/users/-/collections/-/episodes/{episode_id}", {
      params: {
        path: { episode_id: episodeId },
      },
      body: {
        type,
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async updateSubjectEpisodesCollection({
    subjectId,
    episodeIds,
    type,
    signal,
  }: {
    subjectId: number
    episodeIds: number[]
    type: EpisodeCollectionType
    signal?: AbortSignal
  }) {
    const { data, error } = await this.client.PATCH("/v0/users/-/collections/{subject_id}/episodes", {
      params: {
        path: { subject_id: subjectId },
      },
      body: {
        episode_id: episodeIds,
        type,
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getSubjectCollection({ subjectId, signal }: { subjectId: number; signal?: AbortSignal }) {
    const username = await this.getUsername({ signal })
    const { data, error, response } = await this.client.GET("/v0/users/{username}/collections/{subject_id}", {
      params: { path: { username, subject_id: subjectId } },
      signal,
    })
    if (error) {
      if (response.status === 404) return null
      throw new BangumiApiError(error)
    }
    return data
  }

  async updateSubjectCollection({
    subjectId,
    type,
    signal,
  }: {
    subjectId: number
    type: SubjectCollectionType
    signal?: AbortSignal
  }) {
    const { error } = await this.client.POST("/v0/users/-/collections/{subject_id}", {
      params: { path: { subject_id: subjectId } },
      body: { type },
      signal,
    })
    if (error) throw new BangumiApiError(error)
  }

  async getCalendar({ signal }: { signal?: AbortSignal } = {}) {
    const { data, error } = await this.client.GET("/calendar", { signal })
    if (error) throw new BangumiApiError(error)
    return data
  }
}

export const bangumi = new Bangumi()
