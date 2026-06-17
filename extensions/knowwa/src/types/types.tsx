export type DocumentBase = {
  name: string;
  id: number;
  user: User;
  uuid: string;
  created_at: string;
};

export type Document = DocumentBase & {
  document_version: DocumentVersion;
};

export type Template = DocumentBase & {
  inputs: DocumentTemplateTag[];
};

export type DocumentVersion = {
  name: string;
  document_id: string;
  document_type: string;
  uuid: string;
  updated_at: string;
  created_at: string;
  pdf_url: string;
  input_data: string;
};

export type InputDataType = {
  [key: string]: string;
};

export type User = {
  name: string;
};

export type DocumentTemplateTag = {
  identifier: string;
  checklist_action: DocumentTemplateTagInput;
};

export type DocumentTemplateTagInput = {
  action_input: string;
};
