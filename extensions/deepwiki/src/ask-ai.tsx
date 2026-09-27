import { AI, Detail, LaunchProps } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { getDeepWikiPage } from "./get-deepwiki-page"
import { getRepoIdentifierFromArgumentOrCurrentTab } from "./get-repo-identifier"

export default function Command(props: LaunchProps<{ arguments: Arguments.AskAi }>) {
  const { data, isLoading } = usePromise(
    async (question: string, repoIdentifier?: string) => {
      const identifier = await getRepoIdentifierFromArgumentOrCurrentTab(repoIdentifier)
      const page = await getDeepWikiPage(identifier)
      const answer = await AI.ask(
        `Answer the question using the DeepWiki page below. If the page does not contain the answer, say so. Cite the page URL in your answer.\n\nPage: ${page.url}\n\n${page.content}\n\nQuestion: ${question}`,
      )
      return answer
    },
    [props.arguments.question, props.arguments.repoIdentifier],
    { failureToastOptions: { title: "Could Not Answer Question" } },
  )

  return <Detail isLoading={isLoading} markdown={data ?? ""} />
}
