import { showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface SaveImageProps {
  url: string;
  id: string;
}

export const saveImage = async ({ url, id }: SaveImageProps) => {
  const toast = await showToast(ToastStyle.Animated, "Saving image...");

  const { downloadSize }: { path: string; downloadSize: DownloadSize } = getPreferenceValues();

  try {
    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${id}-${downloadSize}.jpg"
      set q_temp_folder to quoted form of temp_folder

      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);

    toast.style = ToastStyle.Success;
    toast.title = "Image downloaded!";
  } catch (err) {
    console.error(err);

    toast.style = ToastStyle.Failure;
    toast.title = "Something went wrong.";
    toast.message = "Try with another image or check your internet connection.";
  }
};

export default saveImage;
