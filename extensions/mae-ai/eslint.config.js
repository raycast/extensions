const raycast = require("@raycast/eslint-config");

module.exports = [...raycast, { ignores: ["dist/**", "node_modules/**"] }];
