import { Form, Action, ActionPanel, Icon, useNavigation, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "../types/types";
import { getDirectoryItems, getSize, validateSize, maximumFileSize } from "../utils/finder";
import { homedir } from "os";
import fs from "fs";

const preferences: Preferences = getPreferenceValues();
const attachmentsDirectory = preferences.selectDirectory.replace("~", homedir());

type SelectAttachmentsProps = {
  attachments: string[];
  setAttachments: (attachments: string[]) => void;
};

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
      <Form.Description title="" text="Add more items with ⌘ + A and remove them with ⌘ + R" />
      {attachmentsArray.map((i: number) => (
        <SelectFile
          key={i}
          title=""
          id={i.toString()}
          autoFocus={i === numAttachments - 1}
          info={i === 0 ? "Select a File or Folder" : undefined}
          attachment={i < props.attachments.length ? props.attachments[i] : undefined}
        />
      ))}
    </Form>
  );
};

type SelectFileProps = Form.Dropdown.Props & {
  attachment?: string;
};

export const SelectFile = (props: SelectFileProps): JSX.Element => {
  const isFile = props.attachment && fs.statSync(props.attachment).isFile();
  const [files, setFiles] = useState<string[]>(props.attachment && isFile ? [props.attachment.split("/").pop()!] : []);
  const [subDirectories, setSubDirectories] = useState<string[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string>(
    props.attachment
      ? isFile
        ? props.attachment.split("/").slice(0, -1).join("/")
        : props.attachment
      : attachmentsDirectory
  );
  const [attachment, setAttachment] = useState<string>(
    props.attachment && isFile ? `attachment-${props.attachment}` : currentDirectory
  );

  useEffect(() => {
    const onDirectoryChange = async () => {
      if (currentDirectory) {
        const { files, subDirectories } = await getDirectoryItems(currentDirectory);
        setFiles(files);
        setSubDirectories(subDirectories);
      }
    };
    onDirectoryChange();
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
        {files.map((attachment: string, index: number) => (
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
