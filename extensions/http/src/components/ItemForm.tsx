import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { Request } from "../types";
import {validateNotEmptyString} from "../validation";

function ItemForm(props: { item: Request; index: number; onCreate: (item: Request, index: number) => void }) {
  const { item, index, onCreate } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { name: string; method: string; url: string; headers: string; body: string }) => {
      item.Name = values.name;
      item.Method = values.method;
      item.URL = values.url;
      item.RequestHeaders = values.headers;
      item.RequestBody = values.body;
      onCreate(item, index);
      pop();
    },
    [onCreate, pop]
  );

  const [nameError, setNameError] = useState<string | undefined>();
  const validateNameErrorFunc = validateNotEmptyString( setNameError);

  const [urlError, setURLError] = useState<string | undefined>();
  const validateURLErrorFunc = validateNotEmptyString( setURLError);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={index < 0 ? "Create New Request" : "Save Request"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={item.Name}
        error={nameError}
        onChange={validateNameErrorFunc}
      />

      <Form.Dropdown id="method" title="Method" defaultValue={item.Method}>
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="POST" title="POST" />
      </Form.Dropdown>

      <Form.TextArea
        id="url"
        title="URL"
        defaultValue={item.URL}
        error={urlError}
        onChange={validateURLErrorFunc}
        info={"Supports placeholders for profiles: {key}"}
      />

      <Form.TextArea
        id="headers"
        title="Headers"
        placeholder={"Optional"}
        info={"<key>: <value>, one per line"}
        defaultValue={item.RequestHeaders}
      />

      <Form.TextArea id="body" title="Body" placeholder={"Optional"} defaultValue={item.RequestBody} />
    </Form>
  );
}

export default ItemForm;
