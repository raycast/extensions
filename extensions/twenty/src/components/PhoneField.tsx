import React, { Fragment, forwardRef } from "react";
import { Form, FormItemRef, ItemProps } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type PhoneFieldProps = {
  field: DataModelField;
  itemProps: Record<string, ItemProps>;
};

const PhoneField = forwardRef<FormItemRef, PhoneFieldProps>(({ field, itemProps }, ref) => {
  const phoneNumberProps = { ...(itemProps[`${field.name}__primaryPhoneNumber`] ?? {}) } as Record<string, unknown>;
  delete phoneNumberProps.id;
  const countryCodeProps = { ...(itemProps[`${field.name}__primaryPhoneCountryCode`] ?? {}) } as Record<
    string,
    unknown
  >;
  delete countryCodeProps.id;
  const callingCodeProps = { ...(itemProps[`${field.name}__primaryPhoneCallingCode`] ?? {}) } as Record<
    string,
    unknown
  >;
  delete callingCodeProps.id;

  return (
    <Fragment>
      <Form.TextField
        id={`${field.name}__primaryPhoneNumber`}
        title={`${field.label} Number`}
        placeholder={`Enter ${field.label} number...`}
        ref={ref as React.Ref<FormItemRef>}
        {...phoneNumberProps}
      />
      <Form.TextField
        id={`${field.name}__primaryPhoneCountryCode`}
        title={`${field.label} Country Code`}
        placeholder="US"
        {...countryCodeProps}
      />
      <Form.TextField
        id={`${field.name}__primaryPhoneCallingCode`}
        title={`${field.label} Calling Code`}
        placeholder="+1"
        {...callingCodeProps}
      />
    </Fragment>
  );
});

PhoneField.displayName = "PhoneField";

export default PhoneField;
