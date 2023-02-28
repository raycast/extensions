import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Clipboard
} from '@raycast/api';
import { authorize } from './oauth';
import View from './view';
import copy = Clipboard.copy;
import { submitInsight } from './productlane.api';

type Values = {
  email: string;
  text: string;
  state: string;
  painLevel: string;
};

function SubmitInsight() {
  async function handleSubmit(values: Values) {
    await authorize();

    const insight = await submitInsight(values);

    copy(`https://productlane.io/feedback/${insight.id}`);
    showToast({ title: "Submitted insight", message: "Copied insight URL to Clipboard" });
  }

  return (
    <Form navigationTitle={"Submit Insight"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea autoFocus={true} id="text" title="Feedback" placeholder="Enter multi-line text" />
      <Form.Separator />
      <Form.TextField id="email" title="E-mail" placeholder="Enter the submitter email" defaultValue={"raycast@email.com"} />
      <Form.Dropdown id="painLevel" title="Pain Level" defaultValue={"UNKNOWN"}>
        <Form.Dropdown.Item value="UNKNOWN" title="Unknown" />
        <Form.Dropdown.Item value="LOW" title="Low" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HIGH" title="High" />
      </Form.Dropdown>
      <Form.Dropdown id="state" title="State" defaultValue={"NEW"}>
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
  )
}
