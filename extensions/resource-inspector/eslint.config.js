const raycast = require("@raycast/eslint-config");
module.exports = [...raycast, { ignores: ["dist/**", "raycast-env.d.ts"] }];
