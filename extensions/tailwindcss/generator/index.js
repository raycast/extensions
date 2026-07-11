/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const css = require("css");
const path = require("path");

const file = fs.readFileSync(path.join(__dirname, "./output.css"), "utf8");

const json = css
  .parse(file)
  .stylesheet.rules.filter((rule) => !!rule.selectors)
  .map((rule) => {
    if (!rule.selectors) {
      return;
    }
    const selector = rule.selectors[0].replace("\\", "").split(" ")[0];
    const classes = css
      .stringify({ stylesheet: { rules: [rule] } })
      .split("\n")
      .slice(1, -1)
      .map((line) => line.trim())
      .join(" ");

    return {
      selector,
      classes,
    };
  });

fs.writeFileSync(path.join(__dirname, "../src/classes.json"), JSON.stringify(json));
