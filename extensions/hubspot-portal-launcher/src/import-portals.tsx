import { Form, ActionPanel, Action, LocalStorage, showHUD, closeMainWindow, popToRoot } from "@raycast/api";
import fs from "fs";
import { nanoid } from "nanoid";
import { useState, useEffect, useCallback } from "react";
import { Portal } from "./types";

type State = {
  portals: Portal[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    portals: [],
  });
  const [fileError, setFileError] = useState<string | undefined>();

  // Load LocalStorage
  useEffect(() => {
    (async () => {
      const storedPortals = await LocalStorage.getItem<string>("portals");

      if (!storedPortals) {
        setState((previous) => ({ ...previous }));
        return;
      }

      try {
        const portals: Portal[] = JSON.parse(storedPortals);
        setState((previous) => ({ ...previous, portals }));
      } catch (e) {
        // can't decode portals
        setState((previous) => ({ ...previous, portals: [] }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("portals", JSON.stringify(state.portals));
  }, [state.portals]);

  const dropFileErrorIfNeeded = () => {
    if (fileError && fileError.length > 0) {
      setFileError(undefined);
    }
  };

  const handleSubmit = useCallback((values: { importFile: string[] }) => {
    const [importFile] = values.importFile;
    if (typeof importFile === "undefined" || importFile.length === 0) {
      setFileError("The field should't be empty!");
      return;
    } else if (!importFile?.endsWith(".json")) {
      setFileError("The selected file is not a JSON file!");
      return;
    } else if (!fs.existsSync(importFile) && !fs.lstatSync(importFile).isFile()) {
      setFileError(`Invalid file path: ${importFile}`);
      return;
    } else {
      const importPortals = JSON.parse(fs.readFileSync(importFile, "utf8"));
      dropFileErrorIfNeeded();
      handleImport(importPortals);
    }
  }, []);

  const handleImport = useCallback(
    async (importedPortals: Portal[]) => {
      const newPortals = [
        ...state.portals,
        ...importedPortals.map((portal) => ({
          id: nanoid(),
          portalName: portal.portalName,
          portalId: portal.portalId,
          portalType: portal.portalType,
        })),
      ];
      setState((previous) => ({ ...previous, portals: newPortals }));
      await showHUD("Portals imported successfully!");
      await popToRoot();
      await closeMainWindow({ clearRootSearch: true });
    },
    [state.portals, setState]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Finish Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a file to import. Make sure it is a valid JSON file according to the documentation in the Raycast Store or on GitHub." />
      <Form.FilePicker
        title="Import File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        id="importFile"
        error={fileError}
        onChange={dropFileErrorIfNeeded}
      />
    </Form>
  );
}
