import {
  showToast,
  Clipboard,
  Form,
  Action,
  ActionPanel,
  Toast,
  showHUD,
  closeMainWindow,
  Icon,
  getPreferenceValues,
  PopToRootType,
} from "@raycast/api";
import { createMaskedEmail } from "./utils";

type Preferences = {
  create_prefix: string;
};

type Values = {
  prefix: string;
  description: string;
};

export default () => {
  const preferences = getPreferenceValues<Preferences>();
  const handleSubmit = async (values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });
    try {
      const email = await createMaskedEmail(values.prefix, values.description);
      Clipboard.copy(email);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      await showHUD("🎉 Masked email address copied to clipboard");
    } catch (e) {
      if (e instanceof Error) {
        await toast.hide();
        showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Masked Email" icon={Icon.EyeDisabled} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="prefix"
        title="Prefix (Optional)"
        placeholder="Prefix to use for this email address"
        defaultValue={preferences.create_prefix}
        info={`This field is optional. If you have configured a default prefix in the preferences, it will be used here. If you leave this field empty, no prefix will be used.

A prefix must be <= 64 characters in length and only contain characters a-z, 0-9 and _ (underscore)`}
      />
      <Form.TextField
        id="description"
        title="Description (Optional)"
        placeholder="What is this masked email address for?"
        autoFocus={true}
      />
    </Form>
  );
};
