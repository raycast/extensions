const raycast = require("@raycast/eslint-config");

module.exports = [
  {
    ignores: ["raycast-env.d.ts"],
  },
  ...raycast.flat(),
];
