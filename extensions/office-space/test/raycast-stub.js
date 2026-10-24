// Stands in for @raycast/api when the library code runs under plain Node.
module.exports = {
  getPreferenceValues: () => ({
    hubPath: process.env.TEST_HUB ?? "",
    codeFolders: process.env.TEST_CODE ?? "",
    linearApiKey: "",
  }),
};
