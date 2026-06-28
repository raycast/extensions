/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, List, Color, Icon } from "@raycast/api";
import { homedir } from "os";
import { usePhpState } from "./hooks/usePhpState";

const PHP_DIR = `${homedir()}/Library/Application Support/Herd/config/php/`;
const BIN_DIR = `${homedir()}/Library/Application Support/Herd/bin/`;

export default function Command() {
  const { state, actions } = usePhpState();

  return (
    <List isLoading={state?.loading}>
      <List.Item
        key={`open_php`}
        title={"Overview"}
        accessories={[{ icon: Icon.ArrowNe, tooltip: "Open in Herd" }]}
        actions={
          <ActionPanel>
            <Action
              key="open-service"
              title={"Open PHP versions in Herd"}
              onAction={async () => {
                await actions.open();
              }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Installed">
        {state?.versions?.map((version) => {
          if (!version.installed) {
            return null;
          }
          const accessories = [];

          if (version.updateAvailable) {
            accessories.push({ tag: { value: "Update available", color: Color.SecondaryText } });
          }

          accessories.push({ text: version.latest });

          if (version.status === "active") {
            accessories.push({ text: { value: "●", color: Color.Green }, tooltip: "Running" });
          } else if (version.status === "error") {
            accessories.push({ text: { value: "●", color: Color.Red }, tooltip: "Error" });
          } else {
            accessories.push({ text: { value: "●", color: Color.SecondaryText }, tooltip: "Inactive" });
          }

          return (
            <List.Item
              key={`php_${version.key}`}
              title={`PHP ${version.cycle}`}
              accessories={accessories}
              subtitle={version.cycle === state?.currentVersion ? "Default" : undefined}
              actions={
                <ActionPanel title={`PHP ${version.cycle}`}>
                  <Action
                    title="Use as Global PHP Version"
                    icon={Icon.Globe}
                    onAction={async () => {
                      await actions.setGlobalPhpVersion(version.cycle);
                    }}
                  />
                  <Action.OpenWith
                    title="Open php.ini"
                    icon={Icon.Document}
                    path={PHP_DIR + `${version.key}/php.ini`}
                  />
                  {version.updateAvailable && (
                    <Action
                      title="Install Update"
                      icon={Icon.Stars}
                      onAction={async () => await actions.updatePHPVersion(version.cycle)}
                    />
                  )}
                  <ActionPanel.Section title="Config">
                    <Action.ShowInFinder title="Show Config Directory" path={PHP_DIR + version.key} />
                    <Action.CopyToClipboard title="Copy Binary Path" content={BIN_DIR + "php" + version.key} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Not installed">
        {state?.versions?.map((version) => {
          if (version.installed) {
            return null;
          }

          return (
            <List.Item
              key={`php_${version.key}`}
              title={`PHP ${version.cycle}`}
              actions={
                <ActionPanel title={`PHP ${version.cycle}`}>
                  <Action title="Install" onAction={async () => await actions.installPHPVersion(version.cycle)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
