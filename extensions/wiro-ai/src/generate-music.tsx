import { ModelForm } from "./components/model-form";
import { GENERATE_MUSIC } from "./lib/catalog";

export default function GenerateMusic() {
  return <ModelForm jobs={[GENERATE_MUSIC]} />;
}
