import { List, ActionPanel, showToast, Action, Toast } from "@raycast/api";
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
];

const convert = async (desiredType: string) => {
  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    selectedImages.forEach((item) => {
      const pathComponents = item.split(".");
      const newPath = pathComponents.slice(0, -1).join("") + "." + desiredType.toLowerCase();
      execSync(`sips --setProperty format ${desiredType.toLowerCase()} "${item}" --out "${newPath}"`);
    });
    await showToast({ title: `Converted ${selectedImages.length.toString()} ${pluralized} to ${desiredType}` });
  } catch (error) {
    console.log(error);
    await showToast({
      title: `Failed to convert ${selectedImages.length.toString()} ${pluralized} to ${desiredType}`,
      style: Toast.Style.Failure,
    });
  }
};

export default function Command() {
  return (
    <List searchBarPlaceholder="Search image transformations...">
      {FORMATS.map((format) => {
        return (
          <List.Item
            title={format}
            key={format}
            actions={
              <ActionPanel>
                <Action
                  title={`Convert to ${format}`}
                  onAction={() => {
                    convert(format);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
