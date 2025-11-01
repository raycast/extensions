import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { Preferences } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const c = CommandAnswer.CODE_EXPLAIN;
  const p = `Act as a software engineer with deep understanding of any programming language and it's documentation. Explain how the code works step by step in a list. Be concise with a casual tone of voice and write it as documentation for others.

Code: {selection}

Explanation:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Medium}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
