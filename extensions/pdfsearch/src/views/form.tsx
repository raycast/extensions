import { useState } from "react";
import { Collection } from "../type";
import { Action, ActionPanel, Form, LocalStorage, showToast, useNavigation } from "@raycast/api";
import { lstatSync, readdirSync } from "fs";
import path from "path";
import { showFailureToast } from "@raycast/utils";

const supportedFiletypes = [".pdf"];

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

  const revalidateName = () => {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  };

  // checks that at least 1 file has been added that is of supported file type
  function revalidateFiles() {
    if (
      fileError &&
      fileError.length > 0 &&
      !files.some((f) => supportedFiletypes.some((filetype) => f.endsWith(filetype)))
    ) {
      setFileError(undefined);
    }
  }

  // returns all POSIX filepaths in directory with supportedFiletype
  const loadDir = (dirpath: string) => {
    const files = readdirSync(dirpath);
    files.flatMap((file) => {
      const fullPath = path.join(dirpath, file);
      if (lstatSync(fullPath).isDirectory()) {
        return loadDir(path.join(dirpath, file));
      } else if (supportedFiletypes.includes(path.extname(file))) {
        files.push(fullPath);
      }
    });
    return files;
  };

  const handleSubmit = async (values: Collection) => {
    if (values.files.length == 0) {
      setFileError("Select at least 1 file!");
    } else if (values.name.length == 0) {
      setNameError("Name shouldn't be empty!");
    } else if ((await LocalStorage.getItem(values.name)) && !props.collection) {
      setNameError("Collection name already exists!");
    } else {
      try {
        // load array of unique supported files from files and directories
        let files = values.files;
        files = files.flatMap((file) => {
          if (lstatSync(file).isDirectory()) {
            return loadDir(file);
          } else if (supportedFiletypes.includes(path.extname(file))) {
            return file;
          }
          return [];
        });
        files = [...new Set(files)]; // get unique filepaths from array
        if (!files) {
          setFileError("No supported filetypes found!");
          return;
        }
        values.files = files;

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
          revalidateName();
        }}
        onBlur={async (event) => {
          if (event.target.value?.length == 0) {
            setNameError("Name shouldn't be empty!");
          } else if (!props.collection && event.target.value && (await LocalStorage.getItem(event.target.value))) {
            setNameError("Name should be unique!");
          } else {
            revalidateName();
          }
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
          revalidateFiles();
        }}
        onBlur={async (event) => {
          if (event.target.value?.length == 0) {
            setFileError("Add at least 1 file!");
          } else if (!files.some((f) => supportedFiletypes.some((filetype) => f.endsWith(filetype)))) {
            setFileError("Unsupported file type detected!");
          } else {
            revalidateFiles();
          }
        }}
        value={files}
      />
    </Form>
  );
}
