import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  createSmartFolder,
  getRecoveryHint,
  getUserFacingErrorMessage,
} from "../lib/api";

interface SmartFolderFormProps {
  query: string;
}

export function SmartFolderForm({ query }: SmartFolderFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { name: string }) => {
    const name = values.name.trim();
    if (!name || isSubmitting) {
      if (!name) {
        await showToast({
          message: "Name the folder to save it.",
          style: Toast.Style.Failure,
          title: "Name required",
        });
      }
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating smart folder…",
    });
    try {
      await createSmartFolder({ name, query }, "interactive");
      toast.style = Toast.Style.Success;
      toast.title = "Smart folder created";
      toast.message = name;
      pop();
    } catch (error) {
      const hint = getRecoveryHint(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't create the folder";
      toast.message = hint
        ? `${getUserFacingErrorMessage(error)} ${hint}`
        : getUserFacingErrorMessage(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Folder}
            onSubmit={handleSubmit}
            title={isSubmitting ? "Creating…" : "Create Smart Folder"}
          />
        </ActionPanel>
      }
      navigationTitle="Save as Smart Folder"
    >
      <Form.TextField id="name" placeholder="Reading list" title="Name" />
      <Form.Description text={query} title="Search" />
    </Form>
  );
}
