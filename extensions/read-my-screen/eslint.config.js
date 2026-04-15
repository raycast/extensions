const base = require("@raycast/eslint-config");

/** Flatten nested config arrays (e.g. @raycast/eslint-plugin recommended bundle). */
module.exports = base.flatMap((item) => (Array.isArray(item) ? item : [item]));
