import { ModelForm } from "./components/model-form";
import { EDIT_OPERATIONS } from "./lib/catalog";
import { selectedFiles } from "./lib/selection";

export default function EditImage() {
  return (
    <ModelForm
      jobs={EDIT_OPERATIONS.map((operation) => operation.job)}
      jobLabel="Operation"
      loadInitialFiles={() => selectedFiles("image")}
    />
  );
}
