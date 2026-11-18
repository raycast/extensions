/** Used by Jest to transform ESM-only packages (@otplib, @scure). */
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { node: "current" },
        modules: "commonjs",
      },
    ],
  ],
};
