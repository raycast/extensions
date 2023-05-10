const _ = require("lodash");
const { Clipboard, showHUD } = require("@raycast/api");

function generateFakeBIC() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return _.times(8, () => {
    return letters[_.random(0, letters.length - 1)];
  }).join("");
}

function generateFakeAccountNumber() {
  const MAX_ACCOUNT_NUMBER = 999999999999999;
  return _.padStart(_.random(0, MAX_ACCOUNT_NUMBER).toString(), 15, "0");
}

async function copyToClipboard(value) {
  await Clipboard.copy(value)
    .then(async () => {
      await showHUD("✅ Copied");
    })
    .catch(async () => {
      await showHUD("❌ Couldn't copy");
    });
}

module.exports = { generateFakeBIC, generateFakeAccountNumber, copyToClipboard };
