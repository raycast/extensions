const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
  },
  ...raycastConfig.flat(),
];
