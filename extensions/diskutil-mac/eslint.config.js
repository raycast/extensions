const raycast = require("@raycast/eslint-config");

// @raycast/eslint-config 2.1.1 ships its recommended config without spreading
// the nested raycast-plugin array, which makes flat-config eslint reject the
// config. Flatten once here; harmless after they fix it upstream.
module.exports = [{ ignores: ["**/*.md", "build/**", "node_modules/**"] }, ...raycast.flat(Infinity)];
