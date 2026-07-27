import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";

import { refreshArgs, refreshCommand } from "../lib/gh-cli";
import { NEW_PAT_URL, classifyFailure, failureLinks, ownerApprovalRequest } from "../lib/gh-errors";
import { host } from "../lib/preferences";
import { runInTerminal } from "../lib/terminal";

type SamlBannerProps = {
  refusal: { message: string; ssoHeader?: string };
  onRecheck: () => void;
};

/**
 * A row pinned above the results when GitHub refused one organization on SAML
 * grounds.
 *
 * This is the quiet failure worth shouting about: the search still returns the
 * orgs you *can* see, so the list looks fine — it's just missing an entire
 * organization, with no error anywhere. Without this row the only symptom is
 * "some of my PRs aren't here", which reads as a bug in the extension.
 */
export function SamlBanner({ refusal, onRecheck }: SamlBannerProps) {
  const failure = classifyFailure(refusal.message, refusal.ssoHeader);
  const links = failureLinks(failure);
  const org = failure.orgs[0];
  const refresh = refreshCommand(host());

  return (
    <List.Section title="Action needed">
      <List.Item
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title={org ? `“${org}” hasn't authorized this token` : "An organization hasn't authorized this token"}
        subtitle="Its pull requests are missing from these results — GitHub returns them as empty, not as an error"
        accessories={[{ tag: { value: "SAML", color: Color.Orange } }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {links.map((link) => (
                <Action.OpenInBrowser key={link.url} title={link.label} url={link.url} />
              ))}
              <Action.CopyToClipboard
                icon={Icon.Envelope}
                title="Copy a Request for an Owner"
                content={ownerApprovalRequest(org)}
              />
              {/* Classic PATs aren't OAuth apps, so they dodge org OAuth
                  restrictions entirely — the way out when nobody will approve. */}
              <Action.OpenInBrowser icon={Icon.Key} title="Create a Token with the Right Scopes" url={NEW_PAT_URL} />
              {/* `refresh`, not `login`: the credential already exists and
                  only needs re-authorizing, so gh skips the Git question and
                  goes straight to the browser. */}
              <Action
                icon={Icon.Terminal}
                title="Re-Authorize in Terminal"
                onAction={async () => {
                  try {
                    await runInTerminal(
                      refreshArgs(host()),
                      "Re-authorizing so your organization grants this token. Your one-time code is already on the clipboard — paste it in the browser.",
                    );
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Terminal opened",
                      message: "Authorize the org in the browser, then refresh here",
                    });
                  } catch {
                    await showToast({ style: Toast.Style.Failure, title: `Run \`${refresh}\` yourself` });
                  }
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={onRecheck} />
              <Action.CopyToClipboard title="Copy GitHub's Message" content={refusal.message} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
