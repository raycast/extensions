import { Action, ActionPanel, List, popToRoot } from "@raycast/api"
import {
  DecisionState,
  PullRequest,
  PullRequestDetails,
  PullRequestReviews,
} from "../types/types"
import { getPrIcon } from "../utils/utils"
import {
  getAuthorAccessory,
  getCommentsAccessory,
  getReviewDecisionAccessory,
  getReviewersAccessory,
  getUpdatedAtAccessory,
} from "../utils/accessory.utils"

// export enum CheckStatusState {
//   /** Status is errored. */
//   Error = "ERROR",
//   /** Status is expected. */
//   Expected = "EXPECTED",
//   /** Status is failing. */
//   Failure = "FAILURE",
//   /** Status is pending. */
//   Pending = "PENDING",
//   /** Status is successful. */
//   Success = "SUCCESS",
// }

// export function getCheckStateAccessory(
//   commitStatusCheckRollupState: StatusState
// ): List.Item.Accessory | null {
//   switch (commitStatusCheckRollupState) {
//     case "SUCCESS":
//       return {
//         icon: { source: Icon.Check, tintColor: Color.Green },
//         tooltip: "Checks: Success",
//       }
//     case "ERROR":
//     case "FAILURE":
//       return {
//         icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
//         tooltip: "Checks: Failure",
//       }
//     case "PENDING":
//       return {
//         icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
//         tooltip: "Checks: Pending",
//       }
//     default:
//       return null
//   }
// }

const getRepoName = (url: string) => {
  const urlArr = url.split("/")
  return urlArr[urlArr.length - 1]
}

type ItemProps = PullRequest & {
  details?: PullRequestDetails
  reviews?: PullRequestReviews
}

export default function Item(props: ItemProps) {
  const repoName = getRepoName(props.repository_url)
  const decisionStates = props.reviews?.map(
    (review) => review.state as DecisionState
  )
  const requestedReviewers = props.details?.requested_reviewers?.map(
    (user) => user.login
  )
  const commentCount = props.details?.review_comments
  const branchName = props.details?.head.ref || ""
  const updatedAt = new Date(props.updated_at)
  const avatarUrl = props.user?.avatar_url || ""
  const author = props.user?.login

  const accessories: List.Item.Accessory[] = [
    getReviewersAccessory(requestedReviewers),
    getCommentsAccessory(commentCount),
    getReviewDecisionAccessory(decisionStates),
    getUpdatedAtAccessory(updatedAt),
    getAuthorAccessory(author, avatarUrl),
  ]

  return (
    <List.Item
      key={props.id}
      title={branchName || repoName}
      subtitle={{ value: repoName, tooltip: props.title }}
      keywords={[repoName]}
      accessories={accessories}
      icon={getPrIcon(props.draft)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={props.html_url}
            onOpen={() => popToRoot()}
          />
        </ActionPanel>
      }
    />
  )
}
