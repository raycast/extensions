/**
 * upgrade-all — a "no-view" command that immediately upgrades all
 * enabled package managers without opening the list UI.
 *
 * Run it via Raycast ⌘ + Space → "Upgrade All Packages"
 */

import {
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";

import {
  checkBrew,
  checkNpm,
  checkYarn,
  checkPnpm,
  checkPip,
  checkPipx,
  checkCargo,
  checkGem,
  checkMas,
  checkGo,
  upgradeBrew,
  upgradeNpm,
  upgradeYarn,
  upgradePnpm,
  upgradePip,
  upgradePipx,
  upgradeCargo,
  upgradeGem,
  upgradeMas,
  upgradeGo,
} from "./ecosystems";
import { createBackup } from "./export-backups";

type EcosystemJob = {
  name: string;
  enabled: boolean;
  check: () => Promise<unknown[]>;
  upgrade: () => Promise<string>;
};

export default async function Command() {
  const prefs = getPreferenceValues() as Record<string, any>;

  const jobs: EcosystemJob[] = [
    {
      name: "Homebrew",
      enabled: prefs.enableBrew,
      check: checkBrew,
      upgrade: upgradeBrew,
    },
    {
      name: "npm (global)",
      enabled: prefs.enableNpm,
      check: checkNpm,
      upgrade: upgradeNpm,
    },
    {
      name: "yarn (global)",
      enabled: prefs.enableYarn,
      check: checkYarn,
      upgrade: upgradeYarn,
    },
    {
      name: "pnpm (global)",
      enabled: prefs.enablePnpm,
      check: checkPnpm,
      upgrade: upgradePnpm,
    },
    {
      name: "pip",
      enabled: prefs.enablePip,
      check: checkPip,
      upgrade: upgradePip,
    },
    {
      name: "pipx",
      enabled: prefs.enablePipx,
      check: checkPipx,
      upgrade: upgradePipx,
    },
    {
      name: "cargo",
      enabled: prefs.enableCargo,
      check: checkCargo,
      upgrade: upgradeCargo,
    },
    {
      name: "gem",
      enabled: prefs.enableGem,
      check: checkGem,
      upgrade: upgradeGem,
    },
    {
      name: "Mac App Store",
      enabled: prefs.enableMas,
      check: checkMas,
      upgrade: upgradeMas,
    },
    {
      name: "go (tools)",
      enabled: prefs.enableGo,
      check: checkGo,
      upgrade: upgradeGo,
    },
  ];

  const enabled = jobs.filter((j) => j.enabled);

  if (enabled.length === 0) {
    await showHUD(
      "No package managers enabled — open preferences to configure.",
    );
    return;
  }

  await showHUD(`Checking ${enabled.length} package manager(s)…`);

  const results: {
    name: string;
    count: number;
    upgraded: boolean;
    error?: string;
  }[] = [];

  // Dry-run mode
  if (prefs.dryRunMode) {
    for (const job of enabled) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Checking ${job.name}…`,
      });

      try {
        const outdated = await job.check();
        if (outdated.length === 0) {
          toast.style = Toast.Style.Success;
          toast.title = `${job.name} — already up to date`;
          results.push({ name: job.name, count: 0, upgraded: false });
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `${job.name} — ${outdated.length} package(s) would be upgraded`;
          results.push({
            name: job.name,
            count: outdated.length,
            upgraded: false,
          });
        }
      } catch (err: any) {
        toast.style = Toast.Style.Failure;
        toast.title = `${job.name} — check failed`;
        toast.message = err?.message ?? String(err);
        results.push({
          name: job.name,
          count: 0,
          upgraded: false,
          error: err?.message ?? String(err),
        });
      }
    }

    const wouldUpgrade = results.filter((r) => r.count > 0);
    const totalPackages = wouldUpgrade.reduce((acc, r) => acc + r.count, 0);
    await showHUD(
      `Dry-run: ${totalPackages} package(s) across ${wouldUpgrade.length} ecosystem(s) would be upgraded`,
    );
    return;
  }

  // Confirmation
  if (prefs.confirmBeforeUpgrade) {
    const outdatedJobs: typeof enabled = [];
    for (const job of enabled) {
      try {
        const outdated = await job.check();
        if (outdated.length > 0) {
          outdatedJobs.push(job);
        }
      } catch {
        // Skip errors during pre-check
      }
    }

    if (outdatedJobs.length === 0) {
      await showHUD("Everything is already up to date! ✅");
      return;
    }

    const confirmed = await confirmAlert({
      title: "Upgrade all ecosystems?",
      message: `${outdatedJobs.map((j) => j.name).join(", ")} will be upgraded.`,
      primaryAction: { title: "Upgrade All", style: Alert.ActionStyle.Default },
    });

    if (!confirmed) {
      await showHUD("Upgrade cancelled");
      return;
    }
  }

  // Backup before upgrade
  if (prefs.backupBeforeUpgrade) {
    try {
      await createBackup();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Backup failed",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  // Execute upgrades
  if (prefs.parallelUpgrade) {
    const upgradePromises = enabled.map(async (job) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Checking ${job.name}…`,
      });

      try {
        const outdated = await job.check();
        if (outdated.length === 0) {
          toast.style = Toast.Style.Success;
          toast.title = `${job.name} — already up to date`;
          results.push({ name: job.name, count: 0, upgraded: false });
          return;
        }

        toast.message = `${outdated.length} outdated — upgrading…`;
        await job.upgrade();

        toast.style = Toast.Style.Success;
        toast.title = `${job.name} — ${outdated.length} package(s) upgraded`;
        results.push({
          name: job.name,
          count: outdated.length,
          upgraded: true,
        });
      } catch (err: any) {
        toast.style = Toast.Style.Failure;
        toast.title = `${job.name} — failed`;
        toast.message = err?.message ?? String(err);
        results.push({
          name: job.name,
          count: 0,
          upgraded: false,
          error: err?.message ?? String(err),
        });
      }
    });

    await Promise.all(upgradePromises);
  } else {
    for (const job of enabled) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Checking ${job.name}…`,
      });

      try {
        const outdated = await job.check();
        if (outdated.length === 0) {
          toast.style = Toast.Style.Success;
          toast.title = `${job.name} — already up to date`;
          results.push({ name: job.name, count: 0, upgraded: false });
          continue;
        }

        toast.message = `${outdated.length} outdated — upgrading…`;
        await job.upgrade();

        toast.style = Toast.Style.Success;
        toast.title = `${job.name} — ${outdated.length} package(s) upgraded`;
        results.push({
          name: job.name,
          count: outdated.length,
          upgraded: true,
        });
      } catch (err: any) {
        toast.style = Toast.Style.Failure;
        toast.title = `${job.name} — failed`;
        toast.message = err?.message ?? String(err);
        results.push({
          name: job.name,
          count: 0,
          upgraded: false,
          error: err?.message ?? String(err),
        });
      }
    }
  }

  const upgraded = results.filter((r) => r.upgraded);
  const failed = results.filter((r) => r.error);

  if (failed.length > 0) {
    await showHUD(
      `Done — ${upgraded.length} upgraded, ${failed.length} failed.`,
    );
  } else if (upgraded.length === 0) {
    await showHUD("Everything is already up to date! ✅");
  } else {
    const total = upgraded.reduce((acc, r) => acc + r.count, 0);
    await showHUD(
      `Upgraded ${total} package(s) across ${upgraded.length} ecosystem(s) 🎉`,
    );
  }
}
