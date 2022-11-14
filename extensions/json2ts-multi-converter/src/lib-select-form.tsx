import { Action, ActionPanel, Form, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { Library } from "./types";

export default () => {
  const [lib, setLib] = useCachedState<string>("lib");
  const nav = useNavigation();
  const form = useForm<{ lib: Library | string }>({
    initialValues: {
      lib,
    },
    validation: {
      lib: FormValidation.Required,
    },
    onSubmit: async (values) => {
      console.log({ values });
      setLib(values.lib);
      showToast({ title: `Change library`, message: values.lib });
      nav.pop();
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={form.handleSubmit} title="Save" />
        </ActionPanel>
      }
    >
      <Form.Dropdown key="lib" title="Convert library" {...form.itemProps.lib}>
        <Form.Dropdown.Item title="json2ts" value={Library.JSON_2_TS} />
        <Form.Dropdown.Item title="json-ts" value={Library.JSON_TS} />
        <Form.Dropdown.Item title="json2ts.com API" value={Library.JSON2TS_COM_API} />
      </Form.Dropdown>
    </Form>
  );
};
