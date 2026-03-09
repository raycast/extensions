import { CreateSetFromSourceForm } from "./create-set-from-source-form";
import { loadClipboardSource } from "./clipboard-source";

export default function Command() {
  return (
    <CreateSetFromSourceForm
      navigationTitle="New Set from Clipboard"
      loadSource={loadClipboardSource}
    />
  );
}
