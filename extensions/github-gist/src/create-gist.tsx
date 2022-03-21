import { Form, ActionPanel, Action, Icon, showToast, Toast, Clipboard, open, showHUD } from "@raycast/api";
import React from "react";
import { useEffect, useState } from "react";
import { checkGistFile, createGist, GistFile } from "./util/gist-utils";
import { fetchItemInput, ItemSource } from "./util/input";

export default function CreateShortcut() {
  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [gistFiles, setGistFiles] = useState<GistFile[]>([]);

  useEffect(() => {
    async function _fetchItemInput() {
      const inputItem = await fetchItemInput();
      if (inputItem.source === ItemSource.NULL) {
        await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
      } else {
        setGistFiles([...gistFiles, { filename: "", content: inputItem.content }]);
      }
    }

    _fetchItemInput().then();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Create Gist"
            icon={Icon.Upload}
            onAction={async () => {
              try {
                await showToast(Toast.Style.Animated, "Creating Gist");
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
                  const response = await createGist(description, isPublic, files);
                  if (response.status === 201) {
                    const options: Toast.Options = {
                      style: Toast.Style.Success,
                      title: "Create Gist Success",
                      message: "Click to copy gist link",
                      primaryAction: {
                        title: "Copy Gist Link",
                        onAction: (toast) => {
                          Clipboard.copy(String(response.data.html_url));
                          toast.title = "Link is copied to Clipboard";
                          toast.message = "";
                        },
                      },
                      secondaryAction: {
                        title: "Open in browser",
                        onAction: (toast) => {
                          open(String(response.data.html_url));
                          toast.hide();
                          showHUD("Open in Browser");
                        },
                      },
                    };
                    await showToast(options);
                  } else {
                    await showToast(Toast.Style.Success, "Create Gist Failure");
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
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"description"}
        title={"Description"}
        placeholder={"Gist description..."}
        defaultValue={description}
        onChange={(newValue) => {
          setDescription(newValue);
        }}
      />
      <Form.Dropdown
        id={"visibility"}
        key={"visibility"}
        title={"Visibility"}
        onChange={(newValue) => {
          setIsPublic(newValue == "true");
        }}
      >
        <Form.DropdownItem key={"secret"} title={"Secret"} value={"false"} />
        <Form.DropdownItem key={"public"} title={"Public"} value={"true"} />
      </Form.Dropdown>
      {gistFiles.map((gistFile, index, array) => {
        return (
          <React.Fragment key={"file_fragment" + index}>
            <Form.Separator />
            <Form.TextField
              id={"file_name" + index}
              key={"file_name" + index}
              title={"Filename"}
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
              title={"File Content"}
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
