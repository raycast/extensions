// @raycast/eslint-config ships a flat-config array. Newer @raycast/eslint-plugin
// versions nest an array inside it, which ESLint 9 rejects — flatten to be safe.
module.exports = require("@raycast/eslint-config").flat(Infinity);
