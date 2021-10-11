import {
  ActionPanel,
  copyTextToClipboard,
  Form,
  Icon,
  OpenInBrowserAction,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle,
} from "@raycast/api";
import got from "got";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction />
          <OpenInBrowserAction url="https://share.doppler.com" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share..." />
      <Form.Dropdown id="expireViews" title="Expire After Views" storeValue>
        <Form.Dropdown.Item value="1" title="1 View" />
        <Form.Dropdown.Item value="2" title="2 Views" />
        <Form.Dropdown.Item value="3" title="3 Views" />
        <Form.Dropdown.Item value="5" title="5 Views" />
        <Form.Dropdown.Item value="10" title="10 Views" />
        <Form.Dropdown.Item value="20" title="20 Views" />
        <Form.Dropdown.Item value="50" title="50 Views" />
        <Form.Dropdown.Item value="-1" title="Unlimited Views" />
      </Form.Dropdown>
      <Form.Dropdown id="expireDays" title="Expire After Days" storeValue>
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

function ShareSecretAction() {
  async function handleSubmit(values: { secret: string; expireViews: number; expireDays: number }) {
    if (!values.secret) {
      showToast(ToastStyle.Failure, "Secret is required");
      return;
    }

    const toast = new Toast({ style: ToastStyle.Animated, title: "Sharing secret" });
    await toast.show();

    try {
      const { body } = await got.post("https://api.doppler.com/v1/share/secrets/plain", {
        json: { secret: values.secret, expire_views: values.expireViews, expire_days: values.expireDays },
        responseType: "json",
      });

      await copyTextToClipboard((body as any).authenticated_url);

      toast.style = ToastStyle.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return <SubmitFormAction icon={Icon.Upload} title="Share Secret" onSubmit={handleSubmit} />;
}
