import { runAppleScript } from "run-applescript"
import { showHUD } from "@raycast/api"

export const download = async (url: string, id: string) => {
  try {
    await showHUD("Please select a location to save the image...")

    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${id}.jpg"
      set q_temp_folder to quoted form of temp_folder

      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `)
  } catch (err) {
    console.error(err)
    await showHUD("Couldn't save the image...")
  }
}
