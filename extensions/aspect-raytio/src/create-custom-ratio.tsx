import { useState } from "react";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCreateCustomRatio } from "../hooks/useCustomRatios";
import { RatioType } from ".";

export default function CreateCustomRatio(props: { totalCustomRatios: number; onCreate: (ar: RatioType) => void }) {
  const { totalCustomRatios, onCreate } = props;
  const { pop } = useNavigation();
  const [widthError, setWidthError] = useState<string | undefined>();
  const [heightError, setHeightError] = useState<string | undefined>();

  function dropWidthError() {
    if (widthError && widthError.length > 0) {
      setWidthError(undefined);
    }
  }

  function dropHeightError() {
    if (heightError && heightError.length > 0) {
      setHeightError(undefined);
    }
  }

  return (
    <Form
      navigationTitle="Create Custom Ratio"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            onSubmit={(values) => {
              useCreateCustomRatio(values.widthField, values.heightField);
              onCreate({
                key: `${totalCustomRatios + 1}`,
                width: Number(values.widthField),
                height: Number(values.heightField),
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="widthField"
        placeholder="16"
        error={widthError}
        onChange={dropWidthError}
        onBlur={(event) => {
          if (!event.target.value || isNaN(Number(event.target.value))) {
            setWidthError("The field should be a number!");
          } else {
            dropWidthError();
          }
        }}
      />
      <Form.TextField
        id="heightField"
        placeholder="9"
        error={heightError}
        onChange={dropHeightError}
        onBlur={(event) => {
          if (!event.target.value || isNaN(Number(event.target.value))) {
            setHeightError("The field should be a number!");
          } else {
            dropHeightError();
          }
        }}
      />
    </Form>
  );
}
