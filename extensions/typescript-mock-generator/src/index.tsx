import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { FormValues } from "./types/formValues";
import { ApiResponse } from "./types/apiResponse";
import { prettyPrint } from "./utils/prettyPrint";
import { formValidations } from "./utils/formValidations";
import { submitForm } from "./handlers/submitForm";
import { resetForm } from "./handlers/resetForm";

const inputInfo = `
You can use some built-in data types:
  - DataType.USER_NAME
  - DataType.FIRST_NAME
  - DataType.LAST_NAME
  - DataType.PRICE
  - DataType.DESCRIPTION
`;

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [mockData, setMockData] = useState<ApiResponse[]>([]);
  const { handleSubmit, itemProps, setValue, reset, focus } = useForm<FormValues>({
    onSubmit: (values) => submitForm(values, setMockData, setIsLoading),
    validation: formValidations,
  });

  async function onFormReset() {
    await resetForm(reset, focus, setMockData, setValue);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {mockData.length > 0 && <Action.CopyToClipboard content={prettyPrint(mockData)} />}
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action title="Reset Form" icon={Icon.Eraser} style={Action.Style.Destructive} onAction={onFormReset} />
        </ActionPanel>
      }
    >
      <Form.Description text="Input one or more typescript interfaces and select the number of mocked rows per interface. Types are not supported!" />
      <Form.TextArea
        autoFocus
        info={inputInfo}
        title="Typescript interfaces"
        placeholder="Input one or more typescript interfaces"
        {...itemProps.input}
      />
      <Form.TextField title="Number of mock rows per interface" placeholder="10" {...itemProps.rows} />
      <Form.Separator />
      {mockData.length > 0 && <Form.Description text="Simply hit cmd + enter to copy your generated mock data" />}
      <Form.TextArea
        id="result"
        title="Generated mock data"
        placeholder="Your generated mock data will appear here"
        onChange={(json) => console.log("readonly field with json: ", json)}
        value={mockData.length > 0 ? prettyPrint(mockData) : ""}
      />
    </Form>
  );
}
