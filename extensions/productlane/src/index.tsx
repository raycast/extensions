import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  copyTextToClipboard,
  Clipboard
} from '@raycast/api';
import { authorize } from './oauth';
import axios from 'axios';
import View from './view';
import copy = Clipboard.copy;

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

function SubmitInsight() {
  async function handleSubmit(values: Values) {
    const token = await authorize();
    const preferences = getPreferenceValues<{ apiKey: string }>();

    const laneKey = preferences.apiKey;

    const params = {
      params: {
        key: laneKey,
        linearToken: token
      }
    };

    const tokenData = await axios.post(`https://productlane.io/api/rpc/createAccessToken`, params, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const bearerToken = tokenData.data.result;
    const urlCreate = `https://productlane.io/api/rpc/createFeedback`;

    const paramsCreate = {
      params: {
        text: values.textfield,
        painLevel: 'UNKNOWN',
        state: 'NEW',
        email: 'notion@novu.co'
      }
    };

    const insight = await axios.post(urlCreate, paramsCreate, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    copy(`https://productlane.io/feedback/${insight.data.id}`);
    showToast({ title: "Submitted insight", message: "Copied insight URL to Clipboard" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form showcases all available form elements." />
      <Form.TextArea id="textarea" title="Feedback" placeholder="Enter multi-line text" />
      <Form.Separator />
      <Form.TextField id="textfield" title="E-mail" placeholder="Enter multi-line text" />
      <Form.Dropdown id="dropdown" title="Pain Level">
        <Form.Dropdown.Item value="dropdown-item" title="UNKNOWN" />
        <Form.Dropdown.Item value="dropdown-item" title="LOW" />
        <Form.Dropdown.Item value="dropdown-item" title="MEDIUM" />
        <Form.Dropdown.Item value="dropdown-item" title="HIGH" />
      </Form.Dropdown>
      <Form.Dropdown id="dropdownState" title="State">
        <Form.Dropdown.Item value="dropdown-item" title="NEW" />
        <Form.Dropdown.Item value="dropdown-item" title="PROCESSED" />
        <Form.Dropdown.Item value="dropdown-item" title="COMPLETED" />
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
