import { ActionPanel, List, OpenInBrowserAction, Color, Icon, ImageLike } from "@raycast/api";
import { agents } from "caniuse-lite";
import * as caniuse from "caniuse-api";
import { getCanIUseLink } from "../utils";

interface FeatureDetailProps {
  feature: string;
}

export default function FeatureDetail({ feature }: FeatureDetailProps) {
  const supportTable = caniuse.getSupport(feature);

  return (
    <List searchBarPlaceholder="Search browsers...">
      {Object.entries(agents).map(([agentName, agentInfos]) => {
        if (!agentInfos || !supportTable[agentName]) {
          return null;
        }

        const agentSupport = supportTable[agentName];

        let accessoryTitle = "Not supported";
        let accessoryIcon: ImageLike = { source: Icon.XmarkCircle, tintColor: Color.Red };

        if ("u" in agentSupport) {
          accessoryTitle = "Unknown support";
          accessoryIcon = Icon.QuestionMark;
        }

        if ("a" in agentSupport || "x" in agentSupport) {
          accessoryTitle = "Partial support";
          accessoryIcon = { source: Icon.Checkmark, tintColor: Color.Orange };
        }

        if ("y" in agentSupport) {
          accessoryTitle = `Support since version ${agentSupport.y}`;
          accessoryIcon = { source: Icon.Checkmark, tintColor: Color.Green };
        }

        return (
          <List.Item
            key={agentName}
            title={agentInfos.browser}
            accessoryTitle={accessoryTitle}
            accessoryIcon={accessoryIcon}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={getCanIUseLink(feature)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
