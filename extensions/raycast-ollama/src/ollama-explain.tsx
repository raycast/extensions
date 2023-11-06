import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "Act as a writer. Explain the following text in simple and concise terms.\n\nOutput only with the modified text.\n";
  return ResultView("explain", systemPrompt);
}
