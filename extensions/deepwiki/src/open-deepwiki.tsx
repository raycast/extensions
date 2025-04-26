import { LaunchProps, open, showToast, Toast } from "@raycast/api"
import { URL } from "url"

interface OpenDeepWikiArguments {
  repoIdentifier: string
}

export default async function Command(props: LaunchProps<{ arguments: OpenDeepWikiArguments }>) {
  const { repoIdentifier } = props.arguments
  const deepWikiBaseUrl = "https://deepwiki.com/"

  let targetUrl = ""

  try {
    if (repoIdentifier.startsWith(deepWikiBaseUrl)) {
      // Already a DeepWiki URL
      new URL(repoIdentifier) // Validate URL format
      targetUrl = repoIdentifier
    } else if (repoIdentifier.startsWith("https://github.com/")) {
      // GitHub URL
      const url = new URL(repoIdentifier)
      const pathParts = url.pathname.split("/").filter((part) => part !== "")
      if (pathParts.length >= 2) {
        targetUrl = `${deepWikiBaseUrl}${pathParts[0]}/${pathParts[1]}`
      } else {
        throw new Error("Invalid GitHub URL format. Expected 'https://github.com/org/repo'.")
      }
    } else if (repoIdentifier.includes("/")) {
      // Assume org/repo format
      const parts = repoIdentifier.split("/")
      if (parts.length === 2 && parts[0] && parts[1]) {
        targetUrl = `${deepWikiBaseUrl}${parts[0]}/${parts[1]}`
      } else {
        throw new Error("Invalid org/repo format. Expected 'org/repo'.")
      }
    } else {
      throw new Error("Invalid input. Provide a DeepWiki URL, GitHub URL, or 'org/repo'.")
    }

    await open(targetUrl)
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: error.message,
    })
  }
}
