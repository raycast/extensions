import { exec, execSync } from "child_process";
import { promisify } from "util";
import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";

export function getLinakControllerPath() {
  const preferences = getPreferenceValues<Preferences>();
  const commandFolderPath = execSync(`
  locations=(
      /usr/local/bin
      /usr/bin
      /bin
      /usr/sbin
      /sbin
      /opt/X11/bin
      /opt/homebrew/bin
      /usr/local/Cellar
      ${preferences.python}
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location/linak-controller" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
  `)
    .toString()
    .trim();

  if (commandFolderPath) {
    return commandFolderPath.replace(/\n/gi, "") + "/linak-controller";
  }
  return "";
}

export function isLinakControllerInstalled() {
  return !!getLinakControllerPath();
}

const execAsync = promisify(exec);

export async function moveTo(height: number) {
  const preferences = getPreferenceValues<Preferences>();

  if (!isLinakControllerInstalled()) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't find linak-controller CLI",
      message:
        "Please install linak-controller CLI according to the instructions and make sure it's available in your path.",
      primaryAction: {
        title: "Download from GitHub",
        onAction: () => {
          open("https://github.com/rhyst/linak-controller");
        },
      },
    });
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Moving desk",
  });

  try {
    const { stdout } = await execAsync(
      `${getLinakControllerPath()} ${preferences.server ? "--forward" : ""} --mac-address ${
        preferences.uuid
      } --move-to ${height}`,
    );
    if (stdout.includes("Something unexpected went wrong") && preferences.server) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong, couldn't move desk";
      toast.message = "Please make sure the linak-controller server is running on 127.0.0.1:9123.";
      return null;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Desk moved successfully";
    return stdout;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong, couldn't move desk";
    throw error;
  }
}
