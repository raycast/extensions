import { ActionPanel, List, Color, Icon, Action, Image } from "@raycast/api";
import { agents } from "caniuse-lite";
import * as caniuse from "caniuse-api";
import { getCanIUseLink } from "../utils";

interface FeatureDetailProps {
  feature: string;
  showReleaseDate: boolean;
  showPartialSupport: boolean;
  briefMode: boolean;
}

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function FeatureDetail({ feature, showReleaseDate, showPartialSupport, briefMode }: FeatureDetailProps) {
  const supportTable = caniuse.getSupport(feature);
  const formatDate = (date: number) => ` (${briefMode ? "" : "Released "}${formatter.format(date * 1e3)})`;

  return (
    <List searchBarPlaceholder="Search browsers...">
      {Object.entries(agents).map(([agentName, agentInfos]) => {
        if (!agentInfos || !supportTable[agentName]) {
          return null;
        }

        const agentSupport = supportTable[agentName];

        let text = briefMode ? "" : "Not supported";
        let icon: Image.ImageLike = { source: Icon.XMarkCircle, tintColor: Color.Red };
        let version: number | null = null;

        if ("u" in agentSupport) {
          text = briefMode ? "" : "Unknown support";
          icon = Icon.QuestionMark;
        }

        if ("a" in agentSupport || "x" in agentSupport) {
          if (showPartialSupport) {
            version = (agentSupport.a || agentSupport.x)!;
            text = briefMode ? String(version) : `Partial support in version ${version}`;
          } else {
            text = briefMode ? "" : "Partial support";
          }
          icon = { source: Icon.Checkmark, tintColor: Color.Orange };
        }

        if ("y" in agentSupport) {
          version = agentSupport.y!;
          text = briefMode ? String(version) : `Support since version ${version}`;
          icon = { source: Icon.Checkmark, tintColor: Color.Green };
        }

        if (showReleaseDate && version) {
          const releaseDate = agentInfos.release_date[version];
          if (releaseDate) {
            text += formatDate(releaseDate);
          }
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
