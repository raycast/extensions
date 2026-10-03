import * as cheerio from "cheerio"
import { getDeepWikiUrls } from "./deepwiki-url"

export async function getDeepWikiPage(repoIdentifier: string): Promise<{ url: string; content: string }> {
  const { pageUrl } = getDeepWikiUrls(repoIdentifier)

  const response = await fetch(pageUrl)
  if (!response.ok) {
    throw new Error(`Could not load the DeepWiki page (${response.status}).`)
  }

  const $ = cheerio.load(await response.text())
  const content = $("div.prose-custom").first().text().trim()
  if (!content) {
    throw new Error("No documentation was found on this DeepWiki page.")
  }

  return { url: pageUrl, content: content.slice(0, 30000) }
}
