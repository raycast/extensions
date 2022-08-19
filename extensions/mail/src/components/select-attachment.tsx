import { Form, Action, ActionPanel, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir } from "fs/promises";
import { homedir } from "os";
import fs from "fs";

export const SelectAttachments = (props: { setAttachments: (attachments: string[]) => void }): JSX.Element => {
  const [numAttachments, setNumAttachments] = useState<number>(1);
  const { pop } = useNavigation();

  const attachmentsArray: number[] = Array.from({ length: numAttachments }, (_, i) => i);

  const handleSubmit = (formValues: {[key: string]: string}) => {
    const files = Object.values(formValues).map((value: string) => value.replace("file-", ""))
      .filter((file: string) => fs.existsSync(file));
    props.setAttachments(files);
    pop();  
  };

  return (
    <Form
      navigationTitle="Add Attachments"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Paperclip} title="Save Attachments" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              icon={Icon.PlusCircle}
              title="Add Attachment"
              shortcut={{ modifiers: ["cmd"], key: "a" }}
              onAction={() => setNumAttachments(numAttachments + 1)}
            />
            {numAttachments > 1 && (
              <Action
                icon={Icon.MinusCircle}
                title="Remove Attachment"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => setNumAttachments(numAttachments - 1)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title=""
        text="Add more items with ⌘ + A and remove them with ⌘ + R."
      />
      {attachmentsArray.map((i: number) => (
        <SelectFile key={i} title="" id={i.toString()} autoFocus={i === attachmentsArray.length - 1} />
      ))}
    </Form>
  );
};

export const SelectFile = (props: Form.Dropdown.Props): JSX.Element => {
  const [files, setFiles] = useState<string[]>([]);
  const [subDirectories, setSubDirectories] = useState<string[]>([]);

  const isHidden = (item: string) => {
    if (item === "Icon\r") return true;
    return /(^|\/)\.[^\/\.]/g.test(item);
  };

  const getDirectoryItems = async (dir: string) => {
    if (dir) {
      await LocalStorage.setItem("current-directory", dir);
      const directoryItems = await readdir(dir, { withFileTypes: true });
      const files = directoryItems
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .filter((item) => !isHidden(item));
      setFiles(files);
      const subDirectories = directoryItems
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((item) => !isHidden(item));
      setSubDirectories(subDirectories);
    }
  };

  const [currentDirectory, setCurrentDirectory] = useState<string>(`${homedir()}/Downloads`);

  useEffect(() => {
    getDirectoryItems(currentDirectory);
  }, [currentDirectory]);

  useEffect(() => {
    const getCurrentDirectory = async () => {
      const dir: string | undefined = await LocalStorage.getItem("current-directory");
      if (dir) setCurrentDirectory(dir);
    };
    getCurrentDirectory();
  }, []);

  const [file, setFile] = useState<string>("current");
  const [error, setError] = useState<string | undefined>("Select A File");

  return (
    <Form.Dropdown
      {...props}
      value={file}
      error={error}
      storeValue={true}
      onChange={(value: string) => {
        if (value.startsWith("file-")) {
          setFile(value);
          setError(undefined);
        } else {
          setFile("current");
          setError("Select A File");
          if (value === "current") return;
          if (value.startsWith("back")) {
            const path = currentDirectory.split("/");
            if (path.length > 0) path.pop();
            setCurrentDirectory(path.join("/"));
          } else {
            setCurrentDirectory(`${currentDirectory}/${value}`);
          }
        }
      }}
    >
      {currentDirectory !== homedir() && (
        <Form.Dropdown.Item
          value={`back-${currentDirectory}`}
          title={`Back to ${currentDirectory.split("/")[currentDirectory.split("/").length - 2]}`}
        />
      )}
      <Form.Dropdown.Item
        value={"current"}
        title={currentDirectory.split("/")[currentDirectory.split("/").length - 1]}
      />
      <Form.Dropdown.Section>
        {files.map((file: string, index: number) => (
          <Form.Dropdown.Item key={index} value={`file-${currentDirectory}/${file}`} title={file} />
        ))}
      </Form.Dropdown.Section>
      <Form.Dropdown.Section>
        {subDirectories.map((folder: string, index: number) => (
          <Form.Dropdown.Item key={index} value={folder} title={folder} />
        ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
};
