export type PhoneFormat = {
  format: number[];
  separator: string;
  base: string[];
};

export type PhoneFormats = {
  fr: PhoneFormat;
  uk: PhoneFormat;
  us: PhoneFormat;
};

export interface FieldType {
  name: string | undefined;
  type: string | undefined;
  format?: string | undefined;
  maxLength?: number | undefined;
  nbrOfP?: number | undefined;
}

export type Fields = FieldType[];
