import {
    DatabaseObjectResponse,
    PageObjectResponse,
    PartialDatabaseObjectResponse,
    PartialPageObjectResponse,
    RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints"

export type NotionEmoji = string

export class Block {
    private readonly _id: string
    private readonly _type: string
    private readonly _title: string
    // currently only support emoji
    private readonly _icon: NotionEmoji | undefined

    constructor(id: string, title: string, type: string, icon?: NotionEmoji) {
        this._id = id
        this._type = type
        this._title = title
        this._icon = icon
    }

    get icon(): NotionEmoji | undefined {
        return this._icon
    }

    get title(): string {
        return this._title
    }

    get type(): string {
        return this._type
    }

    get id(): string {
        return this._id
    }
}

export const enum NotionBlockType {
    PAGE = "page",
    DATABASE = "database",
}

export type Content = {
    text: string
    url: string | undefined
}
