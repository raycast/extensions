import { List } from "@raycast/api"
import Item from "./components/Item"
import { usePrs } from "./hooks/hooks"
import { PullRequest } from "./types/types"

type SectionProps = {
  title: string
  prs?: PullRequest[]
}

export default function MyPullRequests() {
  const { myOpenPrs, mentionedPrs, isLoading, prsDetails, prsReviews } =
    usePrs()

  const Section = ({ title, prs }: SectionProps) => {
    return (
      <List.Section title={title}>
        {prs?.map((pr) => {
          return (
            <Item
              key={pr.url}
              {...pr}
              details={prsDetails?.[pr.id]}
              reviews={prsReviews?.[pr.id]}
            />
          )
        })}
      </List.Section>
    )
  }

  return (
    <List isLoading={isLoading}>
      <Section title={"Opened by me"} prs={myOpenPrs} />
      <Section title={"Mentioned in"} prs={mentionedPrs} />
      <List.EmptyView title="No pull requests found" />
    </List>
  )
}
