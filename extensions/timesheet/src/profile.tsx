import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPreferences, getProfile, type Profile } from "./api";
import { isSignedIn, signOut } from "./oauth";

function planLabel(profile: Profile): string {
  if (profile.planEnterprise) return "Enterprise";
  if (profile.planBusiness) return "Business";
  if (profile.planPro) return "Pro";
  if (profile.planPlus) return "Plus";
  if (profile.planBasic) return "Basic";
  return "Unknown";
}

function fmtTimestamp(value?: number): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function ProfileView() {
  const {
    data: profile,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getProfile, [], {
    initialData: null,
    failureToastOptions: { title: "Failed to load profile" },
  });

  // Signing out only applies to the OAuth path; an API token lives in preferences.
  const { data: canSignOut } = useCachedPromise(
    async () => !getPreferences().apiToken?.trim() && (await isSignedIn()),
    [],
    { initialData: false },
  );

  async function handleSignOut() {
    try {
      await signOut();
      await showToast({
        style: Toast.Style.Success,
        title: "Signed out of Timesheet",
        message: "Run any Timesheet command to sign in again.",
      });
    } catch (err) {
      showFailureToast(err, { title: "Failed to sign out" });
    }
  }

  const name = profile?.displayName ?? "—";
  const plan = profile ? planLabel(profile) : "—";
  const expires = profile?.expires ? fmtTimestamp(profile.expires) : "—";
  const trial = profile?.trial ? "Yes" : "No";
  const valid = profile?.valid ? "Active" : "Inactive";

  const markdown =
    error && !profile
      ? `# Could not load your profile\n\n${error.message}\n\nPress ⌘R to try again.`
      : `
# ${name}

${profile?.email ?? ""}

---

## Subscription
- **Plan:** ${plan}
- **Status:** ${valid}
- **Trial:** ${trial}
- **Expires:** ${expires}

${profile?.country ? `## Location\n- **Country:** ${profile.country}` : ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        profile ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Plan"
              text={plan}
              icon={{
                source: Icon.Crown,
                tintColor: profile.valid ? Color.Yellow : Color.SecondaryText,
              }}
            />
            <Detail.Metadata.Label
              title="Status"
              text={valid}
              icon={{
                source: Icon.Circle,
                tintColor: profile.valid ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label title="Trial" text={trial} />
            <Detail.Metadata.Label title="Expires" text={expires} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Email"
              text={profile.email ?? "—"}
              icon={Icon.Envelope}
            />
            {profile.country ? (
              <Detail.Metadata.Label
                title="Country"
                text={profile.country}
                icon={Icon.Globe}
              />
            ) : null}
            {profile.language ? (
              <Detail.Metadata.Label title="Language" text={profile.language} />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Manage Account"
            url="https://my.timesheet.io/profile"
          />
          <Action.OpenInBrowser
            title="Open Timesheet"
            url="https://my.timesheet.io"
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => revalidate()}
          />
          {canSignOut ? (
            <Action
              title="Sign out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={handleSignOut}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
