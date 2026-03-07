module.exports = [
  ...require("@raycast/eslint-config").flat(),
  {
    rules: {
      "@raycast/prefer-title-case": [
        "warn",
        { extraFixedCaseWords: ["A", "B"] },
      ],
    },
  },
];
