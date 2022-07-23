import { ActionPanel, List, Color, Icon, Action, Image } from "@raycast/api";
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

        let text = "Not supported";
        let icon: Image.ImageLike = { source: Icon.XmarkCircle, tintColor: Color.Red };

        if ("u" in agentSupport) {
          text = "Unknown support";
          icon = Icon.QuestionMark;
        }

        if ("a" in agentSupport || "x" in agentSupport) {
          text = "Partial support";
          icon = { source: Icon.Checkmark, tintColor: Color.Orange };
        }

        if ("y" in agentSupport) {
          text = `Support since version ${agentSupport.y}`;
          icon = { source: Icon.Checkmark, tintColor: Color.Green };
        }

        return (
          <List.Item
            key={agentName}
            title={agentInfos.browser}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={getCanIUseLink(feature)} />
              </ActionPanel>
            }
            accessories={[{ text }, { icon }]}
          />
        );
      })}
    </List>
  );
}
