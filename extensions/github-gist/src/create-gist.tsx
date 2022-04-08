import { Form, ActionPanel, Action, Icon, showToast, Toast, Clipboard, open, showHUD } from "@raycast/api";
import React from "react";
import { useEffect, useState } from "react";
import {
  checkGistFileContent,
  checkGistFileName,
  createGist,
  Gist,
  GistFile,
  octokit,
  updateGist,
} from "./util/gist-utils";
import { fetchItemInput, ItemSource } from "./util/input";

export default function CreateGist(props: {
  gist: Gist | undefined;
  refreshUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>] | undefined;
}) {
  const gist =
    typeof props.gist == "undefined"
      ? {
          gist_id: "",
          description: "",
          html_url: "",
          file: [],
        }
      : props.gist;
  const [refresh, setRefresh] =
    typeof props.refreshUseState == "undefined" ? useState<number[]>([0]) : props.refreshUseState;

  const isEdit = typeof props.gist != "undefined";
  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [gistFiles, setGistFiles] = useState<GistFile[]>([]);
  const [oldGistFiles, setOldGistFiles] = useState<GistFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function _fetchItemInput() {
      if (isEdit) {
        const _gistFiles: GistFile[] = [];
        for (const value of gist.file) {
          const { data } = await octokit.request(`GET ${value.raw_url}`);
          _gistFiles.push({
            filename: value.filename,
            content: data as string,
          });
        }
        setDescription(gist.description);
        setGistFiles(_gistFiles);
        setOldGistFiles(_gistFiles);
      } else {
        const inputItem = await fetchItemInput();
        if (inputItem.source === ItemSource.NULL) {
          await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
        } else {
          setGistFiles([...gistFiles, { filename: "", content: inputItem.content }]);
        }
      }
      setIsLoading(false);
    }

    _fetchItemInput().then();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Gist" : "Create Gist"}
      actions={
        <ActionPanel>
          <Action
            title={isEdit ? "Update Gist" : "Create Gist"}
            icon={Icon.Upload}
            onAction={async () => {
              try {
                await showToast(Toast.Style.Animated, isEdit ? "Updating..." : "Creating...");
                if (gistFiles.length == 0) {
                  await showToast(Toast.Style.Failure, "No files in gist.");
                  return;
                }
                const _isNameValid = checkGistFileName(gistFiles);
                if (!_isNameValid) {
                  await showToast(Toast.Style.Failure, `Contents must have unique filenames.`);
                  return;
                }
                const _isContentValid = checkGistFileContent(gistFiles);
                if (!_isContentValid.valid) {
                  await showToast(
                    Toast.Style.Failure,
                    `Contents can't be empty.`,
                    `Check content of file${_isContentValid.contentIndex}.`
                  );
                } else {
                  let response: any;
                  if (isEdit) {
                    response = await updateGist(gist.gist_id, description, oldGistFiles, gistFiles);
                  } else {
                    response = await createGist(description, isPublic, gistFiles);
                  }
                  if (response.status === 201 || response.status === 200) {
                    const options: Toast.Options = {
                      style: Toast.Style.Success,
                      title: isEdit ? "Update gist success!" : "Create gist success!",
                      message: "Click to copy gist link.",
                      primaryAction: {
                        title: "Copy gist Link",
                        onAction: (toast) => {
                          Clipboard.copy(String(response.data.html_url));
                          toast.title = "Link is copied to Clipboard.";
                          toast.message = "";
                        },
                      },
                      secondaryAction: {
                        title: "Open in Browser",
                        onAction: (toast) => {
                          open(String(response.data.html_url));
                          toast.hide();
                          showHUD("Open in Browser");
                        },
                      },
                    };
                    await showToast(options);
                    const _refresh = [...refresh];
                    _refresh[0]++;
                    setRefresh(_refresh);
                  } else {
                    await showToast(Toast.Style.Success, isEdit ? "Update gist failure." : "Create gist failure.");
                  }
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, String(e));
              }
            }}
          />

          <ActionPanel.Section title={"File Actions"}>
            <Action
              title="Add File"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                setGistFiles([...gistFiles, { filename: "", content: "" }]);
                await showToast(Toast.Style.Success, "Add file success!");
              }}
            />
            <Action
              title="Remove File"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const _gistFiles = [...gistFiles];
                _gistFiles.pop();
                setGistFiles(_gistFiles);
                await showToast(Toast.Style.Success, "Remove file success!");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"description"}
        title={"Description"}
        placeholder={"Gist description..."}
        value={description}
        onChange={(newValue) => {
          setDescription(newValue);
        }}
      />
      {!isEdit && (
        <Form.Dropdown
          id={"visibility"}
          key={"visibility"}
          title={"Visibility"}
          onChange={(newValue) => {
            setIsPublic(newValue == "true");
          }}
        >
          <Form.Dropdown.Item key={"secret"} title={"Secret"} value={"false"} />
          <Form.Dropdown.Item key={"public"} title={"Public"} value={"true"} />
        </Form.Dropdown>
      )}
      {gistFiles.map((gistFile, index, array) => {
        return (
          <React.Fragment key={"file_fragment" + index}>
            <Form.Separator />
            <Form.TextField
              id={"file_name" + index}
              key={"file_name" + index}
              title={" Filename  " + (index + 1)}
              placeholder={"Filename include extension..."}
              value={array[index].filename}
              onChange={(newValue) => {
                const _gistFiles = [...gistFiles];
                _gistFiles[index].filename = newValue;
                setGistFiles(_gistFiles);
              }}
            />
            <Form.TextArea
              id={"file_content" + index}
              key={"file_content" + index}
              value={array[index].content}
              title={"Content"}
              placeholder={"File content can't be empty..."}
              onChange={(newValue) => {
                const _gistFiles = [...gistFiles];
                _gistFiles[index].content = newValue;
                setGistFiles(_gistFiles);
              }}
            />
          </React.Fragment>
        );
      })}
    </Form>
  );
}
