import { spawn } from "node:child_process";
import { isMacPlatform } from "./platform";
import type { AuthorizedCompanionEffect, AuthorizedPostLaunchEffectsPlan } from "./security";

export type PostLaunchResult = {
  companionOpened: boolean;
  devServerOpened: boolean;
  warnings: string[];
};

export type OpenUrlFn = (url: string) => Promise<void>;
export type LaunchCompanionFn = (effect: AuthorizedCompanionEffect) => Promise<void>;

export type PostLaunchPhase = "companions" | "devServer" | "all";

const defaultOpenUrl: OpenUrlFn = async (url) => {
  const invocation = buildOpenUrlInvocation(url);
  await spawnDetached(invocation.executable, invocation.args);
};

export function buildOpenUrlInvocation(url: string): { executable: string; args: string[] } {
  if (isMacPlatform()) {
    return { executable: "open", args: [url] };
  }
  return { executable: "explorer.exe", args: [url] };
}

/** Build the process invocation used to launch a companion on the current platform. */
export function buildCompanionLaunchInvocation(
  executablePath: string,
  args: string[],
): { executable: string; args: string[] } {
  if (!isMacPlatform()) {
    return { executable: executablePath, args };
  }

  const lower = executablePath.replace(/\\/g, "/").toLowerCase();
  if (lower.endsWith("/finder.app") || lower.endsWith("/finder")) {
    return { executable: "open", args: args.length > 0 ? args : ["."] };
  }
  if (lower.endsWith(".app")) {
    return args.length > 0
      ? { executable: "open", args: [executablePath, "--args", ...args] }
      : { executable: "open", args: [executablePath] };
  }
  return { executable: executablePath, args };
}

export async function runCompanionActions(
  plan: AuthorizedPostLaunchEffectsPlan,
  options?: { launchCompanion?: LaunchCompanionFn },
): Promise<Pick<PostLaunchResult, "companionOpened" | "warnings">> {
  const launchCompanion = options?.launchCompanion ?? launchCompanionEffect;
  const warnings: string[] = [];
  let companionOpened = false;

  for (const companion of plan.companions) {
    try {
      await launchCompanion(companion);
      companionOpened = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Companion app launch failed.";
      warnings.push(message);
    }
  }

  return { companionOpened, warnings };
}

export async function runDevServerAction(
  plan: AuthorizedPostLaunchEffectsPlan,
  options?: { openUrl?: OpenUrlFn },
): Promise<Pick<PostLaunchResult, "devServerOpened" | "warnings">> {
  const openUrl = options?.openUrl ?? defaultOpenUrl;
  const warnings: string[] = [];
  let devServerOpened = false;

  if (plan.devServerUrl) {
    try {
      await openUrl(plan.devServerUrl);
      devServerOpened = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dev server link failed.";
      warnings.push(message);
    }
  }

  return { devServerOpened, warnings };
}

export async function runPostLaunchActions(
  plan: AuthorizedPostLaunchEffectsPlan,
  options?: {
    openUrl?: OpenUrlFn;
    launchCompanion?: LaunchCompanionFn;
    phase?: PostLaunchPhase;
  },
): Promise<PostLaunchResult> {
  const phase = options?.phase ?? "all";
  const warnings: string[] = [];
  let companionOpened = false;
  let devServerOpened = false;

  if (phase === "companions" || phase === "all") {
    const companions = await runCompanionActions(plan, { launchCompanion: options?.launchCompanion });
    companionOpened = companions.companionOpened;
    warnings.push(...companions.warnings);
  }

  if (phase === "devServer" || phase === "all") {
    const devServer = await runDevServerAction(plan, { openUrl: options?.openUrl });
    devServerOpened = devServer.devServerOpened;
    warnings.push(...devServer.warnings);
  }

  return { companionOpened, devServerOpened, warnings };
}

async function launchCompanionEffect(effect: AuthorizedCompanionEffect): Promise<void> {
  const args = buildCompanionArguments(effect.arguments, effect.workingDirectory);
  const invocation = buildCompanionLaunchInvocation(effect.executablePath, args);
  await spawnDetached(invocation.executable, invocation.args);
}

export function buildCompanionArguments(rawArguments: string | null | undefined, directory: string): string[] {
  if (!rawArguments || !rawArguments.trim()) {
    return [directory];
  }

  return tokenizeCompanionArguments(rawArguments)
    .map((token) => token.replace(/\{folder\}/gi, directory).replace(/^\.$/i, directory))
    .filter(Boolean);
}

function tokenizeCompanionArguments(raw: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of raw) {
    if (inQuotes) {
      if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function spawnDetached(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
