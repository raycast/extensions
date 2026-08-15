import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useRef, useState } from "react";
import { isValidSpaceIcon } from "../utils/space-icon.util";

interface FormValues {
  name: string;
  image: string;
  description: string;
  slackTeamId: string;
}

function Body() {
  const textFieldRef = useRef<Form.TextField>(null);
  const textAreaRef = useRef<Form.TextArea>(null);
  const [imageError, setImageError] = useState<string | undefined>(undefined);

  const { pop } = useNavigation();
  const create = trpc.space.create.useMutation();

  const validateImage = (value: string | undefined) => {
    const v = value ?? "";
    if (!isValidSpaceIcon(v)) {
      setImageError("Enter a single emoji or a valid image URL");
      return false;
    }
    setImageError(undefined);
    return true;
  };

  function handleSubmit(form: FormValues) {
    if (!validateImage(form.image)) return;
    create.mutate(
      {
        name: form.name,
        image: form.image,
        description: form.description,
        slackTeamId: form.slackTeamId?.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Space created",
          });
          pop();
        },
      },
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" ref={textFieldRef} />
      <Form.TextField
        id="image"
        title="Icon"
        placeholder="🚀 or https://..."
        info="Enter a single emoji (rendered via Twemoji) or an image URL."
        error={imageError}
        onChange={validateImage}
      />
      <Form.TextArea id="description" title="Description" ref={textAreaRef} />
      <Form.TextField
        id="slackTeamId"
        title="Slack team ID"
        placeholder="T0XXXXXXXXX"
        info="Open your Slack workspace in a browser; the team ID is the T... segment in the URL after app.slack.com/client/."
      />
    </Form>
  );
}

export const NewSpaceForm = () => {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
};
