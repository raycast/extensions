import { Color, MenuBarExtra, open } from "@raycast/api";
import { usePullRequestsWithAgentSessions } from "./hooks/usePullRequestsWithAgentSessions";
import { useMemo } from "react";
import { withAccessToken } from "@raycast/utils";
import { provider } from "./lib/oauth";
import { getIcon } from "./utils";

const truncate = (text: string, maxLength: number): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
};

function Command() {
  const { isLoading, pullRequestsWithAgentSessions } = usePullRequestsWithAgentSessions();

  const openPullRequests = useMemo(
    () =>
      pullRequestsWithAgentSessions.filter(
        (pullRequestWithAgentSessions) => pullRequestWithAgentSessions.pullRequest.state === "OPEN",
      ),
    [pullRequestsWithAgentSessions],
  );

  return (
    <MenuBarExtra
      icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
      tooltip="GitHub Copilot Tasks"
      isLoading={isLoading}
    >
      {openPullRequests.map((pullRequestWithAgentSessions) => (
        <MenuBarExtra.Item
          key={pullRequestWithAgentSessions.key}
          title={truncate(pullRequestWithAgentSessions.pullRequest.title, 35)}
          subtitle={`${pullRequestWithAgentSessions.pullRequest.repository.owner.login}/${pullRequestWithAgentSessions.pullRequest.repository.name}`}
          onAction={() => {
            open(pullRequestWithAgentSessions.pullRequest.url);
          }}
          icon={getIcon(pullRequestWithAgentSessions)}
        />
      ))}
    </MenuBarExtra>
  );
}

export default withAccessToken(provider)(Command);
