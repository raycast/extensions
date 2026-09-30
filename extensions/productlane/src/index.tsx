import { Form, ActionPanel, Action, showToast, Clipboard, getPreferenceValues, Toast, open } from "@raycast/api";
import { authorize } from "./oauth";
import View from "./view";
import { CreateInsightInput, submitInsight } from "./productlane.api";
import { useForm, FormValidation } from "@raycast/utils";

type Preferences = {
  email: string;
};

type Values = {
  email: string;
  text: string;
  state: string;
  painLevel: string;
};

function SubmitInsight() {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps, reset } = useForm<Values>({
    async onSubmit(values: Values) {
      await authorize();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting insight",
      });

      const insight = await submitInsight(values as CreateInsightInput);
      const feedbackUrl = `https://productlane.com/feedback/${insight.id}`;
      Clipboard.copy(feedbackUrl);

      reset({ text: "", email: preferences.email, painLevel: "UNKNOWN", state: "NEW" });
      toast.title = "Submitted insight";
      toast.style = Toast.Style.Success;
      toast.message = "Copied insight URL to Clipboard";
      toast.primaryAction = {
        title: "Open Insight",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: async () => {
          open(feedbackUrl);
          await toast.hide();
        },
      };
    },
    validation: {
      text: FormValidation.Required,
    },
    initialValues: {
      email: preferences.email,
      painLevel: "UNKNOWN",
      state: "NEW",
    },
  });

  return (
    <Form
      navigationTitle={"Submit Insight"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea autoFocus={true} title="Feedback" placeholder="Enter multi-line text" {...itemProps.text} />
      <Form.Separator />
      <Form.TextField title="E-mail" placeholder="Enter the submitter email" {...itemProps.email} />
      <Form.Dropdown title="Pain Level" {...itemProps.painLevel}>
        <Form.Dropdown.Item value="UNKNOWN" title="Unknown" />
        <Form.Dropdown.Item value="LOW" title="Low" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HIGH" title="High" />
      </Form.Dropdown>
      <Form.Dropdown title="State" {...itemProps.state}>
        <Form.Dropdown.Item value="NEW" title="New" />
        <Form.Dropdown.Item value="PROCESSED" title="Processed" />
        <Form.Dropdown.Item value="COMPLETED" title="Completed" />
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return (
    <View>
      <SubmitInsight />
    </View>
  );
}
