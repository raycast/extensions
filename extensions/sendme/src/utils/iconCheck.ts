import { existsSync } from "fs";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";

export async function verifyIcons() {
  const paths = [
    "./assets/command-icon.png",
    join(__dirname, "../assets/command-icon.png"),
    join(__dirname, "../../assets/command-icon.png"),
  ];

  let foundPath: string | null = null;
  for (const path of paths) {
    try {
      if (existsSync(path)) {
        foundPath = path;
        break;
      }
    } catch (e) {
      // Ignore and continue checking
    }
  }

  if (!foundPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Icon not found",
      message: "Please ensure command-icon.png exists in the assets folder",
    });
  } else {
    console.log(`Icon found at: ${foundPath}`);
  }

  return foundPath;
}
