const raycast = require("@raycast/eslint-config");

module.exports = [{ ignores: ["dist/**", "harness/.build/**"] }, ...raycast];
