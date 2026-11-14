const raycast = require("@raycast/eslint-config");
module.exports = [...raycast, { ignores: [".build/**", "swift/**", ".raycast-swift-build/**", "node_modules/**"] }];
