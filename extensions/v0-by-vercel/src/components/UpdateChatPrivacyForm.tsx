import { ActionPanel, Form, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";

interface UpdateChatPrivacyFormProps {
  chatId: string;
  currentPrivacy: "public" | "private" | "team" | "team-edit" | "unlisted";
  revalidateChats: () => void;
}

interface FormValues {
  privacy: "public" | "private" | "team" | "team-edit" | "unlisted";
}

export default function UpdateChatPrivacyForm({ chatId, currentPrivacy, revalidateChats }: UpdateChatPrivacyFormProps) {
  const { pop } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
          title: "Update Failed",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating chat privacy...",
      });

      try {
        await v0ApiFetcher(`https://api.v0.dev/v1/chats/${chatId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": activeProfileDefaultScope || "",
          },
          body: { privacy: values.privacy },
        });

        toast.style = Toast.Style.Success;
        toast.title = "Privacy Updated";
        toast.message = "Chat privacy updated successfully!";

        revalidateChats(); // Revalidate the main chat list
        pop(); // Go back to the chat list
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Update Failed" });
        } else {
          showFailureToast(`Failed to update chat privacy: ${error instanceof Error ? error.message : String(error)}`, {
            title: "Update Failed",
          });
        }
        throw error;
      }
    },
    validation: {
      privacy: (value) => {
        if (!value) {
          return "Privacy setting is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Privacy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingProfileDetails}
    >
      <Form.Dropdown
        id="privacy"
        title="Privacy"
        value={itemProps.privacy.value || currentPrivacy}
        onChange={(newValue) =>
          itemProps.privacy.onChange?.(newValue as "public" | "private" | "team" | "team-edit" | "unlisted")
        }
      >
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="team" title="Team" />
        <Form.Dropdown.Item value="team-edit" title="Team (Editable)" />
        <Form.Dropdown.Item value="unlisted" title="Unlisted" />
      </Form.Dropdown>
    </Form>
  );
}
