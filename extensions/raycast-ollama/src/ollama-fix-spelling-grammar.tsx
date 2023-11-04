import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "Act as a writer. Fix the following text from spelling and grammar error.\n\nOutput only with the fixed text.\n";
  return ResultView("fix", systemPrompt);
}
