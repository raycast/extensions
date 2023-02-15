export type Document = {
  name: string;
  id: number;
  user: User;
  uuid: string;
  checklist_items: DocumentTemplateTag[];
  created_at: string;
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
