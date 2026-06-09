const raycastConfig = require("@raycast/eslint-config");

// @raycast/eslint-config@2.1.1 ships one nested array entry that ESLint's flat
// config can't handle directly. Flatten one level so every item is a config
// object.
module.exports = raycastConfig.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
