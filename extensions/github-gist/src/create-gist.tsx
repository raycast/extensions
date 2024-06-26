import { Form, ActionPanel, Action, Icon, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  checkGistFileContent,
  checkGistFileName,
  createGist,
  Gist,
  GistFile,
  octokit,
  updateGist,
} from "./util/gist-utils";
import { fetchItemInput } from "./util/input";
import { GistFileForm } from "./components/gist-file-form";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { MutatePromise } from "@raycast/utils";

export default function CreateGist(props: { gist: Gist | undefined; gistMutate: MutatePromise<Gist[]> }) {
  const isEdit = !!props.gist;
  const gist = props.gist ?? {
    gist_id: "",
    description: "",
    html_url: "",
    file: [],
  };
  const gistMutate = props.gistMutate ?? (() => {});

  const oldGistFiles = useMemo(() => {
    return gist.file.map((value) => value.filename);
  }, [gist]);

  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [gistFiles, setGistFiles] = useState<GistFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function _fetch() {
      if (isEdit) {
        const _gistFiles: GistFile[] = [];
        for (const value of gist.file) {
          const { data } = await octokit.request(`${value.raw_url}`);
          _gistFiles.push({
            filename: value.filename,
            content: data as string,
          });
        }
        setDescription(gist.description);
        setGistFiles(_gistFiles);
      } else {
        const inputItem = await fetchItemInput();
        setGistFiles([...gistFiles, { filename: "", content: inputItem }]);
      }
      setIsLoading(false);
    }
    _fetch().then();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Gist" : "Create Gist"}
      searchBarAccessory={<Form.LinkAccessory target={gist.html_url} text="Go to Gist" />}
      actions={
        <ActionPanel>
          <Action
            title={isEdit ? "Update Gist" : "Create Gist"}
            icon={isEdit ? Icon.Person : Icon.Plus}
            onAction={async () => {
              try {
                await showToast(Toast.Style.Animated, isEdit ? "Updating..." : "Creating...");
                if (gistFiles.length == 0) {
                  await showToast(Toast.Style.Failure, "No file in gist.");
                  return;
                }
                const _isNameValid = checkGistFileName(gistFiles);
                if (!_isNameValid) {
                  await showToast(Toast.Style.Failure, `Content must have unique filename.`);
                  return;
                }
                const _isContentValid = checkGistFileContent(gistFiles);
                if (!_isContentValid.valid) {
                  await showToast(
                    Toast.Style.Failure,
                    `Content cannot be empty.`,
                    `Check content of file${_isContentValid.contentIndex}.`,
                  );
                } else {
                  let response;
                  if (isEdit) {
                    response = await updateGist(gist.gist_id, description, oldGistFiles, gistFiles);
                  } else {
                    response = await createGist(description, isPublic, gistFiles);
                  }
                  if (response.status === 201 || response.status === 200) {
                    const options: Toast.Options = {
                      style: Toast.Style.Success,
                      title: isEdit ? "Updated successfully!" : "Created successfully!",
                      message: "Click to copy gist link.",
                      primaryAction: {
                        title: "Copy gist link",
                        onAction: (toast) => {
                          Clipboard.copy(String(response.data.html_url));
                          toast.title = "Link is copied to Clipboard.";
                          toast.message = "";
                        },
                      },
                      secondaryAction: {
                        title: "Open in browser",
                        onAction: (toast) => {
                          open(String(response.data.html_url));
                          toast.hide();
                        },
                      },
                    };
                    await showToast(options);
                    await gistMutate();
                  } else {
                    await showToast(Toast.Style.Failure, isEdit ? "Failed to update gist." : "Failed to create gist.");
                  }
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, String(e));
              }
            }}
          />

          <Action.CopyToClipboard title={"Copy Gist Id"} content={gist.gist_id} />

          <ActionPanel.Section>
            <Action
              title="Add File"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                setGistFiles([{ filename: "", content: "" }, ...gistFiles]);
              }}
            />
            <Action
              title="Remove First File"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const _gistFiles = [...gistFiles];
                _gistFiles.shift();
                setGistFiles(_gistFiles);
              }}
            />
            <Action
              title="Remove Last File"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
              onAction={async () => {
                const _gistFiles = [...gistFiles];
                _gistFiles.pop();
                setGistFiles(_gistFiles);
              }}
            />
          </ActionPanel.Section>

          <ActionOpenPreferences command={false} />
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
      {isEdit ? (
        <>
          <Form.Description title={"Gist Id"} text={gist.gist_id} />
        </>
      ) : (
        <Form.Dropdown
          id={"visibility"}
          key={"visibility"}
          title={"Visibility"}
          onChange={(newValue) => {
            setIsPublic(newValue == "true");
          }}
        >
          <Form.Dropdown.Item key={"secret"} icon={Icon.EyeDisabled} title={"Secret"} value={"false"} />
          <Form.Dropdown.Item key={"public"} icon={Icon.Eye} title={"Public"} value={"true"} />
        </Form.Dropdown>
      )}
      {gistFiles.map((gistFile, index, array) => {
        return (
          <GistFileForm
            key={"file_fragment" + index}
            array={array}
            index={index}
            useState={[gistFiles, setGistFiles]}
          />
        );
      })}
    </Form>
  );
}
