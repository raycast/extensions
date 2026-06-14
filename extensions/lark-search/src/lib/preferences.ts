import { getPreferenceValues } from "@raycast/api";

const DEFAULT_LARK_CLI_PATH = "/opt/homebrew/bin/lark-cli";
const DEFAULT_LARK_BUNDLE_ID = "com.larksuite.larkApp";
const DEFAULT_FEISHU_BUNDLE_ID = "com.electron.lark";
const DEFAULT_LARK_APP_NAME = "Lark";
const DEFAULT_FEISHU_APP_NAME = "Feishu";
const DEFAULT_CLI_IDENTITY = "user";

type AppTargetPreference = "lark" | "feishu" | "both";

export type AppTarget = {
  key: "lark" | "feishu";
  productName: "Lark" | "Feishu";
  name: string;
  bundleId: string;
  cliIdentity: string;
};

export function getLarkCliPath() {
  const { larkCliPath } = getPreferenceValues<Preferences>();
  return nonEmpty(larkCliPath) ?? DEFAULT_LARK_CLI_PATH;
}

export function getLarkCliIdentity() {
  return getEnabledAppTargets()[0]?.cliIdentity ?? DEFAULT_CLI_IDENTITY;
}

export function getLarkCliIdentities() {
  const identities = getEnabledAppTargets()
    .map((target) => target.cliIdentity)
    .filter(Boolean);

  return unique(identities.length > 0 ? identities : [DEFAULT_CLI_IDENTITY]);
}

export function getOpenBundleIds() {
  const bundleIds = getEnabledAppTargets()
    .map((target) => target.bundleId)
    .filter(Boolean);

  return bundleIds.length > 0 ? bundleIds : [DEFAULT_LARK_BUNDLE_ID];
}

export function getEnabledAppTargets(): AppTarget[] {
  const preferences = getPreferenceValues<Preferences>();
  const appTarget = (preferences.appTarget ?? "lark") as AppTargetPreference;
  const identity =
    nonEmpty(preferences.larkCliIdentity) ?? DEFAULT_CLI_IDENTITY;
  const targets: AppTarget[] = [];

  if (appTarget === "feishu" || appTarget === "both") {
    targets.push({
      key: "feishu",
      productName: "Feishu",
      name: DEFAULT_FEISHU_APP_NAME,
      bundleId: DEFAULT_FEISHU_BUNDLE_ID,
      cliIdentity: identity,
    });
  }

  if (appTarget === "lark" || appTarget === "both") {
    targets.push({
      key: "lark",
      productName: "Lark",
      name: DEFAULT_LARK_APP_NAME,
      bundleId: DEFAULT_LARK_BUNDLE_ID,
      cliIdentity: identity,
    });
  }

  return targets.length > 0 ? targets : [larkTarget(identity)];
}

export function withCliIdentity(
  args: string[],
  identity = getLarkCliIdentity(),
) {
  if (args.includes("--as")) {
    return args;
  }

  if (args.length < 2) {
    return [...args, "--as", identity];
  }

  return [args[0], args[1], "--as", identity, ...args.slice(2)];
}

function nonEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function larkTarget(cliIdentity: string): AppTarget {
  return {
    key: "lark",
    productName: "Lark",
    name: DEFAULT_LARK_APP_NAME,
    bundleId: DEFAULT_LARK_BUNDLE_ID,
    cliIdentity,
  };
}
