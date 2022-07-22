import { Color, MenuBarExtra, open } from "@raycast/api";
import usePulls from "./hooks/usePulls";

// noinspection JSUnusedGlobalSymbols
export default function githubPullNotifications() {
  const {isLoading, myPulls, pullVisits, participatedPulls, visitPull} = usePulls();

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "https://github.githubassets.com/favicons/favicon.png", tintColor: Color.Purple }}
      tooltip="Your Pull Requests"
      title={`${myPulls.length + participatedPulls.length} PRs to check`}
    >
      {myPulls.length > 0 && <MenuBarExtra.Item title="My Pulls" />}
      {myPulls.map(pull => <MenuBarExtra.Item
        key={pull.id}
        title={pull.title}
        icon="🤔"
      />)}
      {myPulls.length > 0 && participatedPulls.length > 0 && <MenuBarExtra.Separator />}
      {participatedPulls.length > 0 && <MenuBarExtra.Item title="Participated Pulls" />}
      {participatedPulls.map(pull => <MenuBarExtra.Item
        key={pull.id}
        title={pull.title}
        icon={pull.user?.avatar_url}
        onAction={() => visitPull(pull)}
      />)}
      {(myPulls.length > 0 || participatedPulls.length > 0) && pullVisits.length > 0 && <MenuBarExtra.Separator />}
      {pullVisits.length > 0 && <MenuBarExtra.Submenu title="Recent Pulls">
        {pullVisits.map(({pull: {id, title, user, html_url}}) => <MenuBarExtra.Item
          key={id}
          title={title}
          icon={user?.avatar_url}
          onAction={() => open(html_url)}
        />)}

      </MenuBarExtra.Submenu>}
    </MenuBarExtra>
  );
}
