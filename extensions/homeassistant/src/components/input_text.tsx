import { Icon, Color, Action, Form, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";
import { getErrorMessage } from "../utils";

function InputTextForm(props: { state: State }): JSX.Element {
  const s = props.state;
  const { pop } = useNavigation();
  const handle = async (input: Form.Values) => {
    try {
      const text: string = input.text;
      const min: number | undefined = s.attributes.min;
      const max: number | undefined = s.attributes.max;
      if (min !== undefined) {
        if (text.length < min) {
          throw Error(`Minimum text length is ${min}`);
        }
      }
      if (max !== undefined) {
        if (text.length > max) {
          throw Error(`Maximum text length is ${max}`);
        }
      }
      await ha.callService("input_text", "set_value", { entity_id: s.entity_id, value: text });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };
  const mode: string = s.attributes.mode || "text";
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handle} />
        </ActionPanel>
      }
    >
      {mode !== "password" && <Form.TextField id="text" title="Text" />}
      {mode === "password" && <Form.PasswordField id="text" title="Text" />}
    </Form>
  );
}

export function InputTextSetValueAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_text")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  return (
    <Action.Push
      title="Set Text"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputTextForm state={s} />}
    />
  );
}
