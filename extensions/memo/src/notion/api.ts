import { Block, Content, NotionBlockType, NotionEmoji } from "./dm"
import { APIResponseError, Client } from "@notionhq/client"
import {
    DatabaseObjectResponse,
    PageObjectResponse,
    PartialDatabaseObjectResponse,
    PartialPageObjectResponse,
    RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints"
import { NOTION_SEARCH_RETRY } from "../config"

type NotionSearchResult =
    | PageObjectResponse
    | PartialPageObjectResponse
    | PartialDatabaseObjectResponse
    | DatabaseObjectResponse

type TitleProperty = {
    type: "title"
    title: Array<RichTextItemResponse>
    id: string
}

type Response<A> = A | Error

export interface Api {
    search(query: string): Promise<Block[] | Error>

    createPage(parent: Block, title: string, content: Content): Promise<null | Error>

    appendParagraph(parent: Block, content: Content): Promise<null | Error>
}

function isPageObjectResponse(r: NotionSearchResult): r is PageObjectResponse {
    const p = r as PageObjectResponse
    return p.object === "page" && p.parent !== undefined
}

function isDbObjectResponse(r: NotionSearchResult): r is DatabaseObjectResponse {
    const db = r as DatabaseObjectResponse
    return db.object === "database" && db.parent !== undefined
}

function getTitleFromParts(parts: RichTextItemResponse[]): string {
    let title = ""
    if (parts.length == 0) {
        title = "Untitled"
    } else {
        for (const part of parts) {
            title = title.concat(part.plain_text)
        }
    }

    return title
}

function getBlockFromNotionPage(p: PageObjectResponse): Block | null {
    let prop: TitleProperty
    if ("title" in p.properties) {
        // a standalone page
        prop = p.properties["title"] as TitleProperty
    } else if ("Name" in p.properties) {
        // a page inside a DB
        prop = p.properties["Name"] as TitleProperty
    } else {
        // we should not log `properties` as it may expose user's sensitive info
        console.warn(`page title not found`)
        return null
    }

    let icon: NotionEmoji | undefined = undefined
    if (p.icon?.type === "emoji") {
        icon = p.icon.emoji
    }

    return new Block(p.id, getTitleFromParts(prop.title), p.object, icon)
}

function getBlockFromNotionDB(p: DatabaseObjectResponse): Block {
    let icon: NotionEmoji | undefined = undefined
    if (p.icon?.type === "emoji") {
        icon = p.icon.emoji
    }

    return new Block(p.id, getTitleFromParts(p.title), p.object, icon)
}

export class ApiImpl implements Api {
    private apiToken: string
    private readonly client: Client

    constructor(apiToken: string) {
        this.apiToken = apiToken
        this.client = new Client({ auth: apiToken })
    }

    search(query: string): Promise<Block[] | Error> {
        return requestWithRetry(NOTION_SEARCH_RETRY, () => {
            return this.requestSearch(query)
        })
    }

    createPage(parent: Block, title: string, content: Content): Promise<null | Error> {
        return requestWithRetry(NOTION_SEARCH_RETRY, () => {
            return this.requestCreatePage(parent, title, content)
        })
    }

    appendParagraph(parent: Block, content: Content): Promise<null | Error> {
        return requestWithRetry(NOTION_SEARCH_RETRY, () => {
            return this.requestAppendParagraph(parent, content)
        })
    }

    private requestCreatePage(parent: Block, title: string, content: Content): Promise<null | Error> {
        if (parent.type !== NotionBlockType.DATABASE) {
            return Promise.resolve(
                new Error(`create page fails because parent is not a database:parent=${parent},title=${title}`)
            )
        }

        const link = content.url ? { url: content.url } : undefined

        const request = this.client.pages.create({
            parent: { database_id: parent.id },
            properties: {
                title: {
                    title: [
                        {
                            text: {
                                content: title,
                            },
                        },
                    ],
                },
            },
            children: [
                {
                    object: "block",
                    paragraph: {
                        rich_text: [
                            {
                                text: {
                                    content: content.text,
                                    link: link,
                                },
                            },
                        ],
                    },
                },
                ...(link
                    ? [
                          {
                              bookmark: {
                                  url: link.url,
                              },
                          },
                      ]
                    : []),
            ],
        })

        return request
            .then(() => {
                return null
            })
            .catch((err) => {
                const errMsg = `${err}:create page fails:parent=${parent},title=${title}`
                console.error(errMsg)
                return new Error(errMsg)
            })
    }

    private requestSearch(query: string): Promise<Block[] | Error> {
        return this.client
            .search({
                query: query,
                sort: {
                    direction: "descending",
                    timestamp: "last_edited_time",
                },
                page_size: 10,
            })
            .then((response) => {
                if (!response) {
                    console.error("notion search api error")
                    return new Error("notion search api error")
                }

                const blocks: Block[] = []
                for (const rs of response.results) {
                    if (isPageObjectResponse(rs)) {
                        const block = getBlockFromNotionPage(rs)
                        if (block !== null) {
                            blocks.push(block)
                        }
                    } else if (isDbObjectResponse(rs)) {
                        const block = getBlockFromNotionDB(rs)
                        blocks.push(block)
                    }
                }
                return blocks
            })
            .catch((err) => {
                const errMsg = `${err}:notion search api error with query:${query}`
                console.error(errMsg)
                return new Error(errMsg)
            })
    }

    private requestAppendParagraph(parent: Block, content: Content): Promise<null | Error> {
        if (parent.type !== NotionBlockType.PAGE) {
            return Promise.resolve(new Error(`append paragraph fails because parent is not a page:parent=${parent}`))
        }

        const link = content.url ? { url: content.url } : undefined
        const request = this.client.blocks.children.append({
            block_id: parent.id,
            children: [
                {
                    object: "block",
                    paragraph: {
                        rich_text: [
                            {
                                text: {
                                    content: content.text,
                                    link: link,
                                },
                            },
                        ],
                    },
                },
            ],
        })

        return request
            .then(() => {
                return null
            })
            .catch((err) => {
                const errMsg = `${err}:append paragraph fails:parent=${parent}`
                console.error(errMsg)
                return new Error(errMsg)
            })
    }
}

function requestWithRetry<A>(retry: number, requestFunc: () => Promise<Response<A>>): Promise<A | Error> {
    return requestFunc().then((result) => {
        if (result instanceof APIResponseError) {
            if (result.code === "rate_limited" && retry > 0) {
                const delay = getRetryDelay(result)
                if (delay !== null) {
                    console.warn(`${result}:retry left:${retry}`)
                    return delay.then(() => {
                        return requestWithRetry(retry - 1, requestFunc)
                    })
                }
            }
        }

        return result
    })
}

function getRetryDelay(err: APIResponseError): Promise<void> | null {
    const waitTime = err.headers.get("Retry-After")
    if (waitTime === null) {
        return null
    }

    return new Promise((resolve) => setTimeout(resolve, parseInt(waitTime)))
}
