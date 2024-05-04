import { useEffect, useState } from "react";
import { Collection } from "../type";
import { Action, ActionPanel, Form, LocalStorage, showToast, useNavigation } from "@raycast/api";
import { lstatSync } from "fs";
import path from "path";
import { showFailureToast } from "@raycast/utils";
import { getValidFiles, supportedFiletypes } from "../util";

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
      setNameError("Name shouldn't be empty!");
    } else if (!props.collection && (await LocalStorage.getItem(name))) {
      // if we are not editing an existing collection and it exists, it means
      // collection name is not unique
      setNameError("Name should be unique!");
    } else if (nameError) {
      // if both checks pass and there was previosly an existing error, we reset the error
      setNameError(undefined);
    }
  };

  function revalidateFiles() {
    if (files.length === 0) {
      setFileError("Add at least 1 file!");
    } else if (
      !files.every((file) => lstatSync(file).isDirectory() || supportedFiletypes.includes(path.extname(file)))
    ) {
      // check if there are any individually added files that are not supported
      setFileError("Unsupported file type detected!");
    } else if (fileError) {
      setFileError(undefined);
    }
  }

  useEffect(() => {
    revalidateName();
  }, [name]);

  useEffect(() => {
    revalidateFiles();
  }, [files]);

  const handleSubmit = async (values: Collection) => {
    if (!fileError && !nameError) {
      try {
        const validFiles = getValidFiles(values.files);
        if (validFiles.length === 0) {
          setFileError("No supported files found!");
          return;
        }

        // if editing a collection and name changes, we delete the old collection
        if (props.collection && props.collection.name !== values.name) {
          await LocalStorage.removeItem(props.collection.name);
        }
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
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Collection Name"
        placeholder="Collection Name (Must be unique)"
        error={nameError}
        onChange={(e) => {
          setName(e);
        }}
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
