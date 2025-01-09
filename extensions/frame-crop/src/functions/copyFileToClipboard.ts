import { showToast, Toast, environment } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface CopyFileToClipboardProps {
  url: string;
  id: string;
}

// Function to format the ID for a valid filename
const formatIdForFilename = (id: string) => {
  return id
    .replace(/[<>:"/\\|?*]+/g, "-") // Replace invalid characters with a dash
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/\.\.+/g, ".") // Replace multiple dots with a single dot
    .replace(/^-+|-+$/g, "") // Trim dashes from the start and end
    .replace(/\.+$/, "") // Remove trailing dots
    .toLowerCase(); // Convert to lowercase
};

export const copyFileToClipboard = async ({ url, id }: CopyFileToClipboardProps) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and copying image...");

  const selectedPath = environment.supportPath;
  const fileExtension = url
    .split(/\/+|\.+/)
    .pop()
    ?.split("?")[0];
  const validExtensions = ["jpg", "jpeg", "png"];
  const finalExtension = validExtensions.includes(fileExtension || "") ? fileExtension : "jpg";

  if (!finalExtension || !validExtensions.includes(finalExtension)) {
    throw new Error("Unsupported file type. Please use jpg, jpeg, or png.");
  }

  // Format the ID for the filename
  const formattedId = formatIdForFilename(id);
  const fixedPathName = selectedPath.endsWith("/")
    ? `${selectedPath}${formattedId}.${finalExtension}`
    : `${selectedPath}/${formattedId}.${finalExtension}`;

  try {
    const actualPath = fixedPathName;

    await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      -- Execute the curl command to download the image
      do shell script "curl -o " & q_temp_folder & " " & "${url.replace(/"/g, '\\"')}"

      -- Check if the file exists after download
      if (do shell script "test -e " & q_temp_folder & " && echo true || echo false") is "true" then
          set x to (POSIX file temp_folder)
          set the clipboard to (read x as JPEG picture)
      else
          error "File not found: " & temp_folder
      end if
    `);

    toast.style = Toast.Style.Success;
    toast.title = "Image copied to the clipboard!";
  } catch (err) {
    console.error(err);

    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong.";
    toast.message = "Try with another image or check your internet connection.";
  }
};

export default copyFileToClipboard;
