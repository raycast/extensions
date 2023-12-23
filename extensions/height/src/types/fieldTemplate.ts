export type StatusState = "default" | "blocked" | "started" | "canceled" | "completed";

export interface Metadata {
  dueColors?: boolean;
  showTimerByDefault?: boolean;
}

export interface Label {
  id: string;
  model: string;
  value: string;
  date: string | null;
  hue?: number;
  deleted: boolean;
  archived: boolean;
  statusState?: StatusState;
}

export interface FieldTemplateObject {
  id: string;
  model: string;
  name: string;
  standardType: string;
  defaultValue?: string;
  required: boolean;
  archived: boolean;
  hidden: boolean;
  permissions: string;
  redacted: unknown;
  memberAccess: string;
  publicAccess: string;
  type: string;
  labelSets?: unknown[];
  labels?: Label[];
  metadata: Metadata;
  reverseFieldTemplateId?: string;
}

export type CreateFieldTemplateFormValues = Pick<FieldTemplateObject, "name">;

export type CreateFieldTemplatePayload = CreateFieldTemplateFormValues;

export type UpdateFieldTemplateFormValues = CreateFieldTemplateFormValues;

export type UpdateFieldTemplatePayload = Partial<UpdateFieldTemplateFormValues>;
