import { ActionPanel, List, Icon, Color, getPreferenceValues, Action, Image } from "@raycast/api";
import { features, feature } from "caniuse-lite";
import * as caniuse from "caniuse-api";
import browserslist from "browserslist";
import { statusToName, resolvePath, getCanIUseLink } from "./utils";
import FeatureDetail from "./components/FeatureDetail";

const { showReleaseDate, showPartialSupport, briefMode, environment, path } = getPreferenceValues<{
  showReleaseDate: boolean;
  showPartialSupport: boolean;
  briefMode: boolean;
  environment: string;
  path: string;
}>();

const env = environment || "production";

let browsers: string[] | null = null;
if (path) {
  browsers = browserslist(null, { path: resolvePath(path), env });
}

export default function CanIUse() {
  return (
    <List searchBarPlaceholder="Search technologies...">
      {Object.entries(features).map(([featureName, packedFeature]) => {
        const feat = feature(packedFeature);

        const accessories: List.Item.Accessory[] = [
          { text: briefMode ? feat.status.toUpperCase() : statusToName[feat.status] },
        ];

        if (browsers && browsers.length > 0) {
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
