const { readFileSync, readdirSync, writeFileSync, existsSync, rmSync, mkdirSync } = require("fs");
const { join } = require("path");

const files = readdirSync("node_modules/lucide-static/icons");

if (existsSync("assets/icons"))
  rmSync("assets/icons", {
    recursive: true,
  });

mkdirSync("assets/icons");

files.forEach((file) => {
  if (file.endsWith(".svg") || file.endsWith(".json")) {
    let content = readFileSync(join("node_modules/lucide-static/icons", file), "utf8");

    //If it's an SVG, replace 'currentColor'
    if (file.endsWith(".svg")) {
      content = content.replace(/currentColor/g, "#F56565");
    }

    writeFileSync(join("assets/icons", file), content);
  }
});
