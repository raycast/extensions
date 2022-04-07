import { Form, ActionPanel, Action, Icon, showToast, Toast, Clipboard, open, showHUD } from "@raycast/api";
import React from "react";
import { useEffect, useState } from "react";
import { checkGistFile, createGist, Gist, GistFile, octokit, updateGist } from "./util/gist-utils";
import { fetchItemInput, ItemSource } from "./util/input";

export default function CreateGist(props: { gist: Gist }) {
  const gist =
    typeof props.gist == "undefined"
      ? {
          gist_id: "",
          description: "",
          html_url: "",
          file: [],
        }
      : props.gist;
  const isEdit = typeof props.gist != "undefined";
  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [gistFiles, setGistFiles] = useState<GistFile[]>([]);

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
      } else {
        const inputItem = await fetchItemInput();
        if (inputItem.source === ItemSource.NULL) {
          await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
        } else {
          setGistFiles([...gistFiles, { filename: "", content: inputItem.content }]);
        }
      }
    }

    _fetchItemInput().then();
  }, []);

  return (
    <Form
      navigationTitle={"Create Gist"}
      actions={
        <ActionPanel>
          <Action
            title={isEdit ? "Update Gist" : "Create Gist"}
            icon={Icon.Upload}
            onAction={async () => {
              try {
                await showToast(Toast.Style.Animated, isEdit ? "Update Gist" : "Creating Gist");
                const _isValid = checkGistFile(gistFiles);
                if (!_isValid.valid) {
                  await showToast(
                    Toast.Style.Failure,
                    `Contents can't be empty`,
                    `Check content of file${_isValid.contentIndex}`
                  );
                } else {
                  const files: { [p: string]: { content: string } } = {};
                  gistFiles.forEach((value) => {
                    files[value.filename] = { content: value.content };
                  });
                  let response: any;
                  if (isEdit) {
                    response = await updateGist(gist.gist_id, description, files);
                  } else {
                    response = await createGist(description, isPublic, files);
                  }
                  if (response.status === 201 || response.status === 200) {
                    const options: Toast.Options = {
                      style: Toast.Style.Success,
                      title: isEdit ? "Update Gist Success" : "Create Gist Success",
                      message: "Click to copy Gist link",
                      primaryAction: {
                        title: "Copy Gist Link",
                        onAction: (toast) => {
                          Clipboard.copy(String(response.data.html_url));
                          toast.title = "Link is copied to Clipboard";
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
                  } else {
                    await showToast(Toast.Style.Success, isEdit ? "Update Gist Failure" : "Create Gist Failure");
                  }
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, String(e));
              }
            }}
          />
          <Action
            title="Add File"
            icon={Icon.Document}
            onAction={async () => {
              setGistFiles([...gistFiles, { filename: "", content: "" }]);
              await showToast(Toast.Style.Success, "Add File Failure");
            }}
          />
          <Action
            title="Remove File"
            icon={Icon.Document}
            shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
            onAction={async () => {
              const _gistFiles = [...gistFiles];
              _gistFiles.pop();
              setGistFiles(_gistFiles);
              await showToast(Toast.Style.Success, "Remove File Failure");
            }}
          />
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
