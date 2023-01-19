import { Page, PageType } from "./dm"
import { NotionAdapter } from "./adapters"
import { RaycastAdapter } from "../adapters/raycast/adapter"
import { WebAdapter } from "../adapters/web/adapter"
import { URL } from "../adapters/web/dm"

export class Saver {
    private readonly notionAdapter: NotionAdapter
    private readonly raycastAdapter: RaycastAdapter
    private readonly webAdapter: WebAdapter

    constructor(notionAdapter: NotionAdapter, raycastAdapter: RaycastAdapter, webAdapter: WebAdapter) {
        this.notionAdapter = notionAdapter
        this.raycastAdapter = raycastAdapter
        this.webAdapter = webAdapter
    }

    getPages(query: string): Promise<Page[] | Error> {
        return this.notionAdapter.search(query)
    }

    save(to: Page, newContent: string, pageTitle: string): Promise<null | Error> {
        const trimmed = newContent.trim()
        const url = URL.fromString(trimmed)
        const content = {
            text: trimmed,
            isURL: url instanceof URL,
        }

        if (to.type == PageType.NotionPage) {
            return this.notionAdapter.addContent(to, content)
        }
        return this.notionAdapter.addPage(to, pageTitle, content)
    }

    getCopiedText(): Promise<string | Error> {
        return this.raycastAdapter.getCopiedText()
    }

    getURLTitle(content: string): Promise<string | Error> {
        const url = URL.fromString(content.trim())
        if (url instanceof Error) {
            return Promise.resolve(url)
        }

        return this.webAdapter.getMetadata(url).then((rs) => {
            if (rs instanceof Error) {
                return rs
            }
            return rs.title
        })
    }
}
