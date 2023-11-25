import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "Act as a writer. Improve the writing of the following text while keeping the core idea.\n\nOutput only with the modified text.\n";
  return ResultView("improve", systemPrompt);
}
