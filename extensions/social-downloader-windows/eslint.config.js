const raycast = require("@raycast/eslint-config");
module.exports = [
  ...raycast,
  { rules: { "@raycast/prefer-title-case": "off" } },
];
