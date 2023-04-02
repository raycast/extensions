import { List, ActionPanel, showToast, Action, Toast, environment } from "@raycast/api";
import { execSync } from "child_process";
import { convertSVG, getSelectedImages } from "./utils";

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
  "SVG",
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
          execSync(`chmod +x ${environment.assetsPath}/webp/cwebp`);
          execSync(`${environment.assetsPath}/webp/cwebp "${item}" -o "${newPath}"`);
        } else if (pathComponents.at(-1)?.toLowerCase() == "svg") {
          convertSVG(desiredType, item, newPath);
        } else if (desiredType == "SVG") {
          const bmpPath = `${environment.supportPath}/tmp.bmp`;
          execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
          console.log("hi");
          if (pathComponents.at(-1)?.toLowerCase() == "webp") {
            const pngPath = `${environment.supportPath}/tmp.png`;
            execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);
            execSync(`${environment.assetsPath}/webp/dwebp "${item}" -o "${pngPath}"`);
            execSync(
              `sips --setProperty format "bmp" "${pngPath}" --out "${bmpPath}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpPath}"; rm "${bmpPath}"; open "${pngPath}"; rm "${pngPath}"`
            );
          } else {
            execSync(
              `sips --setProperty format "bmp" "${item}" --out "${bmpPath}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpPath}"; rm "${bmpPath}"`
            );
          }
        } else if (pathComponents.at(-1)?.toLowerCase() == "webp") {
          execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);
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
