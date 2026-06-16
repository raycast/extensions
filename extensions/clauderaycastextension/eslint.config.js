// @raycast/eslint-config ships one nested array element, which ESLint 9's flat
// config rejects ("Unexpected array"). Flatten one level to normalize it.
module.exports = require("@raycast/eslint-config").flat();
