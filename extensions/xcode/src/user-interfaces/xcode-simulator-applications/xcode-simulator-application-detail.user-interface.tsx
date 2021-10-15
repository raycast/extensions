import { XcodeSimulatorApplication } from "../../models/xcode-simulator-application.model";
import { ActionPanel, CopyToClipboardAction, Icon, List, ShowInFinderAction, useNavigation } from "@raycast/api";

/**
 * Xcode Simulator Application Detail
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 */
export function xcodeSimulatorApplicationDetail(
  xcodeSimulatorApplication: XcodeSimulatorApplication
): JSX.Element {
  const applicationDirectories = [
    ["Open Documents directory", xcodeSimulatorApplication.sandBoxDocumentsPath],
    ["Open Caches directory", xcodeSimulatorApplication.sandBoxCachesPath],
    ["Open SandBox directory", xcodeSimulatorApplication.sandBoxPath],
    ["Open Bundle directory", xcodeSimulatorApplication.bundlePath]
  ];
  const { pop } = useNavigation();
  return (
    <List navigationTitle={xcodeSimulatorApplication.name}>
      <List.Section title={"Directories"}>
        {
          applicationDirectories.map(directory => {
            return <List.Item
              icon={Icon.Finder}
              title={directory[0]}
              actions={
                <ActionPanel>
                  <ShowInFinderAction path={directory[1]} />
                  <CopyToClipboardAction content={directory[1]} />
                </ActionPanel>
              }
            />;
          })
        }
      </List.Section>
      <List.Section title={"Other"}>
        <List.Item
          icon={Icon.XmarkCircle}
          title={"Back to list"}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Back"
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
