import fs from "fs/promises";

(async () => {
  const icons = await fs.readdir("./braid-icons");
  try {
    await fs.access("./assets/icons");
  } catch (e) {
    await fs.mkdir("./assets/icons");
  }

  for (const icon of icons) {
    const iconSvgLight = await fs.readFile(`./braid-icons/${icon}`, "utf-8");

    let iconSvgDark = iconSvgLight
      .replace(/<path (.*)(fill="#.{3,6}" ?)(.*)\/>/g, `<path $1$3/>`)
      .replace(/<(path|circle|rect) /g, `<$1 fill="#ffffff" `);
    if (icon.includes("message")) {
      iconSvgDark = iconSvgLight.replace(/stroke:.*;/g, `stroke: #ffffff;`);
    }

    await Promise.all([
      fs.writeFile(`./assets/icons/${icon.replace(".svg", "")}-light.svg`, iconSvgLight),
      fs.writeFile(`./assets/icons/${icon.replace(".svg", "")}-dark.svg`, iconSvgDark),
    ]);
  }
})();
