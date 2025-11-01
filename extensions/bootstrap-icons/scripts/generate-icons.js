const fs = require("fs");
const path = require("path");

const iconsPath = path.join(__dirname, "../node_modules/bootstrap-icons/icons");
const outputPath = path.join(__dirname, "../src/icons-data.json");

const iconFiles = fs.readdirSync(iconsPath).filter((file) => file.endsWith(".svg"));

const iconsData = iconFiles.map((file) => {
  const name = file.replace(".svg", "");
  const svgContent = fs.readFileSync(path.join(iconsPath, file), "utf-8");
  return { name, svgContent };
});

fs.writeFileSync(outputPath, JSON.stringify(iconsData, null, 2));

console.log(`Generated ${iconsData.length} icons to ${outputPath}`);
