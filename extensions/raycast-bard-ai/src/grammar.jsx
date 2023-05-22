import ResultView from "./api/common";

const toast_title = "Fixing Grammar...";

export default function Grammar() {
  return ResultView(
    "Try to keep all of the words from the given text and try to only add punctuation and correct any spelling errors.",
    toast_title,
    "text",
    "Fix Grammar"
  );
}
