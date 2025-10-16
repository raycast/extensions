export enum Types {
  JSON = "JSON",
  Swift = "Swift",
  ObjectiveC = "ObjectiveC",
  TypeScript = "TypeScript",
}

export enum SwiftType {
  Struct = "Struct",
  Class = "Class",
}

export enum ObjectiveCType {
  JSONModel = "JSONModel",
}

export interface InputJsonFormValues {
  jsonValue: string;
  option?: SwiftType | ObjectiveCType;
  name?: string; // json convert class root name
  prefix?: string; // objective-c class prefix
}

export interface InputJsonProps {
  navTitle: string;
  actionTitle: string;
  type: Types;
  onConvert: (values: InputJsonFormValues) => Promise<string | null>;
  extraNode?: React.ReactNode[];
  onChange?: (value: string) => void;
}
