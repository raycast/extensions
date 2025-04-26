import { showToast, Toast, Clipboard, LaunchProps } from "@raycast/api"
import fetch from "node-fetch"
import * as cheerio from "cheerio"
import { URL } from "url"

const MAX_CONCURRENCY = 5 // Limit concurrent fetches

interface Arguments {
  repoIdentifier: string
}

function isValidHttpUrl(string: string): boolean {
  let url
  try {
    url = new URL(string)
  } catch (_) {
    return false
  }
  return url.protocol === "http:" || url.protocol === "https:"
}

function getBaseUrl(repoIdentifier: string): string | null {
  if (isValidHttpUrl(repoIdentifier)) {
    const url = new URL(repoIdentifier)
    if (url.hostname === "github.com" || url.hostname === "www.github.com") {
      const pathParts = url.pathname.split("/").filter(Boolean)
      if (pathParts.length >= 2) {
        return `https://deepwiki.com/${pathParts[0]}/${pathParts[1]}/`
      }
    }
  } else {
    const parts = repoIdentifier.split("/")
    if (parts.length === 2 && parts[0] && parts[1]) {
      return `https://deepwiki.com/${parts[0]}/${parts[1]}/`
    }
  }
  return null
}

async function crawlPage(
  url: string,
  baseUrl: string,
  visited: Set<string>,
  queue: string[],
  allContent: string[],
): Promise<void> {
  if (!url.startsWith(baseUrl)) {
    console.warn(`[CrawlPage Skip] URL ${url} does not start with base ${baseUrl}`)
    return
  }

  await showToast(Toast.Style.Animated, `Crawling: ${url}`)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[CrawlPage Fetch Error] Failed ${url}: ${response.statusText}`)
      await showToast(Toast.Style.Failure, `Failed to fetch ${url}: ${response.statusText}`)
      return
    }
    const html = await response.text()
    const $ = cheerio.load(html)

    const contentSelector = "div.prose-custom"
    const pageContent = $(contentSelector).text().trim()
    if (pageContent) {
      allContent.push(`## Page: ${url}\n\n${pageContent}\n\n---\n\n`)
    } else {
      console.warn(`[CrawlPage No Content] No content found with selector '${contentSelector}' on ${url}`)
    }

    $("a[href]").each((_, element) => {
      const link = $(element).attr("href")
      if (link) {
        const absoluteUrl = new URL(link, url).toString()
        const absoluteUrlWithoutHash = absoluteUrl.split("#")[0]

        if (absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrlWithoutHash)) {
          visited.add(absoluteUrlWithoutHash)
          queue.push(absoluteUrl)
        }
      }
    })
  } catch (error) {
    console.error(`[CrawlPage Error] Error crawling ${url}:`, error)
    await showToast(
      Toast.Style.Failure,
      `Error crawling ${url}`,
      error instanceof Error ? error.message : "Unknown error",
    )
  }
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { repoIdentifier } = props.arguments
  const baseUrl = getBaseUrl(repoIdentifier)

  if (!baseUrl) {
    await showToast(
      Toast.Style.Failure,
      "Invalid Repository Identifier",
      "Please use format 'org/repo' or a GitHub URL.",
    )
    return
  }

  const initialToast = await showToast(Toast.Style.Animated, `Starting crawl for ${repoIdentifier}...`)

  const visited = new Set<string>()
  const queue: string[] = []
  const allContent: string[] = []
  const activeCount = { current: 0 }
  let resolveCompletion: () => void
  const completionPromise = new Promise<void>((resolve) => {
    resolveCompletion = resolve
  })

  const checkCompletion = () => {
    if (queue.length === 0 && activeCount.current === 0) {
      initialToast.hide()
      resolveCompletion()
    }
  }

  const crawlWorker = async () => {
    activeCount.current++
    try {
      while (queue.length > 0) {
        const url = queue.shift()
        if (!url) {
          continue
        }

        const urlWithoutHash = url.split("#")[0]
        if (visited.has(urlWithoutHash)) {
          continue
        }
        visited.add(urlWithoutHash)

        await crawlPage(url, baseUrl, visited, queue, allContent)
      }
    } catch (e) {
      console.error("[Worker Error] Uncaught error in worker loop:", e)
    } finally {
      activeCount.current--
      checkCompletion()
    }
  }

  queue.push(baseUrl)

  const initialWorkers = Math.min(MAX_CONCURRENCY, queue.length)
  for (let i = 0; i < initialWorkers; i++) {
    crawlWorker()
  }

  checkCompletion()

  await completionPromise

  if (allContent.length > 0) {
    const finalContent = allContent.join("\n")
    await Clipboard.copy(finalContent)
    await showToast(Toast.Style.Success, "Crawl Complete", `Copied content for ${visited.size} pages to clipboard.`)
  } else {
    console.error("[Completion] Failure: No content extracted.")
    await showToast(
      Toast.Style.Failure,
      "Crawl Failed",
      "No content extracted. Check the base URL or website structure.",
    )
  }
}
