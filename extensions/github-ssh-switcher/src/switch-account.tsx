/**
 * "Switch GitHub SSH Account" — main Raycast command.
 *
 * Renders a searchable list of configured GitHub accounts. Selecting one
 * triggers the three-step SSH switch flow (clear → load → test). On success
 * a toast confirms the active account; on failure a detail view shows exactly
 * which step failed and what the SSH output was.
 */

import { List, ActionPanel, Action, showToast, Toast, useNavigation, Detail } from "@raycast/api";
import { ACCOUNTS } from "./accounts";
import { resolveEnv, switchToAccount } from "./ssh";
import type { Account } from "./accounts";
import type { Step } from "./ssh";

// ── Error detail view ──────────────────────────────────────────────────────────

/**
 * Shown only when the SSH switch fails.
 * Displays each step with its status and output so the user can diagnose
 * the problem without leaving Raycast.
 */
function ErrorDetail({
  account,
  steps,
  errorMessage,
}: {
  account: Account;
  steps: Step[];
  errorMessage: string;
}) {
  const rows = steps
    .map((s) => `| ${s.ok ? "✅" : "❌"} | ${s.title} | ${s.output.replace(/\n/g, " ")} |`)
    .join("\n");

  const markdown = `# ❌ Failed — ${account.title}

| | |
|-|-|
| **Account** | ${account.title} |
| **Email / Username** | ${account.subtitle} |
| **SSH Host** | \`${account.host}\` |

## Steps

| | Step | Output |
|-|------|--------|
${rows}

## Error

\`\`\`
${errorMessage}
\`\`\``;

  return <Detail markdown={markdown} navigationTitle={`Error — ${account.title}`} />;
}

// ── Main command ───────────────────────────────────────────────────────────────

export default function Command() {
  const { push } = useNavigation();

  /**
   * Runs the SSH switch flow for the selected account.
   * Shows an animated toast during execution, then:
   *  - updates it to "success" and stays on the list, or
   *  - updates it to "failure" and navigates to the error detail view.
   */
  async function handleSwitch(account: Account) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Switching to ${account.title}…`,
      message: account.subtitle,
    });

    const steps: Step[] = [];

    try {
      const env = await resolveEnv();
      await switchToAccount(account, steps, env);

      toast.style = Toast.Style.Success;
      toast.title = `Active: ${account.title}`;
      toast.message = account.subtitle;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      toast.style = Toast.Style.Failure;
      toast.title = "SSH switch failed";
      toast.message = "See details →";

      push(<ErrorDetail account={account} steps={steps} errorMessage={errorMessage} />);
    }
  }

  return (
    <List navigationTitle="GitHub SSH Switcher" searchBarPlaceholder="Search accounts…">
      {ACCOUNTS.map((account) => (
        <List.Item
          key={account.host}
          title={account.title}
          subtitle={account.subtitle}
          accessories={[{ text: account.host, tooltip: "SSH alias in ~/.ssh/config" }]}
          actions={
            <ActionPanel>
              <Action
                title={`Switch to ${account.title}`}
                onAction={() => handleSwitch(account)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
