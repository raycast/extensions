import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FLAG_PATTERN, MAX_FLAG_BYTES, MAX_KEY_BYTES } from "../utils/constants";
import { appendFlagToAttribute } from "../utils/xattrHelper";

interface AttributeFlagEditorProps {
  filePath: string;
  attributeName: string;
  onComplete: () => void;
}

export default function AttributeFlagEditor({ filePath, attributeName, onComplete }: AttributeFlagEditorProps) {
  const navigation = useNavigation();

  const handleSubmit = async (values: { flag: string }) => {
    try {
      const flag = values.flag.trim().replace(/^#+/, "");
      const newName = `${attributeName}#${flag}`;
      if (!flag || !FLAG_PATTERN.test(flag) || Buffer.byteLength(flag, "utf8") > MAX_FLAG_BYTES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid flag",
          message: "Use up to 64 ASCII letters/digits/._-:",
        });
        return;
      }
      if (Buffer.byteLength(newName, "utf8") > MAX_KEY_BYTES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Name too long",
          message: "Resulting attribute name exceeds 255 bytes",
        });
        return;
      }

      const finalName = await appendFlagToAttribute(filePath, attributeName, flag);
      await showToast({
        style: Toast.Style.Success,
        title: "Flag added",
        message: `${attributeName} → ${finalName}`,
      });
      onComplete();
      navigation.pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add flag",
        message: String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle={filePath}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Flag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Attribute Name" text={`${attributeName}`} />
      <Form.TextField id="flag" title="Flag" placeholder="e.g. 008" />
    </Form>
  );
}
