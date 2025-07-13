import { Action, ActionPanel, environment, Form, LocalStorage, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { lstatSync } from "fs";
import path from "path";
import { useState } from "react";
import { createOrUpdateCollection, deleteCollection } from "swift:../../swift";
import { Collection, UpsertCollectionResponse } from "../type";
import { getValidFiles, supportedFiletypes } from "../utils";

export function CreateCollectionForm(props: {
  collection?: Collection; // if this is defined it means we are editing an existing collection
  revalidate: () => Promise<{ [key: string]: Collection }>;
}) {
  const [name, setName] = useState(props.collection?.name ?? "");
  const [description, setDescription] = useState(props.collection?.description ?? "");
  const [files, setFiles] = useState(props.collection?.files ?? []);

  const [nameError, setNameError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const navigation = useNavigation();

  const revalidateName = async () => {
    if (name.length === 0) {
      setNameError("Required");
      return false;
    } else if (!props.collection && (await LocalStorage.getItem(name))) {
      setNameError("Name should be unique");
      return false;
    } else {
      setNameError(undefined);
      return true;
    }
  };

  const handleNameBlur = async () => {
    await revalidateName();
  };

  const revalidateFiles = () => {
    if (files.length === 0) {
      setFileError("Add at least 1 file");
      return false;
    } else if (!files.every((file) => lstatSync(file).isDirectory() || supportedFiletypes.has(path.extname(file)))) {
      setFileError("Unsupported file type detected");
      return false;
    } else {
      setFileError(undefined);
      return true;
    }
  };

  const handleSubmit = async (values: Collection) => {
    const isNameValid = await revalidateName();
    const areFilesValid = revalidateFiles();

    if (isNameValid && areFilesValid) {
      try {
        const validFiles = getValidFiles(values.files);
        if (validFiles.length === 0) {
          setFileError("No supported files found");
          return;
        }

        if (props.collection && props.collection.name !== values.name) {
          await LocalStorage.removeItem(props.collection.name);
          await deleteCollection(props.collection.name, environment.supportPath);
        }

        const response: UpsertCollectionResponse = await createOrUpdateCollection(
          values.name,
          environment.supportPath,
          validFiles,
        );
        values.indexedFiles = response.indexedFiles;
        await LocalStorage.setItem(values.name, JSON.stringify(values));
        showToast({ title: "Success", message: "Collection saved!" });
      } catch (err) {
        showFailureToast(err);
      }
      props.revalidate();
      navigation.pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Collection" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        error={nameError}
        onChange={(e) => {
          setName(e);
        }}
        onBlur={handleNameBlur}
        value={name}
      />
      <Form.TextArea id="description" title="Description" onChange={setDescription} value={description} />
      <Form.FilePicker
        id="files"
        title="Files"
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories
        error={fileError}
        onChange={(e) => {
          setFiles(e);
        }}
        value={files}
      />
    </Form>
  );
}
