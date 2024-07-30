import { environment, getPreferenceValues, LaunchType, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import path from "path";

interface Preferences {
  dirs: string;
}

async function command(cmd: any) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(`failed: ${error.message}`)
        return
      }
      if (stderr) {
        reject(`error: ${stderr}`)
        return
      }
      resolve(stdout)
    })
  })

}

// Runs async. code in a no-view command
export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  let toast: any
  if (environment.launchType === LaunchType.UserInitiated) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: ".",
    });
  } else {
    toast = {}
  }

  for (const dir of preferences.dirs.split(',')) {
    const d = dir.trim()
    const file_name = path.basename(d)

    console.log(`exec ${d}`)

    if (environment.launchType === LaunchType.UserInitiated) {
      toast.style = Toast.Style.Animated;
      toast.title = `Syncing ${file_name}`
    }



    const result = await command(`sh ${dir.trim()}`)
    if (environment.launchType === LaunchType.UserInitiated) {
      toast.style = Toast.Style.Success;
      toast.title = `${file_name}: ${result}`;
    }

  }

  // await showHUD(JSON.stringify(preferences));
}
