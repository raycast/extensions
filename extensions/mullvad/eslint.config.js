// Use Raycast's shared ESLint flat config
const cfg = require("@raycast/eslint-config");

function deepFlatten(input) {
	if (!Array.isArray(input)) return input;
	const out = [];
	for (const item of input) {
		if (Array.isArray(item)) {
			out.push(...deepFlatten(item));
		} else {
			out.push(item);
		}
	}
	return out;
}

module.exports = deepFlatten(cfg);
