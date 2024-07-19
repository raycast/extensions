import { closeMainWindow, environment, LaunchProps, showToast, Toast } from "@raycast/api";
import { execSync } from "node:child_process";
import { sep } from "path";

export default async function command(props: LaunchProps<{ arguments: Arguments.QuickCreateVolume }>) {
  const { name, format, quota } = props.arguments;
  const { assetsPath, supportPath } = environment;
  const bundleId = supportPath.split(sep).find((comp) => comp.startsWith("com.raycast")) ?? "com.raycast.macos";
  const toast = await showToast(Toast.Style.Animated, `Creating Volume '${name}'`);

  if (quota) {
    if (!Number.isInteger(Number(quota))) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create volume";
      toast.message = "Quota size must be an integer";
      return;
    }

    if (Number(quota) < 1) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create volume";
      toast.message = "Quota size must be greater than 0";
      return;
    }
  }

  const fs = format.split(":")[1] === "case-sensitive" ? "Case-sensitive APFS" : "APFS";
  const encrypted = (format.split(":")[2] === "encrypted") + "";

  const askpassPath = `${assetsPath}/scripts/askpass`;
  const env = Object.assign({}, process.env, { SUDO_ASKPASS: askpassPath, RAYCAST_BUNDLE: bundleId });

  let child;
  try {
    child = execSync(`chmod +x ${assetsPath}/scripts/*`, { env, encoding: "utf-8" });
    child = execSync(
      `sudo -A ${assetsPath}/scripts/create-volume ${name} "${fs}" ${encrypted} false ${quota ? quota : "none"}`,
      { env, encoding: "utf-8" },
    );
    if (child.includes("success")) {
      await closeMainWindow();
      toast.style = Toast.Style.Success;
      toast.title = `Successfully created volume '${name}'.`;
      await toast.show();
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create volume";
    toast.message = error instanceof Error ? error.message : String(error);
    await toast.show();
  }
}
