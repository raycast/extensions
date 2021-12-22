import {
  ActionPanel,
  OpenInBrowserAction,
  List,
  Icon,
  Color,
  ImageLike,
  getPreferenceValues,
  PushAction,
} from "@raycast/api";
import { features, feature } from "caniuse-lite";
import * as caniuse from "caniuse-api";
import browserslist from "browserslist";
import { statusToName, resolvePath, getCanIUseLink } from "./utils";
import FeatureDetail from "./components/FeatureDetail";

const { environment, path } = getPreferenceValues();

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

        let accessoryIcon: ImageLike | null = null;
        if (browsers && browsers.length > 0) {
          accessoryIcon = caniuse.isSupported(featureName, browsers)
            ? { source: Icon.Checkmark, tintColor: Color.Green }
            : { source: Icon.XmarkCircle, tintColor: Color.Red };
        }

        return (
          <List.Item
            key={featureName}
            title={feat.title}
            keywords={[featureName]}
            accessoryTitle={statusToName[feat.status]}
            {...(accessoryIcon ? { accessoryIcon } : {})}
            actions={
              <ActionPanel>
                <PushAction title="Show details" icon={Icon.List} target={<FeatureDetail feature={featureName} />} />
                <OpenInBrowserAction url={getCanIUseLink(featureName)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
