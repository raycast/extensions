import fs from "fs/promises";
import { load } from "cheerio";

(async () => {
  const icons = await fs.readdir("./braid-icons");
  try {
    await fs.access("./assets/icons");
  } catch {
    await fs.mkdir("./assets/icons");
  }

  // Todo - Fix icon message filled

  for (const icon of icons) {
    const iconContent = await fs.readFile(`./braid-icons/${icon}`, "utf-8");

    const $ = load(iconContent);
    $("svg *").each((i, el) => {
      const $el = $(el);

      // Update existing color attributes for dark mode
      ["stroke", "fill"].forEach((attr) => {
        const color = $el.attr(attr);
        const replaceColors = ["#000"];
        if (color && replaceColors.includes(color)) {
          $el.attr(attr, "#ffffff");
        }
      });

      // Add fill attributes
      if (["path", "rect", "circle"].includes(el.tagName)) {
        $el.attr("fill", "#ffffff");
      }
    });

    const iconSvgLight = load(iconContent).html();
    const iconSvgDark = $.html();

    await Promise.all([
      fs.writeFile(`./assets/icons/${icon.replace(".svg", "")}-light.svg`, iconSvgLight),
      fs.writeFile(`./assets/icons/${icon.replace(".svg", "")}-dark.svg`, iconSvgDark),
    ]);
  }
})();
