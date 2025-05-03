import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ContextFields } from "./utils/types";

export default function Command() {
  const [_, setContextText] = useCachedState("context-text", "");
  const [rememberContext, setRememberContext] = useCachedState("remember", true);
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: ContextFields) => {
              console.log("onSubmit", values);
              const { context } = values;
              if (context) {
                setContextText(context);
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="context"
        title="Context"
        autoFocus
        storeValue={rememberContext}
        placeholder="Put any extra code or context here."
      />
      <Form.Checkbox
        id="remember"
        label="Remember this context?"
        onChange={setRememberContext}
        value={rememberContext}
      />
    </Form>
  );
}
