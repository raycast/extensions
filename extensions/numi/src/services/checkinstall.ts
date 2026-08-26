import { getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const NUMI_BUNDLE_IDS = ["com.dmitrynikolaev.numi", "com.nikolaeu.numi-setapp", "com.nikolaeu.numi"];

/** Probed in order when the user has not set an explicit binary path. */
const NUMI_CLI_CANDIDATES = ["/opt/homebrew/bin/numi-cli", "/usr/local/bin/numi-cli", "numi-cli"];

/**
 * Raycast runs commands with a minimal PATH, so a bare `numi-cli` lookup needs
 * the usual install locations added back before execFile can resolve it.
 */
const EXTRA_PATH_ENTRIES = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

function execEnvironment(): NodeJS.ProcessEnv {
  const path = [process.env.PATH, ...EXTRA_PATH_ENTRIES].filter(Boolean).join(":");
  return { ...process.env, PATH: path };
}

let resolvedCliPath: string | undefined;

async function isValidNumiCli(binary: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, ["--version"], { env: execEnvironment() });
    if (stderr) return false;
    return stdout.includes("numi-cli");
  } catch {
    return false;
  }
}

/**
 * Resolves the numi-cli binary. The `numi_cli_binary_path` preference acts as an
 * override; when it is empty or invalid we fall back to auto-detection so Intel
 * Macs (/usr/local/bin) work without the user configuring anything.
 */
export async function findNumiCliPath(): Promise<string | undefined> {
  if (resolvedCliPath) return resolvedCliPath;

  const { numi_cli_binary_path } = getPreferenceValues<Preferences>();
  const override = numi_cli_binary_path?.trim();
  const candidates = [...new Set(override ? [override, ...NUMI_CLI_CANDIDATES] : NUMI_CLI_CANDIDATES)];

  for (const candidate of candidates) {
    if (await isValidNumiCli(candidate)) {
      resolvedCliPath = candidate;
      return candidate;
    }
  }

  return undefined;
}

export async function requireNumiCliPath(): Promise<string> {
  const binary = await findNumiCliPath();
  if (!binary) {
    throw new Error("Could not find numi-cli. Install it, or set the binary path in extension preferences.");
  }
  return binary;
}

export async function isNumiCliInstalled(): Promise<boolean> {
  return (await findNumiCliPath()) !== undefined;
}

async function isNumiInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId !== undefined && NUMI_BUNDLE_IDS.includes(bundleId));
}

export async function checkNumiInstallation(): Promise<void> {
  const { use_numi_cli } = getPreferenceValues<Preferences>();

  if (use_numi_cli) {
    if (await isNumiCliInstalled()) return;

    await showToast({
      style: Toast.Style.Failure,
      title: "Numi CLI is not installed.",
      message: "Install it from: https://github.com/nikolaeu/numi#numi-cli",
      primaryAction: {
        title: "Open numi-cli Instructions",
        onAction: (toast) => {
          open("https://github.com/nikolaeu/numi#numi-cli");
          toast.hide();
        },
      },
    });
    return;
  }

  if (await isNumiInstalled()) return;

  await showToast({
    style: Toast.Style.Failure,
    title: "Numi is not installed.",
    message: "Install it from: https://numi.app/",
    primaryAction: {
      title: "Open numi.app",
      onAction: (toast) => {
        open("https://numi.app/");
        toast.hide();
      },
    },
  });
}
