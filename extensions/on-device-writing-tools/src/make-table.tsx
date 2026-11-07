import { transform } from "./run";

// Apple's "Transform the given text into a table." loops until the 4096-token limit.
export default () => transform("Reformat the text as a Markdown table.");
