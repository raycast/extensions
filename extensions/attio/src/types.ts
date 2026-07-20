import {
  AttributeTypeCheckbox,
  AttributeTypeCurrency,
  AttributeTypeDate,
  AttributeTypeDomain,
  AttributeTypeEmailAddress,
  AttributeTypeNumber,
  AttributeTypePersonalName,
  AttributeTypePhoneNumber,
  AttributeTypeRating,
  AttributeTypeSelect1,
  AttributeTypeText,
  AttributeTypeTimestamp,
} from "attio-js/dist/commonjs/models/components/outputvalue";

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
  attribute_type: AttributeTypeCheckbox;
};

type CurrencyValue = {
  currency_value: number;
  currency_code: string | null;
  attribute_type: AttributeTypeCurrency;
};

type DateValue = {
  attribute_type: AttributeTypeDate;
  value: string;
};

type DomainValue = {
  domain: string;
  attribute_type: AttributeTypeDomain;
};

type EmailAddressValue = {
  email_address: string;
  attribute_type: AttributeTypeEmailAddress;
};

type NumberValue = {
  value: number;
  attribute_type: AttributeTypeNumber;
};

type PersonalNameValue = {
  full_name: string;
  attribute_type: AttributeTypePersonalName;
};

type PhoneNumberValue = {
  phone_number: string;
  attribute_type: AttributeTypePhoneNumber;
};

type StatusValue = {
  status: unknown;
  attribute_type: "status";
};

type RatingValue = {
  value: number;
  attribute_type: AttributeTypeRating;
};

type SelectValue = {
  option: unknown;
  attribute_type: AttributeTypeSelect1;
};

type TextValue = {
  value: string;
  attribute_type: AttributeTypeText;
};

type TimestampValue = {
  attribute_type: AttributeTypeTimestamp;
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
