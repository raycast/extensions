const raycast = require("@raycast/eslint-config");
const globals = require("globals");
module.exports = [...raycast, { files: ["editor/**/*.ts"], languageOptions: { globals: globals.browser } }];
