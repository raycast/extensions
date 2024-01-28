import { icons } from "@phosphor-icons/core";
import { LocalStorage, Toast, environment, showToast } from "@raycast/api";
import * as https from "https";
import * as fs from "fs";
import path from "path";

/**
 * The variants of the icons, corresponding to the folders in the Phosphor Icons repository.
 */
const variants = ["bold", "duotone", "fill", "light", "regular", "thin"];

/**
 * Downloads all icons from the Phosphor Icons repository.
 * @returns {Promise<void>}
 */
export async function setup(): Promise<void> {
  const installedStatus = await LocalStorage.getItem("installed");
  if (installedStatus && fs.existsSync(path.join(environment.supportPath, variants[0]))) {
    return;
  }

  const toast = await showToast({
    title: "Downloading Phosphor Icons",
    message: "This may take a few minutes.",
    style: Toast.Style.Animated,
  });

  for (const variant of variants) {
    await fs.promises.mkdir(path.join(environment.supportPath, variant), { recursive: true });
  }

  let countDone = 0;
  await Promise.all(
    icons.map(async (icon) => {
      for (const variant of variants) {
        const svgURLBase = `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/${variant}/${icon.name}`;
        const svgURL = variant === "regular" ? `${svgURLBase}.svg` : `${svgURLBase}-${variant}.svg`;
        const svgFileName = variant === "regular" ? `${icon.name}.svg` : `${icon.name}-${variant}.svg`;

        let waiting = true;
        https.get(svgURL, (res) => {
          res.pipe(fs.createWriteStream(path.join(environment.supportPath, variant, svgFileName)));
          waiting = false;
        });

        while (waiting) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      countDone++;
      const percent = Math.round((countDone / icons.length) * 100);
      toast.message = `${percent}%...`;
    }),
  );

  toast.title = "Done!";
  toast.message = undefined;
  toast.style = Toast.Style.Success;

  await LocalStorage.setItem("installed", true);
}
