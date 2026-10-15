import { Action, environment, Icon, open, showInFinder, showToast, Toast } from "@raycast/api";
import { copyFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { HELPER_VERSION } from "../lib/bricks-data";
import { Site } from "../lib/sites";

/**
 * Puts the helper plugin zip this extension ships with in Downloads and opens the site's plugin
 * upload page. WordPress offers "Replace current with uploaded" when the plugin is already there.
 */
export function InstallHelperAction(props: { site: Site; update: boolean }) {
  async function install() {
    try {
      const target = join(homedir(), "Downloads", "bricks-raycast-helper.zip");
      await copyFile(join(environment.assetsPath, "bricks-raycast-helper.zip"), target);
      await showInFinder(target);
      await open(`${props.site.url}/wp-admin/plugin-install.php?tab=upload`);
      await showToast({
        style: Toast.Style.Success,
        title: `Upload bricks-raycast-helper.zip on ${props.site.name}`,
        message: props.update
          ? `It's in Downloads. Choose it, then "Replace current with uploaded" to update to ${HELPER_VERSION}.`
          : "It's in Downloads. Choose it, install, then activate the plugin.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't prepare the helper plugin",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Action
      title={props.update ? "Update Helper Plugin" : "Install Helper Plugin"}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      onAction={install}
    />
  );
}
