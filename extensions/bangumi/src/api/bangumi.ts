import createClient from "openapi-fetch"
import type { paths } from "@/types/generated"
import { getAccessToken } from "@raycast/utils"

interface BangumiErrorResponse {
  title: string
  description: string
  details?:
    | string
    | {
        error?: string
        path?: string
      }
}

class BangumiApiError extends Error {
  readonly response: BangumiErrorResponse

  constructor(response: BangumiErrorResponse) {
    super(response.description)

    this.name = "BangumiApiError"
    this.response = response
  }
}

export enum SubjectCollectionType {
  Wish = 1,
  Collect = 2,
  Doing = 3,
  OnHold = 4,
  Dropped = 5,
}

export enum SubjectType {
  Book = 1,
  Anime = 2,
  Music = 3,
  Game = 4,
  Real = 6,
}

export enum EpisodeCollectionType {
  /** 未收藏 */
  NotCollected = 0,
  /** 想看 */
  Wish = 1,
  /** 看过 */
  Watched = 2,
  /** 抛弃 */
  Dropped = 3,
}

export enum EpisodeType {
  /** 本篇 */
  Main = 0,
  /** 特别篇 */
  SP = 1,
  /** OP */
  OP = 2,
  /** ED */
  ED = 3,
  /** 预告/宣传/广告 */
  Trailer = 4,
  /** MAD */
  MAD = 5,
  /** 其他 */
  Other = 6,
}

export const SubjectVerb: Record<SubjectType, string> = {
  [SubjectType.Anime]: "看",
  [SubjectType.Book]: "读",
  [SubjectType.Music]: "听",
  [SubjectType.Game]: "玩",
  [SubjectType.Real]: "看",
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

  private async getUsername(signal?: AbortSignal): Promise<string> {
    if (this.username) return this.username
    const { data, error } = await this.client.GET("/v0/me", { signal })
    if (error) throw new BangumiApiError(error)
    this.username = data.username
    return this.username
  }

  async getUserSubjectEpisodeCollection(
    subjectId: number,
    query?: {
      offset?: number
      limit?: number
      episode_type?: EpisodeType
    },
    signal?: AbortSignal
  ) {
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

  async getMyCollections(
    query: {
      subject_type?: SubjectType
      type?: SubjectCollectionType
      limit?: number
      offset?: number
    },
    signal?: AbortSignal
  ) {
    const username = await this.getUsername(signal)
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

  async getSubjectById(subjectId: number, signal?: AbortSignal) {
    const { data, error } = await this.client.GET("/v0/subjects/{subject_id}", {
      params: {
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async getSubjectCharacters(subjectId: number, signal?: AbortSignal) {
    const { data, error } = await this.client.GET("/v0/subjects/{subject_id}/characters", {
      params: {
        path: { subject_id: subjectId },
      },
      signal,
    })
    if (error) throw new BangumiApiError(error)
    return data
  }

  async searchSubjects(
    keyword: string,
    limit: number,
    offset: number,
    subjectType?: SubjectType,
    signal?: AbortSignal
  ) {
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

  async updateEpisodeCollection(episodeId: number, type: EpisodeCollectionType, signal?: AbortSignal) {
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

  async updateSubjectEpisodesCollection(
    subjectId: number,
    episodeIds: number[],
    type: EpisodeCollectionType,
    signal?: AbortSignal
  ) {
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

  async getSubjectCollection(subjectId: number, signal?: AbortSignal) {
    try {
      const username = await this.getUsername(signal)
      const { data, error } = await this.client.GET("/v0/users/{username}/collections/{subject_id}", {
        params: { path: { username, subject_id: subjectId } },
        signal,
      })
      if (error) {
        // Return null if not collected (usually 404 or specific error)
        return null
      }
      return data
    } catch {
      return null
    }
  }

  async updateSubjectCollection(subjectId: number, type: SubjectCollectionType, signal?: AbortSignal) {
    const { error } = await this.client.POST("/v0/users/-/collections/{subject_id}", {
      params: { path: { subject_id: subjectId } },
      body: { type },
      signal,
    })
    if (error) throw new BangumiApiError(error)
  }

  async getCalendar(signal?: AbortSignal) {
    const { data, error } = await this.client.GET("/calendar", { signal })
    if (error) throw new BangumiApiError(error)
    return data
  }
}

export const bangumi = new Bangumi()
