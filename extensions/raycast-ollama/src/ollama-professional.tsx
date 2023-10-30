import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "Act as a writer. Make the following text more professional while keeping the core idea.\n\nOutput only with the modified text.\n";
  return ResultView("professional", systemPrompt);
}
