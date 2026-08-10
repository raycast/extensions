import { Action, Color, Icon } from "@raycast/api";
import { PullRequestsList } from "./pullRequestsList";

const ShowPullRequestsActions = (props: { repo: any }): JSX.Element => {
  return (
    <Action.Push
      title="Show Pull Requests"
      target={<PullRequestsList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
};

export { ShowPullRequestsActions };
