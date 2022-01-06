import { XcodeSimulatorApplication } from "../../models/simulator/xcode-simulator-application.model";
import { ActionPanel, CopyToClipboardAction, Icon, List, Navigation, ShowInFinderAction } from "@raycast/api";

/**
 * Xcode Simulator Application Detail
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 * @param navigation The Navigation
 */
export function xcodeSimulatorApplicationDetail(
  xcodeSimulatorApplication: XcodeSimulatorApplication,
  navigation: Navigation
): JSX.Element {
  const applicationDirectories = [
    ["Open Documents directory", xcodeSimulatorApplication.sandBoxDocumentsPath],
    ["Open Caches directory", xcodeSimulatorApplication.sandBoxCachesPath],
    ["Open SandBox directory", xcodeSimulatorApplication.sandBoxPath],
    ["Open Bundle directory", xcodeSimulatorApplication.bundlePath],
  ];
  return (
    <List navigationTitle={xcodeSimulatorApplication.name} searchBarPlaceholder={xcodeSimulatorApplication.name}>
      <List.Section title={"Directories"}>
        {applicationDirectories.map((directory) => {
          return (
            <List.Item
              key={directory[1]}
              icon={Icon.Finder}
              title={directory[0]}
              actions={
                <ActionPanel>
                  <ShowInFinderAction path={directory[1]} />
                  <CopyToClipboardAction content={directory[1]} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={"Other"}>
        <List.Item
          key={"back-to-list"}
          icon={Icon.XmarkCircle}
          title={"Back to list"}
          actions={
            <ActionPanel>
              <ActionPanel.Item title="Back" onAction={navigation.pop} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
