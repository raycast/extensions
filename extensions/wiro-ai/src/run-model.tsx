import { ModelForm } from "./components/model-form";
import { anyModelJob } from "./lib/catalog";

export default function RunModel() {
  return <ModelForm jobs={[anyModelJob()]} />;
}
