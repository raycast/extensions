import ResultView from "./common";

const prompt = "You are a helpful assistant.";
const toast_title = "Thinking...";

export default function Preview() {
  return ResultView(prompt, toast_title);
}
