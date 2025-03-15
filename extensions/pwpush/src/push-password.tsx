import { showToast, Toast, Clipboard, Form, ActionPanel, Action } from "@raycast/api";
import { got } from "got";

interface PushResponse {
  url_token: string;
  payload: string;
  expire_after_days: number;
  expire_after_views: number;
  expired: boolean;
  created_at: string;
  updated_at: string;
}

async function createPush(payload: string, expireViews: number, expireDays: number): Promise<PushResponse> {
  const response = await got.post("https://pwpush.com/p.json", {
    form: {
      "password[payload]": payload,
      "password[expire_after_days]": expireDays.toString(),
      "password[expire_after_views]": expireViews.toString(),
    },
    responseType: "json",
  });

  const data: PushResponse = response.body;
  const url = `https://pwpush.com/p/${data.url_token}`;
  await Clipboard.copy(url);
  await showToast({ title: "Secret URL Copied!", message: url, style: Toast.Style.Success });
  return data;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Push Password"
            onSubmit={async (values) => {
              await createPush(values.secret, parseInt(values.expireViews), parseInt(values.expireDays));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share…" />
      <Form.Dropdown defaultValue="5" id="expireViews" title="Expire After Views" storeValue>
        <Form.Dropdown.Item value="1" title="1 View" />
        <Form.Dropdown.Item value="2" title="2 Views" />
        <Form.Dropdown.Item value="3" title="3 Views" />
        <Form.Dropdown.Item value="5" title="5 Views" />
        <Form.Dropdown.Item value="10" title="10 Views" />
        <Form.Dropdown.Item value="20" title="20 Views" />
        <Form.Dropdown.Item value="50" title="50 Views" />
        <Form.Dropdown.Item value="-1" title="Unlimited Views" />
      </Form.Dropdown>
      <Form.Dropdown defaultValue="3" id="expireDays" title="Expire After Days" storeValue>
        <Form.Dropdown.Item value="1" title="1 Day" />
        <Form.Dropdown.Item value="2" title="2 Days" />
        <Form.Dropdown.Item value="3" title="3 Days" />
        <Form.Dropdown.Item value="7" title="1 Week" />
        <Form.Dropdown.Item value="14" title="2 Weeks" />
        <Form.Dropdown.Item value="30" title="1 Month" />
        <Form.Dropdown.Item value="90" title="3 Months" />
      </Form.Dropdown>
    </Form>
  );
}
