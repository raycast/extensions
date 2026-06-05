// @raycast/eslint-config exports a flat-config array with one nested array
// element; flatten it so ESLint's config-array accepts it.
module.exports = require("@raycast/eslint-config").flat();
