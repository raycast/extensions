/**
 * Mock implementation of whatlang-node for Raycast compatibility
 * Returns fixed values since Easydict handles language detection internally
 */

function detectLang(text, iso6393 = false) {
  return iso6393 ? "eng" : "English";
}

function detectScript(text) {
  return "Latin";
}

module.exports = {
  detectLang,
  detectScript,
};
