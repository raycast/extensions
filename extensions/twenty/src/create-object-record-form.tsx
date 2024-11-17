import { Action, ActionPanel, Form, Icon, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { Fragment } from "react";

import { FailureToast } from "./enum/api";

import { DataModelWithFields, ObjectRecordFields } from "./services/zod/schema/recordFieldSchema";
import { FieldComponent, TextInput } from "./components";
import { useForm } from "@raycast/utils";
import twenty from "./services/TwentySDK";
import { createValidationsForRest } from "./helper/createValidationsForRest";
import { formatValues } from "./helper/formatValues";

function CreateObjectRecordForm({
  objectRecordMetadata,
  fields,
}: {
  objectRecordMetadata: DataModelWithFields;
  fields: ObjectRecordFields;
}) {
  const { namePlural, labelSingular } = objectRecordMetadata;
  const { primary, rest } = fields;
  const { handleSubmit, itemProps } = useForm({
    async onSubmit(values) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating Object Record",
      });

      const formattedValues = formatValues(values, objectRecordMetadata);
      const isSuccess = await twenty.createObjectRecord(namePlural, formattedValues);

      if (isSuccess) {
        await showHUD(`${objectRecordMetadata.labelSingular} Created 🎉`, {
          popToRootType: PopToRootType.Immediate,
          clearRootSearch: true,
        });

        return;
      }

      await showToast(FailureToast);
    },
    validation: {
      [primary.name]: (value) => {
        const targetValue = value as string;
        if (targetValue.length === 0) return "Required";
      },
      ...createValidationsForRest(rest),
    },
  });

  return (
    <Fragment>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create Record" onSubmit={handleSubmit} icon={Icon.Pencil} />
          </ActionPanel>
        }
      >
        <TextInput
          values={{ field: primary, placeholder: `Enter ${labelSingular} ${primary.label}` }}
          {...itemProps[primary.name]}
        />
        {rest.map((field) => {
          return <FieldComponent key={field.name} values={{ field, itemProps: itemProps[field.name] }} />;
        })}
      </Form>
    </Fragment>
  );
}

export default CreateObjectRecordForm;
