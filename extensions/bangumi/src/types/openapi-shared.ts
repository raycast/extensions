/** Shared OpenAPI shapes extracted from duplicated blocks in generated.ts */

type Components = import("./generated").components

export type UnknownHeaders = { [name: string]: unknown }

export type JsonContent<T> = {
  headers: UnknownHeaders
  content: {
    "application/json": T
  }
}

export type NoContentResponse = {
  headers: UnknownHeaders
  content?: never
}

/** 302 redirect response with optional Location header */
export type RedirectResponse = {
  headers: UnknownHeaders & {
    Location?: string
  }
  content?: never
}

/** Rating score distribution (1-10) */
export type RatingScoreCount = {
  /** @example 5 */
  1?: number
  /** @example 3 */
  2?: number
  /** @example 4 */
  3?: number
  /** @example 6 */
  4?: number
  /** @example 46 */
  5?: number
  /** @example 267 */
  6?: number
  /** @example 659 */
  7?: number
  /** @example 885 */
  8?: number
  /** @example 284 */
  9?: number
  /** @example 130 */
  10?: number
}

export type RevisionPaginationQuery = {
  /** @description 分页参数 */
  limit?: Components["parameters"]["default_query_limit"]
  /** @description 分页参数 */
  offset?: Components["parameters"]["default_query_offset"]
}

export type QueryOnlyParameters<TQuery> = {
  query: TQuery
  header?: never
  path?: never
  cookie?: never
}

export type PagedRevisionListResponses = {
  /** @description Successful Response */
  200: JsonContent<Components["schemas"]["Paged_Revision"]>
  /** @description Validation Error */
  400: Components["responses"]["400"]
}

export type PaginatedJson200Responses<T> = {
  /** @description Successful Response */
  200: JsonContent<T>
  /** @description Validation Error */
  400: Components["responses"]["400"]
  /** @description Not Found */
  404: Components["responses"]["404"]
}

export type CharacterIdPathParameters = {
  query?: never
  header?: never
  path: {
    /** @description 角色 ID */
    character_id: Components["parameters"]["path_character_id"]
  }
  cookie?: never
}

export type PersonIdPathParameters = {
  query?: never
  header?: never
  path: {
    /** @description 人物 ID */
    person_id: Components["parameters"]["path_person_id"]
  }
  cookie?: never
}

export type SubjectIdPathParameters = {
  query?: never
  header?: never
  path: {
    /** @description 条目 ID */
    subject_id: Components["parameters"]["path_subject_id"]
  }
  cookie?: never
}

export type IndexIdPathParameters = {
  query?: never
  header?: never
  path: {
    /** @description 目录 ID */
    index_id: Components["parameters"]["path_index_id"]
  }
  cookie?: never
}

export type CharacterCollectionMutation = {
  parameters: CharacterIdPathParameters
  requestBody?: never
  responses: {
    /** @description Successful Response */
    204: Components["responses"]["200-no-content"]
    /** @description character ID not valid */
    400: Components["responses"]["400"]
    /** @description not authorized */
    401: Components["responses"]["401"]
    /** @description 角色不存在 */
    404: Components["responses"]["404"]
  }
}

export type PersonCollectionMutation = {
  parameters: PersonIdPathParameters
  requestBody?: never
  responses: {
    /** @description Successful Response */
    204: Components["responses"]["200-no-content"]
    /** @description person ID not valid */
    400: Components["responses"]["400"]
    /** @description not authorized */
    401: Components["responses"]["401"]
    /** @description 人物不存在 */
    404: Components["responses"]["404"]
  }
}

export type IndexCollectionMutation = {
  parameters: IndexIdPathParameters
  requestBody?: never
  responses: {
    200: Components["responses"]["200-no-content"]
    401: Components["responses"]["401"]
    404: Components["responses"]["404"]
    500: Components["responses"]["500"]
  }
}

export type SubjectCollectionWriteOperation = {
  parameters: SubjectIdPathParameters
  requestBody?: {
    content: {
      "application/json": Components["schemas"]["UserSubjectCollectionModifyPayload"]
    }
  }
  responses: {
    /** @description Successful Response */
    204: Components["responses"]["200-no-content"]
    /** @description Validation Error */
    400: Components["responses"]["400"]
    /** @description Unauthorized */
    401: Components["responses"]["401"]
    /** @description 用户不存在 */
    404: Components["responses"]["404"]
  }
}

export type SubjectListQuery = {
  /** @description 条目类型 */
  type: Components["schemas"]["SubjectType"]
  /** @description 条目分类，参照 `SubjectCategory` enum */
  cat?: Components["schemas"]["SubjectCategory"]
  /** @description 是否系列，仅对书籍类型的条目有效 */
  series?: boolean
  /** @description 平台，仅对游戏类型的条目有效 */
  platform?: string
  /** @description 排序，枚举值 {date|rank} */
  sort?: string
  /** @description 年份 */
  year?: number
  /** @description 月份 */
  month?: number
} & RevisionPaginationQuery

export type SubjectListOperation = {
  parameters: QueryOnlyParameters<SubjectListQuery>
  requestBody?: never
  responses: PaginatedJson200Responses<Components["schemas"]["Paged_Subject"]>
}

export type PersonRevisionListOperation = {
  parameters: QueryOnlyParameters<
    RevisionPaginationQuery & {
      /** @description 角色 ID */
      person_id: number
    }
  >
  requestBody?: never
  responses: PagedRevisionListResponses
}

export type CharacterRevisionListOperation = {
  parameters: QueryOnlyParameters<
    RevisionPaginationQuery & {
      /** @description 角色 ID */
      character_id: number
    }
  >
  requestBody?: never
  responses: PagedRevisionListResponses
}

export type SubjectRevisionListOperation = {
  parameters: QueryOnlyParameters<
    RevisionPaginationQuery & {
      /** @description 条目 ID */
      subject_id: number
    }
  >
  requestBody?: never
  responses: PagedRevisionListResponses
}

export type EpisodeRevisionListOperation = {
  parameters: QueryOnlyParameters<
    RevisionPaginationQuery & {
      /** @description 章节 ID */
      episode_id: number
    }
  >
  requestBody?: never
  responses: PagedRevisionListResponses
}
