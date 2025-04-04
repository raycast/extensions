import { Application, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { IconMetadata } from "../types.ts";
import { Store } from "./store.ts";
import { execPromise } from "./utils.ts";

export async function setIcon(app: Application, icon: IconMetadata | null) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Updating icon...`,
  });

  try {
    if (!icon) {
      await execPromise(
        `xattr -d -r com.apple.FinderInfo "${app.path}" && rm -rf "${app.path}"$'/Icon\r'`,
      );
      await Store.unsetIcon(app);
    } else {
      await execPromise(
        `
        replace_icon(){
          droplet="$1"
          icon="$2"
          if [[ "$icon" =~ ^https?:// ]]; then
              curl -sLo /tmp/icon "$icon"
              icon=/tmp/icon
          fi
          rm -rf "$droplet"$'/Icon\r'
          sips -i "$icon" >/dev/null
          DeRez -only icns "$icon" > /tmp/icns.rsrc
          Rez -append /tmp/icns.rsrc -o "$droplet"$'/Icon\r'
          SetFile -a C "$droplet"
          SetFile -a V "$droplet"$'/Icon\r'
        }; replace_icon '${app.path}' '${icon.icnsUrl}'
      `,
      );

      await Store.setIcon(app, icon);
    }

    toast.style = Toast.Style.Success;
    toast.title = "Changed icon";
    toast.message = `Relaunch ${app.name} from dock to see changes`;
    toast.primaryAction = {
      title: `Clear Cache and Relaunch ${app.name}`,
      shortcut: { modifiers: ["cmd", "shift"], key: "r" },
      onAction: async () => {
        await clearDockCache();
        await relaunchApplication(app);
      },
    };
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = e?.toString() ?? "Something went wrong";
  }
}

export async function getDefaultIconPath(app: Application) {
  const { stdout } = await execPromise(
    `defaults read '${app.path}/Contents/Info' CFBundleIconFile`,
  );

  return `${app.path}/Contents/Resources/${stdout.trim()}`;
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
