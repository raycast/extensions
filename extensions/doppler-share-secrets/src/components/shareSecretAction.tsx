import { Icon, showToast, Toast, Action, Clipboard } from "@raycast/api";
import { Body } from "../type";
import got from "got";

export default function ShareSecretAction() {
  async function handleSubmit(values: { secret: string; expireViews: number; expireDays: number }) {
    if (!values.secret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sharing secret" });

    try {
      const { body } = await got.post("https://api.doppler.com/v1/share/secrets/plain", {
        json: { secret: values.secret, expire_views: values.expireViews, expire_days: values.expireDays },
        responseType: "json",
      });

      await Clipboard.copy((body as Body).authenticated_url);

      toast.style = Toast.Style.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Share Secret" onSubmit={handleSubmit} />;
}
