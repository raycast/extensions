import { getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface SaveImageProps {
  url: string;
  id: string;
}

export const saveImage = async ({ url, id }: SaveImageProps) => {
  const { downloadSize } = getPreferenceValues<Preferences>();

  try {
    await showHUD("Please select a location to save the image...");

    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${id}-${downloadSize}.jpg"
      set q_temp_folder to quoted form of temp_folder

      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);
  } catch (err) {
    console.error(err);
    await showHUD("Couldn't save the image...");
  }
};

export default saveImage;
