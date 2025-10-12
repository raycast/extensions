export type QueryRecordsResponse = {
  data: Array<{
    id: {
      record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
      [attributeSlug: string]: AttributeValue[];
    };
  }>;
};

type CheckboxValue = {
  value: boolean;
  attribute_type: "checkbox";
};

type CurrencyValue = {
  currency_value: number;
  currency_code: string | null;
  attribute_type: "currency";
};

type DateValue = {
  attribute_type: "date";
  value: string;
};

type DomainValue = {
  domain: string;
  attribute_type: "domain";
};

type EmailAddressValue = {
  email_address: string;
  attribute_type: "email-address";
};

type NumberValue = {
  value: number;
  attribute_type: "number";
};

type PersonalNameValue = {
  full_name: string;
  attribute_type: "personal-name";
};

type PhoneNumberValue = {
  phone_number: string;
  attribute_type: "phone-number";
};

type StatusValue = {
  status: unknown;
  attribute_type: "status";
};

type RatingValue = {
  value: number;
  attribute_type: "rating";
};

type SelectValue = {
  option: unknown
  attribute_type: "select";
};

type TextValue = {
  value: string;
  attribute_type: "text";
};

type TimestampValue = {
  attribute_type: "timestamp";
  value: string;
};

export type AttributeValue =
  | CheckboxValue
  | CurrencyValue
  | DateValue
  | DomainValue
  | EmailAddressValue
  | NumberValue
  | PersonalNameValue
  | PhoneNumberValue
  | StatusValue
  | RatingValue
  | SelectValue
  | TextValue
  | TimestampValue;
