import { ActionPanel, List, Icon, Color, getPreferenceValues, Action } from "@raycast/api";
import browserslist from "browserslist";
import * as caniuse from "caniuse-api";
import { features, feature } from "caniuse-lite";

import FeatureDetail, { Support } from "./components/FeatureDetail";
import { statusToName, resolvePath, getCanIUseLink } from "./utils";

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
    (browser) => browser !== "op_mini all",
  );
} catch (e) {
  console.error("Failed to query Browserslist:", e);
}

export default function CanIUse() {
  return (
    <List searchBarPlaceholder="Search technologies...">
      {Object.entries(features).map(([featureName, packedFeature]) => {
        const feat = feature(packedFeature);

        const accessories: List.Item.Accessory[] = [
          { text: briefMode ? feat.status.toUpperCase() : statusToName[feat.status] },
        ];

        if (browsers.length > 0) {
          const icon: List.Item.Accessory = caniuse.isSupported(featureName, browsers)
            ? { icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: Support.Supported }
            : { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: Support.Unsupported };

          accessories.push(icon);
        }

        return (
          <List.Item
            key={featureName}
            title={feat.title}
            keywords={[featureName]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
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
                <Action.OpenInBrowser url={getCanIUseLink(featureName)} />
              </ActionPanel>
            }
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
