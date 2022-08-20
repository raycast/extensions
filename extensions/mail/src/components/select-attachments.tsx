import {
  Form,
  Action,
  ActionPanel,
  Icon,
  LocalStorage,
  useNavigation,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "../types/types";
import { getSize, validateSize, maximumFileSize } from "../utils/file-utils";
import { readdir } from "fs/promises";
import { homedir } from "os";
import fs from "fs";

interface SelectAttachmentsProps {
  attachments: string[];
  setAttachments: (attachments: string[]) => void;
}

const preferences: Preferences = getPreferenceValues();
const attachmentsDirectory = preferences.selectDirectory.replace("~", homedir());

export const SelectAttachments = (props: SelectAttachmentsProps): JSX.Element => {
  const [numAttachments, setNumAttachments] = useState(props.attachments.length === 0 ? 1 : props.attachments.length);
  const { pop } = useNavigation();

  const attachmentsArray: number[] = Array.from({ length: numAttachments }, (_, i) => i);

  const handleSubmit = async (formValues: { [key: string]: string }) => {
    const attachments = Object.values(formValues)
      .map((value: string) => value.replace("attachment-", ""))
      .filter((attachment: string) => fs.existsSync(attachment));
    const size = await getSize(attachments);
    if (size < maximumFileSize.value) {
      props.setAttachments(attachments);
      pop();
    } else {
      const Size: string = `${(size / 10 ** 6).toFixed(1)} MB`;
      const options: Toast.Options = {
        title: `Attachments Size Exceeds ${maximumFileSize.label}`,
        message: `Total Size of Attachments is ${Size}`,
        style: Toast.Style.Failure,
      };
      showToast(options);
    }
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
      <Form.Description title="" text="Add more items with ⌘ + A and remove them with ⌘ + R." />
      {attachmentsArray.map((i: number) => (
        <SelectFile
          key={i}
          title=""
          id={i.toString()}
          val={i < props.attachments.length ? props.attachments[i] : undefined}
          storeValue={true}
          autoFocus={i === numAttachments - 1}
          info={i === 0 ? "Select a File or Folder" : undefined}
        />
      ))}
    </Form>
  );
};

export const SelectFile = (props: Form.Dropdown.Props & { val: string | undefined }): JSX.Element => {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [subDirectories, setSubDirectories] = useState<string[]>([]);

  const isHidden = (item: string) => {
    if (item === "Icon\r") return true;
    return /(^|\/)\.[^\/\.]/g.test(item);
  };

  const [currentDirectory, setCurrentDirectory] = useState<string>(attachmentsDirectory);
  const [attachment, setAttachment] = useState<string>(currentDirectory);

  const getDirectoryItems = async (dir: string) => {
    if (dir) {
      const directoryItems = await readdir(dir, { withFileTypes: true });
      const attachments = directoryItems
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .filter((item) => !isHidden(item));
      setAttachments(attachments);
      const subDirectories = directoryItems
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((item) => !isHidden(item));
      setSubDirectories(subDirectories);
    }
  };

  useEffect(() => {
    getDirectoryItems(currentDirectory);
  }, [currentDirectory]);

  const [error, setError] = useState<string | undefined>(undefined);

  const checkItemSize = async () => {
    const isValid = await validateSize([attachment.replace("attachment-", "")]);
    setError(isValid ? undefined : `Maximum Size is ${maximumFileSize.label}`);
  };

  useEffect(() => {
    checkItemSize();
  }, [attachment]);

  return (
    <Form.Dropdown
      {...props}
      error={error}
      value={attachment}
      storeValue={true}
      onChange={(value: string) => {
        if (value.startsWith("attachment-")) {
          setAttachment(value);
        } else {
          let path = value;
          if (path !== currentDirectory) {
            if (path.startsWith("back")) {
              path = currentDirectory.split("/").slice(0, -1).join("/");
            } else {
              path = `${currentDirectory}/${value}`;
            }
          }
          setAttachment(path);
          setCurrentDirectory(path);
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
        value={currentDirectory}
        title={currentDirectory.split("/")[currentDirectory.split("/").length - 1]}
      />
      <Form.Dropdown.Section title="Files">
        {attachments.map((attachment: string, index: number) => (
          <Form.Dropdown.Item key={index} value={`attachment-${currentDirectory}/${attachment}`} title={attachment} />
        ))}
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="Folders">
        {subDirectories.map((folder: string, index: number) => (
          <Form.Dropdown.Item key={index} value={folder} title={folder} />
        ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
};
