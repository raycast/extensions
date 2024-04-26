import {useCallback, useState} from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import {validateNotEmptyString} from "../validation";

function FieldForm(props: { name: string; index: number; onCreate: (name: string) => void }) {
  const { name, index, onCreate } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { name: string }) => {
      // console.log('field values=', values);
      onCreate(values.name);
      pop();
    },
    [onCreate, pop]
  );

    const [nameError, setNameError] = useState<string | undefined>();
    const validateNameErrorFunc = validateNotEmptyString( setNameError);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={index < 0 ? "Create" : "Save"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
          id={"name"}
          title={"Name"}
          defaultValue={name}
          error={nameError}
          onChange={validateNameErrorFunc}
      />
    </Form>
  );
}

export default FieldForm;
