import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  Form,
  LaunchType,
  useNavigation,
  showToast,
  Alert,
  Icon,
  Color,
  confirmAlert,
  environment,
} from "@raycast/api";
import { useState } from "react";
import Search from "./search";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Collection } from "./type";
import fs, { lstatSync, readdirSync } from "fs";
import path from "path";
import { execa } from "execa";
import { chmod } from "fs/promises";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = usePromise(async () => {
    const indexes = await LocalStorage.allItems();
    const parsedIndexes: { [key: string]: Collection } = {};
    Object.keys(indexes).forEach((key) => (parsedIndexes[key] = JSON.parse(indexes[key])));
    return parsedIndexes;
  });

  const handleDelete = async (name: string) => {
    await confirmAlert({
      title: `Delete Collection ${name}`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      message: "Are you sure you want to delete this collection?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Collection",
        onAction: () => {
          // delete sqlite database file
          const databasePath = path.join(environment.supportPath, `${name}.sqlite`);
          fs.unlinkSync(databasePath);

          // remove record of collection
          LocalStorage.removeItem(name);
          revalidate();
          showToast({ title: "Success", message: `Successfully deleted collection ${name}!` });
        },
      },
    });
  };

  return (
    <List
      key="collections"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search collections..."
      throttle
      actions={
        <ActionPanel>
          <Action.Push title="Create New Collection" target={<CreateCollectionForm revalidate={revalidate} />} />
        </ActionPanel>
      }
    >
      {data
        ? Object.keys(data)
            .filter((collection) => collection.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()))
            .map((key) => (
              <List.Item
                key={data[key].name}
                title={data[key].name}
                subtitle={data[key].description}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Search"
                      target={
                        <Search arguments={{ collection: data[key].name }} launchType={LaunchType.UserInitiated} />
                      }
                    />
                    <Action.Push
                      title="Edit Collection"
                      target={<CreateCollectionForm collection={data[key]} revalidate={revalidate} />}
                    />
                    <Action.Push
                      title="Create New Collection"
                      target={<CreateCollectionForm revalidate={revalidate} />}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action
                      title="Delete Collection"
                      onAction={() => handleDelete(data[key].name)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            ))
        : null}
    </List>
  );
}

const supportedFiletypes = [".pdf"];

function CreateCollectionForm(props: {
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
          if (fs.lstatSync(file).isDirectory()) {
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
          // delete sqlite database file
          const databasePath = path.join(environment.supportPath, `${props.collection.name}.sqlite`);
          console.log(databasePath);
          fs.unlinkSync(databasePath);
        }

        await LocalStorage.setItem(values.name, JSON.stringify(values));
        // execute swift binary that will build the index for the collection of files
        const command = path.join(environment.assetsPath, "IndexDocument");
        const databasePath = path.join(environment.supportPath, `${values.name}.sqlite`);
        await chmod(command, "755");
        execa(command, [databasePath, ...files]);

        showToast({ title: "Success", message: "Indexing files! This will take a while..." });
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
