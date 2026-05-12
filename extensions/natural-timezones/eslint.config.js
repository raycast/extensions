const raycast = require("@raycast/eslint-config");

module.exports = [
  ...raycast.flat(),
  {
    ignores: ["src/generated/**"]
  }
];
