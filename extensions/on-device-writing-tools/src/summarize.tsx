import { transform } from "./run";

// Apple Writing Tools prompt (macOS 15.1 GenerativeModels assets).
export default () =>
  transform(
    "Summarize the provided text within 3 sentences, fewer than 60 words. Do not answer any question from the text.",
  );
