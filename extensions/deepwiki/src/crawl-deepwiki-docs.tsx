import { showToast, Toast, Clipboard, LaunchProps } from "@raycast/api"
import fetch, { Response as FetchResponse } from "node-fetch"
import * as cheerio from "cheerio"
import { URL } from "url"

const MAX_CONCURRENCY = 5 // Limit concurrent fetches

interface Arguments {
  repoIdentifier: string
}

// Define a type for tracking crawl statistics
interface CrawlStats {
  attempted: number
  successful: number
  failed: number
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
  stats: CrawlStats,
  crawlToast: Toast,
): Promise<void> {
  if (!url.startsWith(baseUrl)) {
    return
  }

  crawlToast.title = `Crawling: ${url}`

  let response: FetchResponse | null = null
  try {
    response = await fetch(url)

    if (!response.ok) {
      stats.failed++
      return
    }

    stats.successful++
    const html = await response.text()
    const $ = cheerio.load(html)

    const contentSelector = "div.prose-custom"
    const pageContent = $(contentSelector).text().trim()
    if (pageContent) {
      allContent.push(`## Page: ${url}\n\n${pageContent}\n\n---\n\n`)
    }

    $("a[href]").each((_, element) => {
      const link = $(element).attr("href")
      if (link) {
        const absoluteUrl = new URL(link, url).toString()
        const absoluteUrlWithoutHash = absoluteUrl.split("#")[0]

        if (absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrlWithoutHash)) {
          queue.push(absoluteUrl)
        }
      }
    })
  } catch (error) {
    if (response) {
      stats.failed++
    } else {
      stats.failed++
    }
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

  const crawlToast = await showToast(Toast.Style.Animated, `Starting crawl for ${repoIdentifier}...`)

  const visited = new Set<string>()
  const queue: string[] = []
  const allContent: string[] = []
  const activeCount = { current: 0 }
  let resolveCompletion: () => void
  const completionPromise = new Promise<void>((resolve) => {
    resolveCompletion = resolve
  })

  // Initialize crawl statistics
  const crawlStats: CrawlStats = {
    attempted: 0,
    successful: 0,
    failed: 0,
  }

  const checkCompletion = () => {
    if (queue.length === 0 && activeCount.current === 0) {
      crawlToast.hide()
      resolveCompletion()
    }
  }

  const crawlWorker = async () => {
    if (activeCount.current >= MAX_CONCURRENCY) {
      return
    }
    activeCount.current++
    try {
      let keepWorking = true
      while (keepWorking) {
        const url = queue.shift()
        if (!url) {
          keepWorking = false
          break
        }

        const urlWithoutHash = url.split("#")[0]
        if (visited.has(urlWithoutHash)) {
          continue
        }
        visited.add(urlWithoutHash)

        crawlStats.attempted++
        await crawlPage(url, baseUrl, visited, queue, allContent, crawlStats, crawlToast)

        while (queue.length > 0 && activeCount.current < MAX_CONCURRENCY) {
          crawlWorker()
        }
      }
    } finally {
      activeCount.current--
      checkCompletion()
    }
  }

  // Seed the queue
  queue.push(baseUrl)

  // Start initial workers
  for (let i = 0; i < Math.min(MAX_CONCURRENCY, 1); i++) {
    crawlWorker()
  }

  checkCompletion()

  await completionPromise

  let finalTitle = "Crawl Complete"
  let finalMessage = `Crawled ${crawlStats.successful} pages successfully.`
  let finalStyle = Toast.Style.Success

  if (crawlStats.failed > 0) {
    finalTitle = "Crawl Complete with Errors"
    finalMessage = `Crawled ${crawlStats.successful} pages successfully. ${crawlStats.failed} pages failed to fetch or process.`
    finalStyle = Toast.Style.Success
  }

  if (allContent.length > 0) {
    const finalContent = allContent.join("\n")
    await Clipboard.copy(finalContent)
    await showToast(finalStyle, finalTitle, `${finalMessage} Copied content to clipboard.`)
  } else {
    finalMessage = `No content extracted after attempting ${crawlStats.attempted} pages.`
    if (crawlStats.failed > 0) {
      finalMessage += ` ${crawlStats.failed} pages failed.`
    }
    await showToast(Toast.Style.Failure, "Crawl Failed", `${finalMessage} Check base URL or website structure.`)
  }
}
