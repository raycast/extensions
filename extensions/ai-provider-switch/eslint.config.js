const raycast = require("@raycast/eslint-config");

module.exports = raycast.flatMap((config) => (Array.isArray(config) ? config : [config]));
