import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDocumentTags } from "./utils/fetchDocumentTags";
import { fetchDocumentTypes } from "./utils/fetchDocumentTypes";
import { fetchCorrespondents } from "./utils/fetchCorrespondents";
import { postDocument } from "./utils/postDocument";
import { Correspondent, Tag, Type } from "./models/paperlessResponse.model";
import { PostDocument } from "./models/docPost.model";

export default function DocumentForm() {
  const [files, setFiles] = useState<string[]>([]);

  const [tagOptions, setTagOptions] = useState<Tag[]>();
  const [typeOptions, setTypeOptions] = useState<Type[]>();
  const [correspondentOptions, setCorrespondentOptions] = useState<Correspondent[]>();

  const [fileError, setFileError] = useState<string | undefined>();

  const submit = async (value: PostDocument) => {
    if (files.length) {
      await postDocument(value, files[0])
        .then(() => {
          showToast(Toast.Style.Success, "File uploaded successfully");
          popToRoot();
        })
        .catch((error) => {
          showToast(Toast.Style.Failure, "Error", error);
        });
    } else {
      setFileError("Please select a file");
    }
  };

  function onFileSelect(filePaths: string[]) {
    setFiles(filePaths);
    dropFileErrorIfNeeded();
  }

  function dropFileErrorIfNeeded() {
    if (fileError && fileError.length > 0) {
      setFileError(undefined);
    }
  }

  useEffect(() => {
    async function fetchOptions() {
      const documentTags: Tag[] = await fetchDocumentTags();
      setTagOptions(documentTags);
      const documentTypes: Type[] = await fetchDocumentTypes();
      setTypeOptions(documentTypes);
      const correspondents = await fetchCorrespondents();
      setCorrespondentOptions(correspondents);
    }

    fetchOptions().then();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Document" onSubmit={(values: PostDocument) => submit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter the document title" />

      <Form.DatePicker id="date" title="Creation date" />

      <Form.Dropdown id="correspondent" filtering title="Correspondent">
        <Form.Dropdown.Item key={0} value={"-1"} title="* Automatic assignation *" />
        {correspondentOptions?.map((correspondent) => {
          return (
            <Form.Dropdown.Item key={correspondent.id} value={correspondent.id.toString()} title={correspondent.name} />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown id="type" filtering title="Type">
        <Form.Dropdown.Item key={0} value={"-1"} title="* Automatic assignation *" />
        {typeOptions?.map((type) => {
          return <Form.Dropdown.Item key={type.id} value={type.id.toString()} title={type.name} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Tags">
        {tagOptions?.map((tag) => {
          return <Form.TagPicker.Item key={tag.id} value={tag.id.toString()} title={tag.name} />;
        })}
      </Form.TagPicker>

      <Form.FilePicker
        id="file"
        title="File"
        value={files}
        onChange={onFileSelect}
        allowMultipleSelection={false}
        error={fileError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setFileError("A file is required");
          } else {
            dropFileErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
