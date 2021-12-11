import { runAppleScript } from "run-applescript"

export const openInBrowser = async (url: string) => {
  await runAppleScript(`do shell script "open ${url}`)
}

export const DefaultOpner = async (text: string) => {
  await openInBrowser(encodeURI(text))
}

export const GoogleSearchOpner = async (text: string) => {
  await openInBrowser(`https://google.com/search?q=${encodeURIComponent(text)}"`)
}

export const GithubSearchOpner = async (text: string) => {
  await openInBrowser(`https://github.com/search?q=${encodeURIComponent(text)}"`)
}

export const GithubRepoOpner = async (text: string) => {
  await openInBrowser(`https://github.com/${encodeURIComponent(text)}"`)
}

export const DeeplOpner = async (text: string) => {
  await openInBrowser(`https://deepl.com/zh/translator#en/zh/${encodeURIComponent(text)}"`)
}
