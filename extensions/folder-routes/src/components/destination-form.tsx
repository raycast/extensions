import { randomUUID } from "node:crypto";

import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { type Destination, findDuplicateFields, validateDestinationDraft } from "../domain/destination";
import { saveDestinationLibrary } from "../services/destination-library";
import { isDirectory } from "../services/filesystem";

export interface DestinationFormProps {
  destination?: Destination;
  existing: readonly Destination[];
  destinationsCsvFile?: string;
  onSaved: (destinations: Destination[]) => void;
}

export function DestinationForm({ destination, existing, destinationsCsvFile, onSaved }: DestinationFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(destination?.name ?? "");
  const [paths, setPaths] = useState<string[]>(destination ? [destination.path] : []);
  const [keywords, setKeywords] = useState(destination?.keywords.join("; ") ?? "");
  const [copy, setCopy] = useState(destination?.copy ?? true);
  const [move, setMove] = useState(destination?.move ?? true);
  const [pinned, setPinned] = useState(destination?.pinned ?? false);
  const [nameError, setNameError] = useState<string>();
  const [pathError, setPathError] = useState<string>();

  async function submit() {
    const validation = validateDestinationDraft({
      id: destination?.id,
      name,
      path: paths[0] ?? "",
      keywords: keywords.split(";"),
      copy,
      move,
      pinned,
    });

    setNameError(validation.errors.find((error) => error.startsWith("Name")));
    setPathError(validation.errors.find((error) => error.startsWith("Path")));
    if (!validation.value) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination is invalid",
        message: validation.errors.join(" "),
      });
      return;
    }
    if (!(await isDirectory(validation.value.path))) {
      setPathError("Folder does not exist or is not a directory.");
      await showToast({ style: Toast.Style.Failure, title: "Destination folder does not exist" });
      return;
    }

    const candidate: Destination = {
      ...validation.value,
      id: destination?.id ?? randomUUID(),
    };
    const duplicates = findDuplicateFields(candidate, existing, destination?.id).filter((field) => field !== "id");
    if (duplicates.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination already exists",
        message: `Duplicate ${duplicates.join(" and ")}.`,
      });
      return;
    }

    try {
      const destinations = existing.some((current) => current.id === candidate.id)
        ? existing.map((current) => (current.id === candidate.id ? candidate : current))
        : [...existing, candidate];
      await saveDestinationLibrary(destinations, destinationsCsvFile);
      onSaved(destinations);
      await showToast({
        style: Toast.Style.Success,
        title: destination ? "Destination updated" : "Destination added",
        message: candidate.name,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save destination",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={destination ? "Edit Destination" : "Add Destination"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={destination ? "Save Destination" : "Add Destination"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Invoices"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
      />
      <Form.FilePicker
        id="path"
        title="Folder"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
        value={paths}
        error={pathError}
        onChange={(value) => {
          setPaths(value);
          setPathError(undefined);
        }}
      />
      <Form.TextField
        id="keywords"
        title="Aliases"
        placeholder="invoice; billing"
        info="Separate search keywords with semicolons."
        value={keywords}
        onChange={setKeywords}
      />
      <Form.Separator />
      <Form.Checkbox id="copy" title="Operations" label="Show for Copy" value={copy} onChange={setCopy} />
      <Form.Checkbox id="move" title="" label="Show for Move" value={move} onChange={setMove} />
      <Form.Checkbox id="pinned" title="Favorite" label="Pin Destination" value={pinned} onChange={setPinned} />
    </Form>
  );
}
