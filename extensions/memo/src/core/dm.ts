type Emoji = string

/**
 * This class must be serializable in order to be persisted
 * to local storage.
 */
export class Page {
    private readonly _id: string
    private readonly _title: string
    private readonly _type: PageType
    private readonly _icon: Emoji | undefined

    constructor(id: string, title: string, type: PageType, icon?: Emoji) {
        this._id = id
        this._title = title
        this._type = type
        this._icon = icon
    }

    get icon(): Emoji | undefined {
        return this._icon
    }

    get title(): string {
        return this._title
    }

    get type(): PageType {
        return this._type
    }

    get id(): string {
        return this._id
    }
}

export const enum PageType {
    NotionPage = "NOTION_PAGE",
    NotionDatabase = "NOTION_DATABASE",
}

export function stringToPageType(s: string): PageType | Error {
    if (s == PageType.NotionPage || s == "page") {
        return PageType.NotionPage
    }
    if (s == PageType.NotionDatabase || s == "database") {
        return PageType.NotionDatabase
    }
    return new Error(`unknown page type:${s}`)
}

export function pageTypeToDisplayString(p: PageType): string {
    return p.toString().replaceAll("_", " ")
}

export function pageTypeToNotionType(p: PageType): string | Error {
    if (p === PageType.NotionPage) {
        return "page"
    }
    if (p === PageType.NotionDatabase) {
        return "database"
    }
    return new Error(`not a notion page type:${p}`)
}

export type DeserializedPage = {
    readonly _id: string
    readonly _title: string
    readonly _type: PageType
    readonly _icon: Emoji | undefined
}

export type PageContent = {
    text: string
    isURL: boolean
}
