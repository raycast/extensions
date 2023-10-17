import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt = "Act as a translator. Translate the following text.\n\nOutput only with the translated text.\n";
  return ResultView("translate", systemPrompt);
}
