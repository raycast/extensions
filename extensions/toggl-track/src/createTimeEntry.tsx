import CreateTimeEntryForm from "@/components/CreateTimeEntryForm";
import { ExtensionContextProvider } from "@/context/ExtensionContext";

export default function Command() {
  return (
    <ExtensionContextProvider>
      <CreateTimeEntryForm
        // Standalone "Quickstart New Timer" command: there's no mounted list view
        // to refresh, so the list-cache revalidators are no-ops, and we close the
        // window on submit (closeWindowOnSubmit) since the form is the root view.
        revalidateRunningTimeEntry={() => {}}
        revalidateTimeEntries={() => {}}
        closeWindowOnSubmit
      />
    </ExtensionContextProvider>
  );
}
