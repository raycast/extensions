export type StackInput = {
  name: {
    key: string;
    value: string;
  };
  icon: string;
  description: string;
};

export enum StackFieldTypeEnum {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  TIME = "time",
  CURRENCY = "currency",
  BOOLEAN = "boolean",
}

export type StackFieldType = (typeof StackFieldTypeEnum)[keyof typeof StackFieldTypeEnum];

export type StackFieldInput = {
  label: {
    key: string;
    value: string;
  };
  description: string;
  type: StackFieldType;
  isTitleField: boolean;
};

export type Metadata = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Stack = StackInput &
  Metadata & {
    fields: StackField[];
    version: number;
  };

export type StackField = StackFieldInput & Metadata;

export type CaptureStack = {
  id: string;
  name: string;
  version: number;
};

export type Capture = {
  id: string;
  stack: CaptureStack;
  title: string;
  imagePath: string;
  data: CaptureData;
  createdAt: string;
};

export type CaptureData = Record<string, { value: string; type: StackFieldType }>;
