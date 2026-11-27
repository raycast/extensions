import { githubRepositoryUrl } from "./project";
import { Color, Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { consoleUrl, selectPrimary } from "./aws/profiles";
import { statusIcon, loginLabel } from "./components/ProfileListItem";
import { displayDate, formatRemainingTime, menuBarTitle } from "./formatting";
import { useProfiles } from "./hooks/useProfiles";
export default function Command() {
  const state = useProfiles();
  const projectUrl = githubRepositoryUrl();
  const primary = selectPrimary(state.profiles, state.settings.primaryProfile);
  return (
    <MenuBarExtra
      icon={{ source: Icon.Cloud, tintColor: primary?.stale ? Color.Orange : undefined }}
      title={menuBarTitle(primary, state.settings, state.loading || state.signingIn)}
      isLoading={state.loading || state.signingIn}
      tooltip={`${primary ? `${primary.profile.name}: ${primary.status}. ` : ""}${"AWS temporary credential lifetime; not the SSO reauthentication deadline"}`}
    >
      <MenuBarExtra.Section title={"Current Profile"}>
        {primary ? (
          <>
            <MenuBarExtra.Item
              title={primary.profile.name}
              subtitle={primary.status}
              icon={statusIcon(primary.status)}
            />
            <MenuBarExtra.Item title={`${"Remaining Time"}: ${formatRemainingTime(primary.expiration)}`} />
            <MenuBarExtra.Item title={`${"Credential Expiration"}: ${displayDate(primary.expiration)}`} />
            <MenuBarExtra.Item title={`${"Account"}: ${primary.profile.accountId || "Not configured"}`} />
            <MenuBarExtra.Item title={`${"Role"}: ${primary.profile.roleName || "Not configured"}`} />
            <MenuBarExtra.Item title={`${"Region"}: ${primary.profile.region || "Not configured"}`} />
            <MenuBarExtra.Item title={`${"SSO Session"}: ${primary.profile.sessionName || "Legacy"}`} />
            <MenuBarExtra.Item title={`${"Last Checked"}: ${displayDate(primary.checkedAt)}`} />
            <MenuBarExtra.Item title={`${"Last Successful Check"}: ${displayDate(primary.lastSuccessAt)}`} />
            {primary.stale && (
              <MenuBarExtra.Item title={"Stale — showing the last known result"} icon={Icon.ExclamationMark} />
            )}
            {!!primary.nextRetryAt && primary.nextRetryAt > Date.now() && (
              <MenuBarExtra.Item
                title={`${"Next Automatic Check"}: ${displayDate(new Date(primary.nextRetryAt).toISOString())}`}
              />
            )}
            <MenuBarExtra.Item title={"Signing in refreshes all profiles using this SSO session."} />
            {primary.message && <MenuBarExtra.Item title={primary.message} />}
          </>
        ) : (
          <MenuBarExtra.Item title={state.notice || "Primary Profile was not found. Check preferences."} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Submenu title={"Switch Primary Profile"}>
        {state.profiles.map((item) => (
          <MenuBarExtra.Item
            key={item.profile.name}
            title={item.profile.name}
            icon={item.profile.name === primary?.profile.name ? Icon.Check : undefined}
            onAction={() => state.selectProfile(item.profile.name)}
          />
        ))}
        <MenuBarExtra.Item title={"Use Preference Default"} onAction={() => state.selectProfile()} />
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Section title={"Profiles"}>
        {state.profiles.map((item) => (
          <MenuBarExtra.Submenu
            key={item.profile.name}
            title={`${item.profile.name} · ${item.status}`}
            icon={statusIcon(item.status)}
          >
            <MenuBarExtra.Item title={`${"Remaining Time"}: ${formatRemainingTime(item.expiration)}`} />
            {item.stale && <MenuBarExtra.Item title={"Stale — showing the last known result"} />}
            {item.message && <MenuBarExtra.Item title={item.message} />}
            {!item.profile.issues.length && (
              <MenuBarExtra.Item title={loginLabel(item)} icon={Icon.Key} onAction={() => state.signIn(item)} />
            )}
            <MenuBarExtra.Item title={"Refresh Profile"} onAction={() => state.refreshOne(item)} />
            {consoleUrl(item.profile) && (
              <MenuBarExtra.Item title={"Open AWS Console"} onAction={() => open(consoleUrl(item.profile)!)} />
            )}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={"Refresh"} icon={Icon.ArrowClockwise} onAction={state.refresh} />
        <MenuBarExtra.Item
          title={"Open AWS SSO Status"}
          onAction={() => launchCommand({ name: "aws-sso-status", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={"Diagnostics"}
          icon={Icon.WrenchScrewdriver}
          onAction={() => launchCommand({ name: "diagnostics", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title={"Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
      {projectUrl && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={"Star on GitHub"} icon={Icon.Star} onAction={() => open(projectUrl)} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
