import { showHUD, confirmAlert, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

interface SaveImageProps {
  url: string;
  id: string;
  mode: "original" | "portrait" | "landscape";
}

export const saveImage = async ({ url, id, mode }: SaveImageProps) => {
  try {
    // Check for ImageMagick
    try {
      await execAsync("PATH=/usr/local/bin:/opt/homebrew/bin:$PATH magick -version");
    } catch (error) {
      await showHUD("ImageMagick not found");
      await confirmAlert({
        title: "ImageMagick Not Found",
        message:
          "ImageMagick is required for this operation. Please install it using Homebrew with the command:\n\nbrew install imagemagick\n\nAfter installation, please restart Raycast and run this command again.",
        primaryAction: {
          title: "Copy Install Command",
          onAction: () => {
            exec(`echo "brew install imagemagick" | pbcopy`);
          },
        },
      });
      await popToRoot();
      return;
    }

    // Proceed with the existing AppleScript if ImageMagick is installed
    await showHUD("Please select a location to save the image...");

    const formattedId = formatIdForFilename(id);
    const fileExtension = getFileExtension(url);

    const appleScript = `
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${formattedId}.${fileExtension}"
      set q_temp_folder to quoted form of temp_folder

      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
      do shell script cmd

      if (do shell script "test -e " & q_temp_folder & " && echo true") is "true" then
        if "${mode}" is "original" then
          set outputFile to (POSIX path of outputFolder) & "${formattedId}.${fileExtension}"
          set resize_cmd to ""
        else if "${mode}" is "portrait" then
          set outputFile to (POSIX path of outputFolder) & "${formattedId}_cropped.${fileExtension}"
          set resize_cmd to "-resize 2160x3840^ -gravity center -crop 2160x3840+0+0 +repage"
        else if "${mode}" is "landscape" then
          set outputFile to (POSIX path of outputFolder) & "${formattedId}_cropped.${fileExtension}"
          set resize_cmd to "-resize 3840x2160^ -gravity center -crop 3840x2160+0+0 +repage"
        end if

        if resize_cmd is not "" then
          set q_output_file to quoted form of outputFile
          set crop_cmd to "PATH=/usr/local/bin:/opt/homebrew/bin:$PATH magick " & q_temp_folder & " " & resize_cmd & " " & q_output_file
          do shell script crop_cmd
        end if
      else
        error "Image file not found for processing."
      end if
    `;

    console.log("Generated AppleScript:", appleScript);

    await runAppleScript(appleScript);
    await showHUD("Image processed and saved!");
  } catch (err) {
    console.error(err);
    await showHUD("Couldn't save the image...");
  }
};

const formatIdForFilename = (id: string) => {
  return id
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

const getFileExtension = (url: string) => {
  const parts = url.split(".");
  return parts.length > 1 ? parts.pop() : "jpg";
};

export default saveImage;
