export interface Preferences {
  organization: string;
  email: string;
  "api-token": string;
}

export interface Entity {
  entity_id: string;
  entity_name: string;
  entity_data_name: string;
  protected_entity: string;
}

export interface FieldGroup {
  field_group_data: {
    group_id: string;
    group_name: string;
  };
  fields_data: Field[][];
}

export interface Field {
  field_id: string;
  field_name: string;
  field_type_name: string;
  field_data_name: string;
  default_value: string | number | DefaultFieldValue;
  value?:
    | string
    | number
    | readonly FieldValue[]
    | AddressFieldValue
    | UploadFilesFieldValue
    | UserFieldValue
    | DateTimeFieldValue;
  color?: string;
}

export interface DefaultFieldValue {
  text: string;
  instance_id: string;
}

export interface FieldValue {
  text: string;
  instance_id: string;
}

export interface UserFieldValue {
  instance_id: string;
  text: string;
  ref_value?: Array<{ value: string }>;
}

export interface DateTimeFieldValue {
  timestamp: number;
  text: string;
}

export interface AddressFieldValue {
  formatted_address: string;
}

export interface UploadFilesFieldValue {
  file_id: string;
  file_name: string;
  location: string;
}

export interface Instance {
  instance_data: {
    _id: string;
    insertTimestamp: string;
    archived: boolean;
    ui_data: UIData;
    field_groups: FieldGroup[];
  };
}

export interface UIData {
  url: string;
  name: string;
}

export interface EntityDataResponse {
  info: {
    total_count: number;
    current_page_total_count: number;
    max_each_page: number;
    current_page_number: number;
    total_pages: number;
  };
  entity_data: {
    entity_name: string;
    entity_data_name: string;
    entity_id: string;
  };
  data: Instance[];
}

export type FilterOperator = "like" | "in" | "=";

export interface FilterOption {
  fieldId: string;
  fieldName: string;
  fieldDataName: string;
  fieldTypeName: string;
  operator: FilterOperator | null;
}
