import { Action, ActionPanel, Alert, confirmAlert, Detail } from "@raycast/api";
import { getPortDetails, isPortInstalled, uninstallPort } from "./exec";
import { usePromise } from "@raycast/utils";
import { useTerminalApp } from "./runInTerminal";

type Props = {
  portName: string;
};

export default function PortDetails({ portName }: Props) {
  const { data: portDetails, isLoading } = usePromise(
    async (portName: string) => await getPortDetails(portName),
    [portName],
  );
  const { data: installed } = usePromise(async (portName) => await isPortInstalled(portName), [portName]);

  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!portDetails) {
    return <Detail markdown="No details found for this port." />;
  }

  const { name, description, homepage, maintainers, variants, dependencies } = portDetails;

  const formatMaintainers = (maintainers: Array<{ email?: string; github?: string }>) => {
    return maintainers
      .map((maintainer) => {
        const parts = [];
        if (maintainer.email) {
          parts.push(`📧 ${maintainer.email}`);
        }
        if (maintainer.github) {
          parts.push(`🐙 [${maintainer.github}](https://github.com/${maintainer.github})`);
        }
        return parts.join(" ");
      })
      .join("\n\n");
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${name}
    
🌐 [${homepage}](${homepage})

${description}

### Maintainers
${formatMaintainers(maintainers)}

### Variants
${variants.join(", ")}

### Dependencies
${dependencies.join(", ")}`}
      actions={
        <ActionPanel>
          {!installed && (
            <Action
              title={`Run Install in ${terminalName}`}
              icon={terminalIcon}
              style={Action.Style.Regular}
              onAction={() => runCommandInTerminal(`sudo port install ${portName}`)}
            />
          )}
          <Action.CopyToClipboard title="Copy Install Command" content={`sudo port install ${portName}`} />
          <Action.OpenInBrowser title="Open Homepage in Browser" url={homepage} />
          {installed && (
            <Action
              title="Uninstall"
              onAction={async () => {
                const options = {
                  title: "Confirm Uninstall",
                  message: `Are you sure you want to uninstall ${portName}?`,
                  primaryAction: {
                    title: "Uninstall",
                    style: Alert.ActionStyle.Destructive,
                  },
                };

                if (await confirmAlert(options)) {
                  await uninstallPort(portName);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
