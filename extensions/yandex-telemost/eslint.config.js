const raycast = require("@raycast/eslint-config");

module.exports = Array.isArray(raycast) ? raycast.flat() : [raycast];
