export type StatusState = "default" | "blocked" | "started" | "canceled" | "completed";

export type Option = {
  id: string;
  model: string;
  value: string;
  date?: string | null;
  hue: number;
  deleted: boolean;
  archived: boolean;
  statusState?: StatusState;
};

type Metadata = {
  showTimerByDefault: boolean;
  options: Option[];
  dueColors?: boolean;
};

export type FieldTemplateObject = {
  id: string;
  model: string;
  name: string;
  standardType: string;
  required: boolean;
  archived: boolean;
  permissions: string;
  type: string;
  metadata: Metadata;
  reverseFieldTemplateId: string;
  labelSets: unknown[];
  labels: Option[];
  defaultValue: string;
};

export type CreateFieldTemplateFormValues = Pick<
  FieldTemplateObject,
  "name" | "listIds" | "description" | "status" | "assigneesIds" | "parentTaskId"
>;

export type CreateFieldTemplatePayload = CreateFieldTemplateFormValues;

export type UpdateFieldTemplateFormValues = CreateFieldTemplateFormValues;

export type UpdateFieldTemplatePayload = Partial<UpdateFieldTemplateFormValues>;
