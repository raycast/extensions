import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, openExtensionPreferences, showToast } from "@raycast/api";

import { loginArgs, loginCommand, refreshArgs } from "../lib/gh-cli";
import { NEW_PAT_URL, PAT_FALLBACK_STEPS, ownerApprovalRequest } from "../lib/gh-errors";
import { REQUIRED_SCOPES, type GhStatus } from "../lib/gh-status";
import { host } from "../lib/preferences";
import { runInTerminal } from "../lib/terminal";

const INSTALL_URL = "https://cli.github.com";
const INSTALL_DOCS = "https://github.com/cli/cli#installation";
const AUTH_DOCS = "https://cli.github.com/manual/gh_auth_login";
const SSO_DOCS =
  "https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on";
const OAUTH_APPS_URL = "https://github.com/settings/apps/authorizations";

type SetupRequiredProps = {
  status: GhStatus;
  /** Re-runs the readiness check after the user fixes something. */
  onRecheck: () => void;
};

/** The headline, primary command, and steps for each failure state. */
function content(status: GhStatus): { title: string; command: string; body: string[] } {
  const login = loginCommand(host());

  switch (status.state) {
    case "not-installed":
      return {
        title: "GitHub CLI not installed",
        command: "brew install gh",
        body: [
          "GH Review talks to GitHub through the **GitHub CLI** and borrows its token — it has no login of its own and never stores a token.",
          "",
          "Install it, then come back and press **Check Again**.",
          "",
          "```sh",
          "brew install gh",
          "```",
          "",
          `Not using Homebrew? Every installer is listed in the [installation guide](${INSTALL_DOCS}).`,
          "",
          "Once it's installed, authenticate:",
          "",
          "```sh",
          login,
          "```",
          "",
          "> If `gh` is already installed somewhere unusual, set its full path in the extension preferences instead.",
        ],
      };

    case "not-authenticated":
      return {
        title: "GitHub CLI not authenticated",
        command: login,
        body: [
          "`gh` is installed, but it has no usable token for this host yet.",
          "",
          "Press **Sign in to GitHub** below and a terminal opens with the command already running. Two things to expect:",
          "",
          "1. **“Authenticate Git with your GitHub credentials? (Y/n)”** — this is about `git push`, nothing to do with this extension. Either answer works; Enter accepts the default. gh has [no flag to skip it](https://github.com/cli/cli/issues/11374).",
          "2. Your **one-time code is already on the clipboard** — press Enter to open the browser and paste it.",
          "",
          "Prefer to run it yourself?",
          "",
          "```sh",
          login,
          "```",
          "",
          "Then add the scope the extension needs for organizations and teams:",
          "",
          "```sh",
          "gh auth refresh -s read:org",
          "```",
          "",
          `Full reference: [\`gh auth login\`](${AUTH_DOCS}).`,
          "",
          "When that's done, press **Check Again** below.",
        ],
      };

    case "unreachable":
      return {
        title: "Can't reach GitHub",
        command: "gh auth status",
        body: [
          "`gh` is installed and has a token, but the GitHub API didn't answer.",
          "",
          "Usually this is a dropped network connection, a VPN, or a proxy. Check with:",
          "",
          "```sh",
          "gh auth status",
          "gh api graphql -f query='{ viewer { login } }'",
          "```",
          "",
          "If you're on GitHub Enterprise, confirm the **GitHub Host** preference matches your instance.",
        ],
      };

    case "ready":
      // Only reachable when scopes are missing — access works, but partially.
      return {
        title: "Missing token scopes",
        command: `gh auth refresh -s ${status.missingScopes.join(",")}`,
        body: [
          `Signed in as **@${status.login}**, but the token is missing ${status.missingScopes.length === 1 ? "a scope" : "some scopes"} the extension needs.`,
          "",
          ...REQUIRED_SCOPES.filter((s) => status.missingScopes.includes(s.name)).map(
            (s) => `- \`${s.name}\` — ${s.why}`,
          ),
          "",
          "```sh",
          `gh auth refresh -s ${status.missingScopes.join(",")}`,
          "```",
        ],
      };
  }
}

/**
 * The blocking setup screen. Every command renders this instead of its real UI
 * until the GitHub CLI is installed, authenticated, and reachable — there is
 * nothing useful the extension can do before that, and a half-working list is
 * more confusing than a clear instruction.
 */
export function SetupRequired({ status, onRecheck }: SetupRequiredProps) {
  const { title, command, body } = content(status);
  const detail = "detail" in status ? status.detail : "";
  // A "ready" status only reaches this screen when scopes are missing, and
  // that's fixed by widening the existing credential, not signing in again.
  const needsScopesOnly = status.state === "ready";

  const markdown = [
    `# ${title}`,
    "",
    ...body,
    "",
    "---",
    "",
    "### Seeing an organization's pull requests",
    "",
    "> Everything below is between you, `gh`, and GitHub — none of it is a setting in this extension. GH Review has no login of its own and no opinion about which kind of credential you use; it reads whatever `gh auth token` returns. It's documented here only because this is where the symptom shows up.",
    "",
    "Even with a valid token, orgs that use SAML SSO or restrict OAuth apps return **nothing** until the token is authorized for them — with no error.",
    "",
    "During sign-in you'll hit a **“Single sign-on to your organizations”** page. That step is *yours* — you authenticate with your company's identity provider and it's done. **No administrator is involved.**",
    "",
    "An owner is only needed in one specific case: the organization restricts third-party OAuth apps *and* nobody has approved the GitHub CLI there yet. You'll know immediately, because the button reads **Request** instead of **Grant**.",
    "",
    "#### If an owner won't approve it",
    "",
    "You aren't stuck. Those restrictions govern OAuth *apps*, and a **classic personal access token isn't one** — so authorizing a PAT for the organization is self-service.",
    "",
    PAT_FALLBACK_STEPS,
    "",
    `- Signed in via \`gh auth login\`? Authorize the **GitHub CLI** app at [Settings → Authorized OAuth Apps](${OAUTH_APPS_URL}).`,
    `- Using a personal access token? Click **Configure SSO → Authorize** next to it at [Settings → Tokens](https://github.com/settings/tokens). [Docs](${SSO_DOCS}).`,
    ...(detail ? ["", "---", "", "<details>", "", `\`\`\`\n${detail}\n\`\`\``, "", "</details>"] : []),
  ].join("\n");

  return (
    <Detail
      navigationTitle="Setup required"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {status.state !== "not-installed" ? (
              <Action
                icon={Icon.Terminal}
                title={needsScopesOnly ? "Add the Missing Scopes" : "Sign in to GitHub"}
                onAction={async () => {
                  try {
                    // `refresh` when a credential already exists — it asks
                    // nothing about Git and goes straight to the browser.
                    // `login` only for a genuine first sign-in.
                    await runInTerminal(
                      needsScopesOnly ? refreshArgs(host(), status.missingScopes) : loginArgs(host()),
                      needsScopesOnly
                        ? "Adding the missing scopes. Your one-time code is already on the clipboard."
                        : "Signing in to GitHub. Your one-time code is already on the clipboard — answer the Git question either way, it doesn't affect this extension.",
                    );
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Terminal opened",
                      message: "Finish there, then press Check Again",
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Couldn't open Terminal",
                      message: `Run \`${command}\` yourself`,
                    });
                  }
                }}
              />
            ) : null}
            <Action
              icon={Icon.ArrowClockwise}
              title="Check Again"
              onAction={async () => {
                await showToast({ style: Toast.Style.Animated, title: "Checking the GitHub CLI…" });
                onRecheck();
              }}
            />
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy the Command"
              content={command}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="GitHub CLI Homepage" url={INSTALL_URL} />
            <Action.OpenInBrowser title="Installation Guide" url={INSTALL_DOCS} />
            <Action.OpenInBrowser title="Authorized OAuth Apps" url={OAUTH_APPS_URL} />
            <Action.CopyToClipboard
              icon={Icon.Envelope}
              title="Copy a Request for an Owner"
              content={ownerApprovalRequest()}
            />
            <Action.OpenInBrowser icon={Icon.Key} title="Create a Token with the Right Scopes" url={NEW_PAT_URL} />
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
