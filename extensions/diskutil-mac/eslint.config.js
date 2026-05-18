const raycast = require("@raycast/eslint-config");

module.exports = [{ ignores: ["**/*.md", "build/**", "node_modules/**"] }, ...raycast.flat(Infinity)];
