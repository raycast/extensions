module.exports = [
  { ignores: ["src/vendor/**"] },
  ...require("@raycast/eslint-config").flat(Infinity),
];
