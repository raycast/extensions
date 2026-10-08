import { Form, showToast, Toast, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState, useRef } from "react";
import { GoogleDoc, createDocument } from "../google_fns";
import { getUniqueNameForDoc } from "../util";

const FILE_NAME_ERROR = "Please enter the file name!";

interface CreateFileForm {
  fileName: string;
}

export async function createDocumentWithName(fileName: string) {
  try {
    const newDoc = await createDocument(getUniqueNameForDoc(fileName));
    return newDoc;
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: String(error) });
  }
}

export function CreateNewFileForm(props: { onNewFileCreation: (file: GoogleDoc) => void }) {
  const [noFileNameError, setNoFileNameError] = useState<string | undefined>();
  const fileNameTextFieldRef = useRef<Form.TextArea>(null);
  const { pop } = useNavigation();
  const [fileCreationInProgress, setFileCreationInProgress] = useState<boolean>(false);

  function dropFileNameError() {
    if (noFileNameError && noFileNameError.length > 0) {
      setNoFileNameError(undefined);
    }
  }

  async function onFileCreate(createFileValues: CreateFileForm) {
    setFileCreationInProgress(true);
    try {
      if (createFileValues.fileName.trim().length === 0) {
        setNoFileNameError(FILE_NAME_ERROR);
      } else {
        const newDoc = await createDocumentWithName(createFileValues.fileName.trim());
        if (newDoc) {
          fileNameTextFieldRef.current?.reset();
          props.onNewFileCreation(newDoc);
          await showToast({ style: Toast.Style.Success, title: "File creation successful!" });
          setTimeout(() => pop(), 1000);
        } else {
          showToast({ style: Toast.Style.Failure, title: String("File creation failed!") });
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
    setFileCreationInProgress(false);
  }

  return (
    <Form
      isLoading={fileCreationInProgress}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.NewDocument} title="Create" onSubmit={onFileCreate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fileName"
        onBlur={(event) => {
          if (event.target.value?.trim().length === 0) {
            setNoFileNameError(FILE_NAME_ERROR);
          } else {
            dropFileNameError();
          }
        }}
        error={noFileNameError}
        onChange={dropFileNameError}
        title="File Name"
        placeholder="Enter file name"
        ref={fileNameTextFieldRef}
      />
    </Form>
  );
}
