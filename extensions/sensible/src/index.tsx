import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fs from "fs";

import ExtractionDetail from "./ExtractionDetail";
import useDocumentTypes from "./hooks/useDocumentTypes";

interface ExtractionFormValues {
  documentType: string;
  filePaths: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const { data: documentTypes, isLoading: isLoadingDocumentTypes } = useDocumentTypes();

  const { handleSubmit, itemProps } = useForm<ExtractionFormValues>({
    onSubmit(values) {
      const filePath = values.filePaths[0];
      if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
        return false;
      }
      push(<ExtractionDetail documentType={values.documentType} filePath={values.filePaths[0]} />);
    },
    validation: {
      documentType: FormValidation.Required,
      filePaths: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoadingDocumentTypes}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Document Type" {...itemProps.documentType}>
        {documentTypes?.map(({ id, name }) => (
          <Form.Dropdown.Item value={name} title={name} key={id} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker title="Document (PDF)" allowMultipleSelection={false} {...itemProps.filePaths} />
      <Form.Separator />
      <Form.Description
        title="Instructions"
        text="Document types are configured at Sensible.so. They can include multiple configurations, each with their own set of fields.
        
We do our best to choose the correct configuration for you at extraction time.

Configurations must be published to production."
      />
    </Form>
  );
}
