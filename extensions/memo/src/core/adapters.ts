import { Api as NotionApi } from "../notion/api"
import { Page, PageContent, pageTypeToNotionType, stringToPageType } from "./dm"
import { Block } from "../notion/dm"

export class NotionAdapter {
    private readonly notionApi: NotionApi

    constructor(notionApi: NotionApi) {
        this.notionApi = notionApi
    }

    search(query: string): Promise<Page[] | Error> {
        return this.notionApi
            .search(query)
            .then((blocks) => {
                if (blocks instanceof Error) {
                    return blocks
                }

                const pages: Page[] = []
                for (const block of blocks) {
                    const pageType = stringToPageType(block.type)
                    if (pageType instanceof Error) {
                        return new Error(`${pageType}:convert block type to page type fails`)
                    }
                    pages.push(new Page(block.id, block.title, pageType, block.icon))
                }
                return pages
            })
            .catch((err) => {
                return new Error(`${err}:search page fails`)
            })
    }

    addPage(to: Page, title: string, content: PageContent): Promise<null | Error> {
        const pageType = pageTypeToNotionType(to.type)
        if (pageType instanceof Error) {
            return Promise.resolve(pageType)
        }

        const parent = new Block(to.id, to.title, pageType)
        return this.notionApi.createPage(parent, title, {
            text: content.text,
            url: content.isURL ? content.text : undefined,
        })
    }

    addContent(to: Page, content: PageContent): Promise<null | Error> {
        const pageType = pageTypeToNotionType(to.type)
        if (pageType instanceof Error) {
            return Promise.resolve(pageType)
        }

        const parent = new Block(to.id, to.title, pageType)
        return this.notionApi.appendParagraph(parent, {
            text: content.text,
            url: content.isURL ? content.text : undefined,
        })
    }
}
