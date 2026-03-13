import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useTerminals, useDefaultEditor } from "../utils/hooks";
import { SandboxKey, Sandbox } from "../utils/sandboxes";
import { toStackBlitzLink } from "../utils/to-stackblitz-link";

type Props = {
  sandboxKey: SandboxKey;
  sandbox: Sandbox;
  directory: string;
};

export const LocalSandboxCreation = ({ sandboxKey, sandbox, directory }: Props) => {
  const terminals = useTerminals();
  const defaultEditor = useDefaultEditor();

  const { isLoading, data, error } = useExec(
    "npx",
    [
      "--yes", // always install the storybook dependency
      "storybook@latest",
      "sandbox",
      sandboxKey,
      "--output",
      directory,
    ],
    {
      initialData: "Creating...",
      onData: (data) => {
        console.log("Created", data);
        showToast({ style: Toast.Style.Success, title: "Created! 🎉" });
      },
      env: {
        // from the Raycast Community Slack: https://raycastcommunity.slack.com/archives/C02HEMAF2SJ/p1681061780699559?thread_ts=1680571000.938529&cid=C02HEMAF2SJ
        PATH: "/usr/bin:/bin:/usr/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
      },
    }
  );

  const isReady = data.includes("ready to use");

  if (error) {
    console.error(error);
    return (
      <Detail
        isLoading={isLoading}
        markdown={`
## Whoops, something went wrong! 🚨
            
See the output below for more information.

- \`ENTER\` to open the sandbox in StackBlitz instead.
- \`CMD\` + \`SHIFT\` + \`C\` to copy the output to your clipboard.

### Output

\`\`\`
${error}
\`\`\`
	`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in StackBlitz" url={toStackBlitzLink(sandboxKey)} />
            <Action.CopyToClipboard
              title="Copy Output to Clipboard"
              content={directory}
              shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
${isReady ? "## 🎉 Sandbox created! 🎉" : "## Creating Sandbox ..."}

**Sandbox**: ${sandbox.name}

**Directory**: \`${directory}\`

### Output

\`\`\`
${data}
\`\`\`
	`}
      actions={
        isReady && (
          <ActionPanel>
            {defaultEditor && (
              <Action.Open
                title={`Open in ${defaultEditor.name}`}
                target={directory}
                application={defaultEditor}
                icon={Icon.Code}
              />
            )}
            {!defaultEditor?.bundleId?.includes("com.microsoft.VSCode") && (
              <Action.Open
                title="Open in VS Code"
                target={directory}
                application={{
                  name: "Code",
                  path: "/Applications/Visual Studio Code.app",
                  bundleId: "com.microsoft.VSCode",
                }}
                icon={Icon.Code}
              />
            )}
            {terminals &&
              terminals.length > 0 &&
              terminals.map((terminal) => (
                <Action.Open
                  key={terminal.name}
                  title={`Open in ${terminal.name}`}
                  target={directory}
                  application={terminal}
                />
              ))}
            <Action.Open title="Open in Finder" target={directory} />
            <Action.CopyToClipboard title="Copy Directory to Clipboard" content={directory} />
            <Action.Trash title="Delete Created Sandbox" paths={directory} />
          </ActionPanel>
        )
      }
    />
  );
};
