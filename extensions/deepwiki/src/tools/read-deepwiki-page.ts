import { getDeepWikiPage } from "../get-deepwiki-page"

type Input = {
  /** GitHub owner/repo, GitHub URL, or DeepWiki page URL. */
  repoIdentifier: string
}

/** Read a DeepWiki repository page so Raycast AI can answer questions about it. */
export default async function tool(input: Input) {
  return getDeepWikiPage(input.repoIdentifier)
}
