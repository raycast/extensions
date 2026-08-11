import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { isValidSpaceIcon } from "../utils/space-icon.util";

const userAndSpaceFields = ["myNickname", "myImage"] as const;
const spaceFields = ["name", "image", "description", "slackTeamId"] as const;

export type KeyToEdit = (typeof userAndSpaceFields)[number] | (typeof spaceFields)[number];

const FIELD_LABEL: Record<KeyToEdit, string> = {
  name: "Name",
  image: "Icon",
  description: "Description",
  slackTeamId: "Slack team ID",
  myNickname: "My nickname",
  myImage: "My image",
};

const FIELD_INFO: Partial<Record<KeyToEdit, string>> = {
  slackTeamId:
    "Open your Slack workspace in a browser; the team ID is the T... segment in the URL after app.slack.com/client/.",
};

const FIELD_PLACEHOLDER: Partial<Record<KeyToEdit, string>> = {
  slackTeamId: "T0XXXXXXXXX",
};

function Body(props: { spaceId: string; keyToEdit: KeyToEdit; value: string }) {
  const { spaceId, keyToEdit, value } = props;
  const [editingValue, setEditingValue] = useState(value);
  const [error, setError] = useState<string | undefined>(undefined);

  const { pop } = useNavigation();
  const update = trpc.space.update.useMutation();

  // image 필드는 이모지 1개 또는 URL만 허용. 다른 필드는 기존처럼 자유 입력.
  const isIconField = keyToEdit === "image" || keyToEdit === "myImage";

  const validate = (v: string): boolean => {
    if (!isIconField) {
      setError(undefined);
      return true;
    }
    if (!isValidSpaceIcon(v)) {
      setError("Enter a single emoji or a valid image URL");
      return false;
    }
    setError(undefined);
    return true;
  };

  function handleSubmit() {
    if (!validate(editingValue)) return;
    update.mutate(
      { spaceId, [keyToEdit]: editingValue },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Updated space",
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
          <Action.SubmitForm title="Update" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={FIELD_LABEL[keyToEdit]}
        placeholder={FIELD_PLACEHOLDER[keyToEdit]}
        info={FIELD_INFO[keyToEdit]}
        autoFocus
        value={editingValue}
        onChange={(v) => {
          setEditingValue(v);
          validate(v);
        }}
        error={error}
      />
    </Form>
  );
}

export const EditSpaceOneValueForm = (props: { spaceId: string; keyToEdit: KeyToEdit; value: string }) => {
  const { spaceId, keyToEdit, value } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} keyToEdit={keyToEdit} value={value} />
    </CachedQueryClientProvider>
  );
};
