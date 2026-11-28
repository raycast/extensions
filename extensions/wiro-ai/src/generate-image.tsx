import { ModelForm } from "./components/model-form";
import { GENERATE_IMAGE } from "./lib/catalog";

export default function GenerateImage() {
  return <ModelForm jobs={[GENERATE_IMAGE]} />;
}
