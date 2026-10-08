const raycastConfig = require("@raycast/eslint-config");

// @raycast/eslint-config nests a config array among its top-level entries;
// the spread only flattens one level, so flatten fully before ESLint's
// config-array normalizer rejects the leftover nested array.
module.exports = raycastConfig.flat(Infinity);
