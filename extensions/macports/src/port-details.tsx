import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Image } from "@raycast/api";
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

  const { name, description, homepage, maintainers, variants, dependencies, version } = portDetails;

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${name}\n\n${description || "No description available"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Homepage" target={homepage} text={homepage} />

          {version && (
            <Detail.Metadata.TagList title="Version">
              <Detail.Metadata.TagList.Item text={version} key={version} />
            </Detail.Metadata.TagList>
          )}

          {maintainers.length > 0 && (
            <Detail.Metadata.TagList title="Maintainers">
              {maintainers.map((maintainer) => {
                const username = maintainer.github || maintainer.email || "unspecified";

                return (
                  <Detail.Metadata.TagList.Item
                    key={username}
                    text={username}
                    icon={maintainer.avatarUrl ? { source: maintainer.avatarUrl, mask: Image.Mask.Circle } : undefined}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          )}

          {variants.length > 0 && (
            <Detail.Metadata.TagList title="Variants">
              {variants.map((variant) => (
                <Detail.Metadata.TagList.Item text={variant} key={variant} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {dependencies.length > 0 && (
            <Detail.Metadata.TagList title="Dependencies">
              {dependencies.map((dependency) => (
                <Detail.Metadata.TagList.Item text={dependency} key={dependency} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
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
          {installed && (
            <Action
              title="Uninstall"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
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
                  uninstallPort(portName);
                }
              }}
            />
          )}
          <Action.CopyToClipboard title="Copy Install Command" content={`sudo port install ${portName}`} />
          <Action.OpenInBrowser title="Open Homepage in Browser" url={homepage} />
        </ActionPanel>
      }
    />
  );
}
