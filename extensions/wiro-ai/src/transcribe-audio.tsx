import { ModelForm } from "./components/model-form";
import { TRANSCRIBE_AUDIO } from "./lib/catalog";
import { selectedFiles } from "./lib/selection";

export default function TranscribeAudio() {
  return <ModelForm jobs={[TRANSCRIBE_AUDIO]} loadInitialFiles={() => selectedFiles("audio")} />;
}
