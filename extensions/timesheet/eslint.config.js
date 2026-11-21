const raycastConfig = require("@raycast/eslint-config");

// @raycast/eslint-config 2.1.1 nests `raycast.configs.recommended` as an array
// inside the exported array, which ESLint 9 rejects. Flatten one level so all
// entries are plain config objects.
module.exports = raycastConfig.flat();
