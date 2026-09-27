import { LaunchProps, open } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { getDeepWikiUrls } from "./deepwiki-url"
import { getRepoIdentifierFromArgumentOrCurrentTab } from "./get-repo-identifier"

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenDeepwiki }>) {
  try {
    const repoIdentifier = await getRepoIdentifierFromArgumentOrCurrentTab(props.arguments.repoIdentifier)
    await open(getDeepWikiUrls(repoIdentifier).pageUrl)
  } catch (error: unknown) {
    showFailureToast(error, { title: "Invalid Input or Error Opening" })
  }
}
