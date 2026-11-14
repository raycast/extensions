const os = require("os");
const path = require("path");
exports.environment = { supportPath: path.join(os.tmpdir(), "cc-usage-verify") };
exports.getPreferenceValues = () => ({});
