import { AI, Detail, LaunchProps } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { answerDeepWikiQuestion } from "./answer-deepwiki-question"
import { getDeepWikiPage } from "./get-deepwiki-page"
import { getRepoIdentifierFromArgumentOrCurrentTab } from "./get-repo-identifier"

export default function Command(props: LaunchProps<{ arguments: Arguments.AskAi }>) {
  const { data, isLoading } = usePromise(
    async (question: string, repoIdentifier?: string) => {
      const identifier = await getRepoIdentifierFromArgumentOrCurrentTab(repoIdentifier)
      const page = await getDeepWikiPage(identifier)
      return answerDeepWikiQuestion(question, page, (prompt) => AI.ask(prompt))
    },
    [props.arguments.question, props.arguments.repoIdentifier],
    { failureToastOptions: { title: "Could Not Answer Question" } },
  )

  return <Detail isLoading={isLoading} markdown={data ?? ""} />
}
