import { Application, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import path from "path";
import { IconMetadata } from "../types.ts";
import { Store } from "./store.ts";
import { execPromise } from "./utils.ts";

export async function setIcon(app: Application, icon: IconMetadata | null) {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating icon...`,
      message: app.name,
    });
    if (!icon) {
      await revertIcon(app);
      await new Promise((resolve) => setTimeout(resolve, 200));

      toast.title = "Icon set to default";
    } else {
      await updateIcon(app, icon);

      toast.title = "Icon updated";
    }

    toast.style = Toast.Style.Success;
    toast.message = `Relaunch ${app.name} from dock to see changes`;
    toast.primaryAction = {
      title: `Clear Cache and Relaunch ${app.name}`,
      shortcut: { modifiers: ["cmd", "shift"], key: "r" },
      onAction: async () => {
        await clearDockCache();
        await relaunchApplication(app);
      },
    };
  } catch (error) {
    showFailureToast(error, { title: "Could not update icon" });
  }
}

export async function getDefaultIconPath(app: Application) {
  const { stdout } = await execPromise(
    `defaults read '${app.path}/Contents/Info' CFBundleIconFile`,
  );

  const iconName = stdout.trim();
  const iconNameWithExtension = iconName.endsWith(".icns")
    ? iconName
    : `${iconName}.icns`;

  return `${app.path}/Contents/Resources/${iconNameWithExtension}`;
}

export async function relaunchApplication(app: Application) {
  return await runAppleScript(`
		tell application "${app.name}"
			if its running then
				quit
				repeat while its running
					delay 0.1
				end repeat
			end if
			launch
		end tell
	`);
}

export async function clearDockCache() {
  return await execPromise(
    `find /private/var/folders/ -name com.apple.dock.iconcache -maxdepth 4 2>/dev/null | xargs rm && killall Dock`,
  );
}

async function updateIcon(app: Application, icon: IconMetadata) {
  return Promise.allSettled([
    runAppleScript(
      `
			use framework "Foundation"
			use scripting additions

			set appPath to POSIX path of "${app.path}"
			set iconURL to "${icon.icnsUrl}" as POSIX file
			set image to current application's NSImage's alloc()'s initWithContentsOfURL:iconURL
			set success to current application's NSWorkspace's sharedWorkspace's setIcon:image forFile:appPath options:0
			`,
    ),
    Store.setIcon(app, icon),
  ]);
}

async function revertIcon(app: Application) {
  return Promise.allSettled([
    execPromise(
      `xattr -d -r com.apple.FinderInfo "${app.path}" && rm "${path.join(app.path, "Icon\r")}"`,
    ),
    Store.unsetIcon(app),
  ]);
}
