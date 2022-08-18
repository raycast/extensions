const { readFileSync, readdirSync, writeFileSync, existsSync, rmSync, mkdirSync } = require("fs");
const { join } = require("path");

const files = readdirSync("node_modules/lucide-static/icons");

if (existsSync("assets/icons"))
  rmSync("assets/icons", {
    recursive: true,
  });

mkdirSync("assets/icons");

files.forEach((file) => {
  let content = readFileSync(join("node_modules/lucide-static/icons", file), "utf8");
  content = content.replace(/currentColor/g, "#F56565");

  writeFileSync(join("assets/icons", file), content);
});
