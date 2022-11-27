/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const css = require("css");
const path = require("path");

const file = fs.readFileSync(path.join(__dirname, "./output.css"), "utf8");

const json = {};

css.parse(file).stylesheet.rules.forEach((rule) => {
  if (!rule.selectors) {
    return;
  }
  const selector = rule.selectors[0].replace("\\", "").split(" ")[0];
  json[selector] = css
    .stringify({ stylesheet: { rules: [rule] } })
    .split("\n")
    .slice(1, -1)
    .map((line) => line.trim())
    .join(" ");
});

fs.writeFileSync(path.join(__dirname, "./output.json"), JSON.stringify(json));
