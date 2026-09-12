import { Api } from "../notion/api"
import { Block, Content } from "../notion/dm"
import { Page, PageType } from "./dm"
import { NotionAdapter } from "./adapters"
import { deserializePage, serializePage } from "../adapters/raycast/impl"

class MockApi implements Api {
    search(query: string): Promise<Block[] | Error> {
        throw new Error("not implemented")
    }

    appendParagraph(parent: Block, content: Content): Promise<null | Error> {
        throw new Error("not implemented")
    }

    createPage(parent: Block, title: string, content: Content): Promise<null | Error> {
        throw new Error("not implemented")
    }
}

test("test_notion_adapter_search", async () => {
    const api = new MockApi()
    api.search = (query) => {
        return Promise.resolve([new Block("1", query, "page"), new Block("2", query, "database")])
    }
    const adapter = new NotionAdapter(api)

    const query = "haha"
    const result = await adapter.search(query)

    expect(result).toEqual([new Page("1", query, PageType.NotionPage), new Page("2", query, PageType.NotionDatabase)])
})

test("test_notion_adapter_search_api_error", async () => {
    const api = new MockApi()
    api.search = (query) => {
        return Promise.reject("failed")
    }
    const adapter = new NotionAdapter(api)

    const result = await adapter.search("haha")

    expect(result).toBeInstanceOf(Error)
    expect(result.toString()).toContain("failed")
})

test("test_page_serialization", () => {
    const page1 = new Page("abc123", "ngày đẹp trời ☀️", PageType.NotionDatabase, "📜")

    const json = serializePage(page1)
    expect(json).not.toBeInstanceOf(Error)

    const page2 = deserializePage(<string>json)
    expect(page2).not.toBeInstanceOf(Error)

    expect(<Page>page2).toEqual(page1)
    // test getter
    expect((<Page>page2).id).toEqual(page1.id)
})
