import { Action, ActionPanel, Detail, environment, Icon, Keyboard, showInFinder, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { HELPER_VERSION } from "../lib/bricks-data";
import { buildZip } from "../lib/helper-zip";
import { escapeMarkdown } from "../lib/markdown";
import { Site, wpAdminUrl } from "../lib/sites";

type Mode = "install" | "update" | "reinstall";

const TITLES: Record<Mode, string> = {
  install: "Install Helper Plugin",
  update: "Update Helper Plugin",
  reinstall: "Reinstall Helper Plugin",
};

const ZIP_PATH = join(homedir(), "Downloads", "bricks-raycast-helper.zip");

/** Builds the zip from the plugin source this extension ships with and puts it in Downloads. */
async function prepareZip(): Promise<string> {
  await writeFile(ZIP_PATH, buildZip(join(environment.assetsPath, "bricks-raycast-helper"), "bricks-raycast-helper"));
  return ZIP_PATH;
}

function guide(site: Site, mode: Mode): string {
  const replace =
    mode === "install"
      ? ""
      : `\n   WordPress sees the plugin is already there: click **Replace current with uploaded**.`;
  const siteName = escapeMarkdown(site.name);
  return `## ${TITLES[mode]} on ${siteName}

The Bricks Raycast Helper plugin lets Raycast read Bricks' classes, colors, templates and more from your site. Version ${HELPER_VERSION} is ready in your **Downloads** folder as \`bricks-raycast-helper.zip\`.

1. Press **↵** to open **Plugins › Add New › Upload Plugin** on ${siteName} (sign in to WordPress if asked).
2. Click **Choose File**, pick \`bricks-raycast-helper.zip\` from Downloads, then **Install Now**.${replace}
3. Click **Activate Plugin**${mode === "install" ? "" : " if WordPress asks"}.
4. Come back to Raycast and press **⌘R** in Bricks Site Health to check the site.

You need to be a WordPress administrator to upload plugins. The plugin's settings are under **Settings › Bricks Raycast**.`;
}

/** Step-by-step instructions next to the actions they need: the upload page and the zip. */
function HelperInstallGuide(props: { site: Site; mode: Mode }) {
  const { pop } = useNavigation();
  const { data: path, isLoading, error } = usePromise(prepareZip);

  const markdown = error
    ? `## Couldn't prepare the helper plugin\n\n${error.message}`
    : isLoading
      ? `## ${TITLES[props.mode]} on ${props.site.name}\n\nPreparing the plugin…`
      : guide(props.site, props.mode);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={TITLES[props.mode]}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Upload Plugin Page"
            icon={Icon.Upload}
            url={wpAdminUrl(props.site, "plugin-install.php?tab=upload")}
          />
          {path && (
            <Action
              title="Show Zip in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => showInFinder(path)}
            />
          )}
          <Action.OpenInBrowser
            title="Open Plugins Page"
            icon={Icon.Plug}
            shortcut={Keyboard.Shortcut.Common.Open}
            url={wpAdminUrl(props.site, "plugins.php")}
          />
          <Action title="Done" icon={Icon.Check} shortcut={{ modifiers: ["cmd"], key: "d" }} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

/** `mode`: install where it's missing, update where it's old, reinstall where it's current. */
export function InstallHelperAction(props: { site: Site; mode: Mode; onDone?: () => void }) {
  return (
    <Action.Push
      title={TITLES[props.mode]}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      target={<HelperInstallGuide site={props.site} mode={props.mode} />}
      onPop={props.onDone}
    />
  );
}
