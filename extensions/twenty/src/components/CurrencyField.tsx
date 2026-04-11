import React, { Fragment, forwardRef } from "react";
import { Form, FormItemRef, ItemProps } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type CurrencyFieldProps = {
  field: DataModelField;
  itemProps: Record<string, ItemProps>;
};

const CurrencyField = forwardRef<FormItemRef, CurrencyFieldProps>(({ field, itemProps }, ref) => {
  const amountProps = { ...(itemProps[`${field.name}__amount`] ?? {}) } as Record<string, unknown>;
  delete amountProps.id;
  const currencyCodeProps = { ...(itemProps[`${field.name}__currencyCode`] ?? {}) } as Record<string, unknown>;
  delete currencyCodeProps.id;

  return (
    <Fragment>
      <Form.TextField
        id={`${field.name}__amount`}
        title={`${field.label} Amount`}
        placeholder={`Enter ${field.label} amount...`}
        ref={ref as React.Ref<FormItemRef>}
        {...amountProps}
      />
      <Form.TextField
        id={`${field.name}__currencyCode`}
        title={`${field.label} Currency Code`}
        placeholder="USD"
        {...currencyCodeProps}
      />
    </Fragment>
  );
});

CurrencyField.displayName = "CurrencyField";

export default CurrencyField;
