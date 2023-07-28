import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const promptTemplateFormat = new Map<string, string>([
  ["raycast_orca:3b", "orca"],
  ["raycast_llama2:7b", "llama2"],
  ["raycast_llama2:13b", "llama2"],
]);
const initalPrompt = new Map<string, string>([
  [
    "orca",
    `### System:
Act as a writer. Fix the following text from spelling and grammar error.
    
Output only with the fixed text.

### User:
`,
  ],
  [
    "llama2",
    `<s>[INST] <<SYS>>
Act as a writer. Fix the following text from spelling and grammar error.
    
Output only with the fixed text.
<</SYS>>
    
`,
  ],
]);
const endPrompt = new Map<string, string>([
  ["orca", "\n\n### Response:\n"],
  ["llama2", " [/INST]"],
]);

export default function Command(): JSX.Element {
  return ResultView(
    preferences.ollamaFixSpellingGrammar,
    initalPrompt.get(promptTemplateFormat.get(preferences.ollamaFixSpellingGrammar) as string) as string,
    endPrompt.get(promptTemplateFormat.get(preferences.ollamaFixSpellingGrammar) as string) as string,
    true
  );
}
