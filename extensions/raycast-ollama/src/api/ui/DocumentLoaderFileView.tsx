import { ActionPanel, Action, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import React from "react";
import fs from "fs";
import mime from "mime-types";
import { DocumentLoaderFiles } from "../types";

interface SubmitFormData {
  embeddingFile: string[];
}

interface props {
  ShowDocumentLoaderFileView: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Return JSX element for chose file to embed on prompt.
 * @param {props} props
 * @returns {JSX.Element} Raycast Embedding File View
 */
export function DocumentLoaderFileView(props: props): JSX.Element {
  const [File, setFile]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = React.useState([] as string[]);

  const info = "Use tag `/file` on prompt for use the selected files.";
  const infoSupportedFiles = "Only PDF and Text based file are supported.";

  /**
   * Save Selected Files on LocalStorage. Before saving on LocalStorage it compare previews state on LocalStorage.
   * If files is present on previews state it preserve `mtime` value otherwise is leave it undefined.
   * @param {SubmitFormData} data - Data passed from Form.
   */
  async function SaveToLocalStorageAndQuit(data: SubmitFormData) {
    const SupportedMime = ["text/", "application/pdf"];

    let FilesLastLocalStorage: DocumentLoaderFiles[] | undefined;
    const FilesLastLocalStorageJSON: string | undefined = await LocalStorage.getItem("embedding_files");
    if (FilesLastLocalStorageJSON) {
      FilesLastLocalStorage = JSON.parse(FilesLastLocalStorageJSON) as DocumentLoaderFiles[];
    }

    let UnsupportedFile = false;
    let files = data.embeddingFile;
    files = files.filter((file: string) => {
      if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
        let filteredMime: string[] | undefined;

        const fileMime = mime.lookup(file);
        if (fileMime)
          filteredMime = SupportedMime.filter((mime) => {
            if (fileMime && fileMime.match(mime)) return true;
          });
        if (filteredMime && filteredMime?.length > 0) {
          return true;
        } else {
          UnsupportedFile = true;
          showToast({
            style: Toast.Style.Failure,
            title: `File ${file.split("/").pop()} not supported. Please remove it from selected files.`,
          });
        }
      } else {
        UnsupportedFile = true;
        showToast({
          style: Toast.Style.Failure,
          title: `${file.split("/").pop()} is not a file. Please remove it from selected files.`,
        });
      }
    });

    if (!UnsupportedFile) {
      const FilesNewLocalStorage = files.map((f) => {
        let mtime: Date | undefined;
        if (FilesLastLocalStorage) {
          const FileLastLocalStorage = FilesLastLocalStorage.filter((fl) => fl.path === f);
          if (FileLastLocalStorage.length > 0) {
            mtime = FileLastLocalStorage[0].mtime;
          }
        }

        return {
          path: f,
          mtime: mtime,
        } as DocumentLoaderFiles;
      });

      await LocalStorage.setItem("embedding_files", JSON.stringify(FilesNewLocalStorage));

      props.ShowDocumentLoaderFileView(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={SaveToLocalStorageAndQuit} />
          <Action.SubmitForm
            title="Close"
            onSubmit={() => {
              props.ShowDocumentLoaderFileView(false);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={info} />
      <Form.FilePicker
        id="embeddingFile"
        info={infoSupportedFiles}
        value={File}
        onChange={(newValue) => {
          setFile(newValue);
        }}
        storeValue={true}
      />
    </Form>
  );
}
