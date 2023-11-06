import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "Act as a developer. Explain the following code block step by step.\n\nOutput only with the commented code.\n";
  return ResultView("codeexplain", systemPrompt);
}
