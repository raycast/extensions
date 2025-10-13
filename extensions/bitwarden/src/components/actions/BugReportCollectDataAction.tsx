import { Action, Clipboard, Icon, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { captureException } from "~/utils/development";
import { exec as execWithCallbacks } from "child_process";
import { promisify } from "util";
import { cliInfo } from "~/api/bitwarden";
import { existsSync } from "fs";
import { dirname } from "path";

const exec = promisify(execWithCallbacks);

/** strip out any sensitive data from preferences */
const getSafePreferences = () => {
  const {
    clientId,
    clientSecret,
    fetchFavicons,
    generatePasswordQuickAction,
    repromptIgnoreDuration,
    serverCertsPath,
    serverUrl,
    shouldCacheVaultItems,
    transientCopyGeneratePassword,
    transientCopyGeneratePasswordQuick,
    transientCopySearch,
    windowActionOnCopy,
  } = getPreferenceValues<AllPreferences>();

  return {
    has_clientId: !!clientId,
    has_clientSecret: !!clientSecret,
    fetchFavicons,
    generatePasswordQuickAction,
    repromptIgnoreDuration,
    has_serverCertsPath: !!serverCertsPath,
    has_serverUrl: !!serverUrl,
    shouldCacheVaultItems,
    transientCopyGeneratePassword,
    transientCopyGeneratePasswordQuick,
    transientCopySearch,
    windowActionOnCopy,
  };
};

const NA = "N/A";
const tryExec = async (command: string, trimLineBreaks = true) => {
  try {
    const { stdout } = await exec(`PATH="$PATH:${dirname(process.execPath)}" ${command}`);
    const response = stdout.trim();
    if (trimLineBreaks) return response.replace(/\n|\r/g, "");
    return response;
  } catch (error) {
    captureException(`Failed to execute command: ${command}`, error);
    return NA;
  }
};

const getBwBinInfo = () => {
  try {
    const cliPathPref = getPreferenceValues<Preferences>().cliPath;
    if (cliPathPref) {
      return { type: "custom", path: cliPathPref };
    }
    if (cliInfo.path.bin === cliInfo.path.downloadedBin) {
      return { type: "downloaded", path: cliInfo.path.downloadedBin };
    }
    return { type: "installed", path: cliInfo.path.installedBin };
  } catch (error) {
    return { type: NA, path: NA };
  }
};

const getHomebrewInfo = async () => {
  try {
    let path = "/opt/homebrew/bin/brew";
    if (!existsSync(path)) path = "/usr/local/bin/brew";
    if (!existsSync(path)) return { arch: NA, version: NA };

    const config = await tryExec(`${path} config`, false);
    if (config === NA) return { arch: NA, version: NA };

    const archValue = /HOMEBREW_PREFIX: (.+)/.exec(config)?.[1] || NA;
    const version = /HOMEBREW_VERSION: (.+)/.exec(config)?.[1] || NA;
    const arch = archValue !== NA ? (archValue.includes("/opt/homebrew") ? "arm64" : "x86_64") : NA;

    return { arch, version };
  } catch (error) {
    return { arch: NA, version: NA };
  }
};

function BugReportCollectDataAction() {
  const collectData = async () => {
    const toast = await showToast(Toast.Style.Animated, "Collecting data...");
    try {
      const preferences = getSafePreferences();
      const bwInfo = getBwBinInfo();
      const [systemArch, macosVersion, macosBuildVersion, bwVersion, brewInfo] = await Promise.all([
        tryExec("uname -m"),
        tryExec("sw_vers -productVersion"),
        tryExec("sw_vers -buildVersion"),
        tryExec(`"${bwInfo.path}" --version`),
        getHomebrewInfo(),
      ]);

      const data = {
        raycast: {
          version: environment.raycastVersion,
        },
        system: {
          arch: systemArch,
          version: macosVersion,
          buildVersion: macosBuildVersion,
        },
        homebrew: {
          arch: brewInfo.arch,
          version: brewInfo.version,
        },
        node: {
          arch: process.arch,
          version: process.version,
        },
        cli: {
          type: bwInfo.type,
          version: bwVersion,
        },
        preferences,
      };

      await Clipboard.copy(JSON.stringify(data, null, 2));
      toast.style = Toast.Style.Success;
      toast.title = "Data copied to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to collect bug report data";
      captureException("Failed to collect bug report data", error);
    }
  };

  return <Action title="Collect Bug Report Data" icon={Icon.Bug} onAction={collectData} />;
}

export default BugReportCollectDataAction;
