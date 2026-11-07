import { sessionKey } from "./aws/store";
import { scopeFor } from "./aws/coordinator";
import Diagnostics from "./diagnostics";
import { ProjectAction } from "./components/ProjectAction";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ProfileListItem } from "./components/ProfileListItem";
import { useProfiles } from "./hooks/useProfiles";
export default function Command() {
  const state = useProfiles();
  return (
    <List
      isLoading={state.loading || state.signingIn}
      isShowingDetail={state.profiles.length > 0}
      searchBarPlaceholder={"Search SSO profiles"}
    >
      <List.EmptyView
        icon={Icon.Cloud}
        title={state.error || (state.loading ? "Checking AWS Profiles" : "No IAM Identity Center Profiles")}
        description={state.notice ? state.notice : undefined}
        actions={
          <ActionPanel>
            <Action title={"Refresh Status"} onAction={state.refresh} icon={Icon.ArrowClockwise} />
            <Action title={"Open Extension Preferences"} onAction={openExtensionPreferences} icon={Icon.Gear} />
            <Action.OpenInBrowser
              title={"IAM Identity Center Setup Guide"}
              url="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html"
            />
            <Action.Push title={"Diagnostics"} icon={Icon.WrenchScrewdriver} target={<Diagnostics />} />
            <ProjectAction />
          </ActionPanel>
        }
      />
      {state.profiles.map((item) => (
        <ProfileListItem
          key={item.profile.name}
          item={item}
          sharedProfiles={state.profiles
            .filter(
              (other) =>
                sessionKey(other.profile, scopeFor(state.settings)) ===
                sessionKey(item.profile, scopeFor(state.settings)),
            )
            .map((other) => other.profile.name)}
          onSignIn={() => state.signIn(item)}
          onRefresh={() => state.refreshOne(item)}
          onRefreshAll={state.refresh}
        />
      ))}
    </List>
  );
}
