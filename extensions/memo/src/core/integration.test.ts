import { ApiImpl as NotionApi } from "../notion/api"
import { NotionAdapter } from "./adapters"
import { NOTION_INTEGRATION_TEST_API_TOKEN } from "../config"
import { Page } from "./dm"
import { Api as WebApi } from "../web/api"
import { WebAdapter } from "../adapters/web/adapter"
import { URL, URLMetadata } from "../adapters/web/dm"
import { NewWebAdapter } from "../adapters/web/impl"
import { RaycastAdapter } from "../adapters/raycast/adapter"
import { Api as RaycastApi } from "../raycast/api"
import { NewRaycastAdapter } from "../adapters/raycast/impl"

jest.setTimeout(20 * 1000) // 20s

function getNotionAdapter(): NotionAdapter {
    const notionApi = new NotionApi(NOTION_INTEGRATION_TEST_API_TOKEN)
    return new NotionAdapter(notionApi)
}

function getWebAdapter(): WebAdapter {
    const webApi = new WebApi()
    return NewWebAdapter(webApi)
}

function getRaycastAdapter(): RaycastAdapter {
    const raycastApi = new RaycastApi()
    return NewRaycastAdapter(raycastApi)
}

test("integration_test_notion_adapter_search", async () => {
    const result = await getNotionAdapter().search("")

    expect(result instanceof Error).toBeFalsy()
    expect((result as Page[]).length).toBeGreaterThan(0)
})

test("integration_test_notion_adapter_search_avoid_timeout", async () => {
    const notionAdapter = getNotionAdapter()

    async function check() {
        const result = await notionAdapter.search("page")
        expect(result instanceof Error).toBeFalsy()
    }

    for (let i = 0; i < 10; i++) {
        await check()
    }
})

test("integration_test_notion_adapter_create_page", async () => {
    const adapter = getNotionAdapter()

    const dbPageSearch = await adapter.search("quick notes")
    expect(dbPageSearch instanceof Error).toBeFalsy()
    expect((dbPageSearch as Page[]).length).toBeGreaterThan(0)
    const dbPage = (dbPageSearch as Page[])[0]

    const result = await getNotionAdapter().addPage(dbPage, new Date().toLocaleString(), {
        text: "integration test",
        isURL: false,
    })
    expect(result instanceof Error).toBeFalsy()
})

test("integration_test_notion_adapter_append_paragraph", async () => {
    const adapter = getNotionAdapter()

    const pageSearch = await adapter.search("append here")
    expect(pageSearch instanceof Error).toBeFalsy()
    expect((pageSearch as Page[]).length).toBeGreaterThan(0)
    const page = (pageSearch as Page[])[0]

    const content = `${new Date().toLocaleString()}: integration test`
    const result = await getNotionAdapter().addContent(page, {
        text: content,
        isURL: false,
    })
    expect(result instanceof Error).toBeFalsy()
})

test("integration_test_web_adapter_get_metadata", async () => {
    const adapter = getWebAdapter()

    const metadata = await adapter.getMetadata(
        URL.fromString("https://www.npmjs.com/package/html-metadata-parser") as URL
    )

    expect(metadata instanceof Error).toBeFalsy()
    expect((metadata as URLMetadata).title).toContain("html-metadata-parser")
})
