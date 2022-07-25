import { ActionPanel, List, Icon, Color, getPreferenceValues, Action, Image } from "@raycast/api";
import { features, feature } from "caniuse-lite";
import * as caniuse from "caniuse-api";
import browserslist from "browserslist";
import { statusToName, resolvePath, getCanIUseLink } from "./utils";
import FeatureDetail from "./components/FeatureDetail";

const { showReleaseDate, showPartialSupport, briefMode, defaultQuery, environment, path } = getPreferenceValues<{
  showReleaseDate: boolean;
  showPartialSupport: boolean;
  briefMode: boolean;
  defaultQuery: string;
  environment: string;
  path: string;
}>();

const env = environment || "production";

let browsers: string[] = [];
try {
  // No data is available for op_mini (Opera Mini)
  browsers = (path ? browserslist(null, { path: resolvePath(path), env }) : browserslist(defaultQuery)).filter(
    (browser) => browser !== "op_mini all"
  );
} catch (e) {
  console.error("Failed to query Browserslist:", e);
}

export default function CanIUse() {
  return (
    <List searchBarPlaceholder="Search technologies...">
      {Object.entries(features).map(([featureName, packedFeature]) => {
        const feat = feature(packedFeature);
        const link = getCanIUseLink(featureName);

        const accessories: List.Item.Accessory[] = [
          { text: briefMode ? feat.status.toUpperCase() : statusToName[feat.status] },
        ];

        if (browsers.length > 0) {
          const icon = caniuse.isSupported(featureName, browsers)
            ? { source: Icon.Checkmark, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red };

          accessories.push({ icon });
        }

        return (
          <List.Item
            key={featureName}
            title={feat.title}
            keywords={[featureName]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show details"
                  icon={Icon.List}
                  target={
                    <FeatureDetail
                      feature={featureName}
                      showReleaseDate={showReleaseDate}
                      showPartialSupport={showPartialSupport}
                      briefMode={briefMode}
                    />
                  }
                />
                <Action.OpenInBrowser url={link} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={link}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
