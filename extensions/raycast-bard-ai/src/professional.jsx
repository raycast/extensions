// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Making text professional...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Professional() {
  return ResultView(
    "Use advanced vocabulary but do not overuse it. Make sure to use proper grammar and spell check thoroughly. Show expertise in the subject provided, but do not add any extra information. Do not significantly shorten the word count and try to keep it at the same length of words as the original.\n\n",
    toast_title,
    "text",
    "Make Professional"
  );
}
