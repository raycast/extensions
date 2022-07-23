import { Color, MenuBarExtra, open } from "@raycast/api";
import usePulls from "./hooks/usePulls";
import PullRequestItem from "./components/PullRequestItem";

// noinspection JSUnusedGlobalSymbols
export default function githubPullNotifications() {
  const { isLoading, myPulls, pullVisits, participatedPulls, visitPull } = usePulls();
  const prCount = myPulls.length + participatedPulls.length;

  const shouldSeparateRecentPulls = (myPulls.length > 0 || participatedPulls.length > 0) && pullVisits.length > 0;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "https://github.githubassets.com/favicons/favicon.png", tintColor: Color.Purple }}
      tooltip="Pull Requests that require attention"
      title={prCount > 0 ? `${myPulls.length + participatedPulls.length} PRs to check` : "All good"}
    >
      {myPulls.length > 0 && <MenuBarExtra.Item title="My Pulls" />}
      {myPulls.map(pull => <PullRequestItem key={pull.id} pull={pull} onAction={() => visitPull(pull)} />)}

      {myPulls.length > 0 && participatedPulls.length > 0 && <MenuBarExtra.Separator />}

      {participatedPulls.length > 0 && <MenuBarExtra.Item title="Participated Pulls" />}
      {participatedPulls.map(pull => <PullRequestItem pull={pull} onAction={() => visitPull(pull)} />)}

      {shouldSeparateRecentPulls && <MenuBarExtra.Separator />}

      {pullVisits.length > 0 && <MenuBarExtra.Submenu title="Recent Pulls">
        {pullVisits.map(({ pull }) => <PullRequestItem
          key={pull.id} pull={pull} onAction={() => open(pull.html_url)}
        />)}
      </MenuBarExtra.Submenu>}
    </MenuBarExtra>
  );
}
