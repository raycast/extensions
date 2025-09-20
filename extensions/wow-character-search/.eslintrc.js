module.exports = {
  root: true,
  plugins: ["prettier"], // This line was added to explicitly load the plugin
  extends: ["@raycast/eslint-config", "plugin:react-hooks/recommended"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};

