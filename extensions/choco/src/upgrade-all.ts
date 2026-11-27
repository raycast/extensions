import { showHUD, showToast, Toast } from "@raycast/api";
import {
  ElevationCanceledError,
  listOutdatedPackages,
  upgradeAllPackages,
} from "./choco/cli";

export default async function UpgradeAllCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking outdated Chocolatey packages...",
  });

  try {
    const outdated = await listOutdatedPackages();
    const upgradable = outdated.filter((pkg) => !pkg.pinned);

    if (upgradable.length === 0) {
      await toast.hide();
      await showHUD("All Chocolatey packages are up to date");
      return;
    }

    toast.title = `Upgrading ${upgradable.length} Chocolatey package${upgradable.length === 1 ? "" : "s"}...`;
    await upgradeAllPackages();

    toast.style = Toast.Style.Success;
    toast.title = `Upgraded ${upgradable.length} package${upgradable.length === 1 ? "" : "s"}`;
    await showHUD(
      `Upgraded ${upgradable.length} Chocolatey package${upgradable.length === 1 ? "" : "s"}`,
    );
  } catch (error) {
    if (
      error instanceof ElevationCanceledError ||
      (error as Error).name === "ElevationCanceledError"
    ) {
      toast.style = Toast.Style.Failure;
      toast.title = "Elevation Canceled";
      toast.message =
        "Administrator permission is required to upgrade packages.";
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Upgrade All Failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
