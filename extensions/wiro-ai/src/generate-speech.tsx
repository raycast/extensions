import { ModelForm } from "./components/model-form";
import { GENERATE_SPEECH } from "./lib/catalog";
import { selectedText } from "./lib/selection";

export default function GenerateSpeech() {
  return <ModelForm jobs={[GENERATE_SPEECH]} loadInitialPrompt={selectedText} />;
}
