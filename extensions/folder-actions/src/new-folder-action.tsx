import EditActionForm from "./edit-action-form";
import * as os from "os";

export default function Command() {
  return (
    <EditActionForm
      oldData={{
        dir: `${os.homedir()}/Downloads`,
        addActions: [],
        removeActions: [],
      }}
    />
  );
}
