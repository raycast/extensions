import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon, open } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import View from "./components/view";
import { PrototypeCreate } from "./types/prototype";
import { createPrototype } from "./features/prototype/api/use-prototype";
import { getErrorMessage } from "./lib/errors";
import { client } from "./features/auth/api/oauth";

export default function CreatePrototypeCommand() {
  const { handleSubmit, itemProps, reset, setValidationError } = useForm<PrototypeCreate>({
    async onSubmit(values) {
      const prompt = values.prompt;
      if (!prompt) {
        setValidationError("prompt", "Prompt cannot be empty");
        return false;
      }
      if (prompt.trim().length < 20) {
        setValidationError("prompt", "Prompt must be at least 20 characters long");
        return false;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating prototype" });

      try {
        const { success, prototype } = await createPrototype({ prompt });

        if (success && prototype) {
          toast.style = Toast.Style.Success;
          toast.title = "Prototype created successfully";
          toast.primaryAction = {
            title: "Open Prototype",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(prototype.alloyUrl);
              await toast.hide();
            },
          };
          reset({
            prompt: "",
          });
          open(prototype.alloyUrl);
        } else {
          throw new Error("Failed to create prototype");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create prototype";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  return (
    <View>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Plus} title="Create Prototype" />
            <ActionPanel.Section>
              <Action
                title="Sign out of Alloy"
                icon={Icon.Logout}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await client.removeTokens();
                  await showToast({ style: Toast.Style.Success, title: "Signed out successfully" });
                  await popToRoot();
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        <Form.TextArea {...itemProps.prompt} title="Prompt" placeholder="Describe the prototype you want to create" />
      </Form>
    </View>
  );
}
