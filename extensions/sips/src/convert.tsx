import { List, ActionPanel, showToast, Action, Toast, environment } from "@raycast/api";
import { execSync } from "child_process";
import { getSelectedImages } from "./utils";

const FORMATS = [
  "ASTC",
  "BMP",
  "DDS",
  "EXR",
  "GIF",
  "HEIC",
  "HEICS",
  "ICNS",
  "ICO",
  "JPEG",
  "JP2",
  "KTX",
  "PBM",
  "PDF",
  "PNG",
  "PSD",
  "PVR",
  "TGA",
  "TIFF",
  "WEBP",
];

export default function Command() {
  const convert = async (desiredType: string) => {
    const selectedImages = await getSelectedImages();

    if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
      await showToast({ title: "No images selected", style: Toast.Style.Failure });
      return;
    }

    const toast = await showToast({ title: "Conversion in progress...", style: Toast.Style.Animated });

    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      selectedImages.forEach((item) => {
        const pathComponents = item.split(".");
        const newPath = pathComponents.slice(0, -1).join("") + "." + desiredType.toLowerCase();

        if (desiredType === "WEBP") {
          execSync(`${environment.assetsPath}/webp/cwebp "${item}" -o "${newPath}"`);
        } else if (pathComponents.at(-1)?.toLowerCase() == "webp") {
          execSync(`${environment.assetsPath}/webp/dwebp "${item}" -o "${newPath}"`);
        } else {
          execSync(`sips --setProperty format ${desiredType.toLowerCase()} "${item}" --out "${newPath}"`);
        }
      });
      toast.title = `Converted ${selectedImages.length.toString()} ${pluralized} to ${desiredType}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      console.log(error);
      toast.title = `Failed to convert ${selectedImages.length.toString()} ${pluralized} to ${desiredType}`;
      toast.style = Toast.Style.Failure;
    }
  };

  return (
    <List searchBarPlaceholder="Search image transformations...">
      {FORMATS.map((format) => {
        return (
          <List.Item
            title={format}
            key={format}
            actions={
              <ActionPanel>
                <Action title={`Convert to ${format}`} onAction={async () => await convert(format)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
