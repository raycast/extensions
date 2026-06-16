// @raycast/eslint-config exports a flat-config array. A newer @raycast/eslint-plugin
// returns an array for `configs.recommended`, leaving a nested array that ESLint's
// flat-config loader rejects — flatten it to a single level.
module.exports = require("@raycast/eslint-config").flat(Infinity);
