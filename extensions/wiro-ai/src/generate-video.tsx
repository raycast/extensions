import { ModelForm } from "./components/model-form";
import { GENERATE_VIDEO_FROM_IMAGE, GENERATE_VIDEO_FROM_TEXT } from "./lib/catalog";
import { selectedFiles } from "./lib/selection";

export default function GenerateVideo() {
  return (
    <ModelForm
      jobs={[GENERATE_VIDEO_FROM_TEXT, GENERATE_VIDEO_FROM_IMAGE]}
      jobLabel="Source"
      loadInitialFiles={() => selectedFiles("image")}
    />
  );
}
