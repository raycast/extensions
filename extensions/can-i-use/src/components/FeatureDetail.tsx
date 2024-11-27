import { ActionPanel, List, Color, Icon, Action, Image } from "@raycast/api";
import * as caniuse from "caniuse-api";
import { agents } from "caniuse-lite";

import { getCanIUseLink } from "../utils";

interface FeatureDetailProps {
  feature: string;
  showReleaseDate: boolean;
  showPartialSupport: boolean;
  briefMode: boolean;
}

export enum Support {
  Unsupported = "Not supported",
  Unknown = "Support unknown",
  Partial = "Partial support",
  Supported = "Supported",
}

export default function FeatureDetail({ feature, showReleaseDate, showPartialSupport, briefMode }: FeatureDetailProps) {
  const supportTable = caniuse.getSupport(feature);
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: briefMode ? "short" : "long",
    day: "numeric",
  });
  const formatDate = (date: number) => ` (${briefMode ? "" : "Released "}${formatter.format(date * 1e3)})`;

  return (
    <List searchBarPlaceholder="Search browsers...">
      {Object.entries(agents).map(([agentName, agentInfos]) => {
        // No data is available for op_mini (Opera Mini)
        if (!agentInfos || !supportTable[agentName] || agentName === "op_mini") {
          return null;
        }

        const agentSupport = supportTable[agentName];

        let text = briefMode ? "" : Support.Unsupported;
        let icon: Image.ImageLike = { source: Icon.XMarkCircle, tintColor: Color.Red };
        let tooltip = Support.Unsupported;
        let version: number | null = null;

        if ("u" in agentSupport) {
          text = briefMode ? "" : Support.Unknown;
          icon = Icon.QuestionMark;
          tooltip = Support.Unknown;
        }

        if ("a" in agentSupport || "x" in agentSupport) {
          if (showPartialSupport) {
            version = (agentSupport.a || agentSupport.x)!;
            text = briefMode ? String(version) : `${Support.Partial} in version ${version}`;
          } else {
            text = briefMode ? "" : Support.Partial;
          }
          icon = { source: Icon.Checkmark, tintColor: Color.Orange };
          tooltip = Support.Partial;
        }

        if ("y" in agentSupport) {
          version = agentSupport.y!;
          text = briefMode ? String(version) : `${Support.Supported} since version ${version}`;
          icon = { source: Icon.Checkmark, tintColor: Color.Green };
          tooltip = Support.Supported;
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
            accessories={[{ text }, { icon, tooltip }]}
          />
        );
      })}
    </List>
  );
}
