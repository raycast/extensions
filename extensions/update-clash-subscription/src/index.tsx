import { getPreferenceValues, showHUD, popToRoot, showToast, Toast } from "@raycast/api";
import { readJson } from "fs-extra";
import exec from "./utils/exec";

interface Preferences {
  subscriptionUrl: string;
  rules: string;
}

interface RuleFile {
  rules: string[];
}

const CLASH_CONFIG_PATH = `~/.config/clash`;

const curlCmd = (filePath: string, url: string) => {
  return `curl -m 15 --fail -L -o ${filePath} '${url}'`;
};

const sedCmd = (filePath: string, ruleRow: string) => {
  return `sed -i '' '/rules:/a\\
 ${ruleRow}
' ${filePath}`;
};

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { subscriptionUrl, rules } = preferences;

  const [name, url] = subscriptionUrl.split("|").map((item) => item.trim());
  const filePath = `${CLASH_CONFIG_PATH}/${name}.yaml`;
  const curl = curlCmd(filePath, url);

  try {
    showToast({
      style: Toast.Style.Animated,
      title: "Updating subscription",
    });

    await exec(curl);

    const rulesContent = (rules ? await readJson(rules) : {}) as RuleFile;

    const setRulePromiseArr: Promise<unknown>[] = [];
    (rulesContent?.rules || []).reverse().forEach((rule) => {
      setRulePromiseArr.push(exec(sedCmd(filePath, rule)));
    });

    await Promise.all(setRulePromiseArr);

    await showHUD("Subscription update successful");
  } catch (error) {
    console.error(error);
    await showHUD("Subscription update failed");
  }

  popToRoot({ clearSearchBar: true });
}
