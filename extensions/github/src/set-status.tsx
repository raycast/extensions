import { Action, ActionPanel, Form, Icon, Image, LaunchProps, showToast, Toast } from "@raycast/api";
import { useForm, useCachedPromise } from "@raycast/utils";
import emojis, { emoji } from "node-emoji";
import { useMemo } from "react";

import View from "./components/View";
import { getErrorMessage } from "./helpers/errors";
import { getGitHubClient } from "./helpers/withGithubClient";

type SetStatusValues = {
  emoji: string;
  message?: string;
  expiresAt: Date | null;
  limitedAvailability: boolean;
  organizationId?: string;
};

type SetStatusFormProps = {
  context?: Record<string, string>;
};

function SetStatusForm({ context }: SetStatusFormProps) {
  const { github } = getGitHubClient();

  const { data: viewer, mutate } = useCachedPromise(async () => {
    const result = await github.getViewer();
    return result.viewer;
  });

  async function clearStatus() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing status" });

    try {
      await github.changeUserStatus({
        emoji: "",
        message: "",
        limitedAvailability: false,
        expiresAt: null,
      });
      await mutate();

      toast.style = Toast.Style.Success;
      toast.title = "Cleared status";

      reset({
        emoji: "",
        message: "",
        limitedAvailability: false,
        expiresAt: null,
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing status";
      toast.message = getErrorMessage(error);
    }
  }

  const { handleSubmit, values, itemProps, reset, focus } = useForm<SetStatusValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Setting status" });

      try {
        const payload: Partial<SetStatusValues> = {};

        if (values.emoji) {
          payload.emoji = emojis.get(values.emoji);
        }

        if (values.message) {
          payload.message = values.message;
        }

        if (values.limitedAvailability) {
          payload.limitedAvailability = true;
        }

        if (values.expiresAt) {
          payload.expiresAt = values.expiresAt;
        }

        if (values.organizationId) {
          payload.organizationId = values.organizationId;
        }

        await github.changeUserStatus(payload);
        await mutate();

        toast.style = Toast.Style.Success;
        toast.title = "Set status";
        toast.message = `${values.emoji} ${values.message}`;

        reset({
          emoji: "",
          message: "",
          limitedAvailability: false,
          expiresAt: null,
          organizationId: "",
        });

        focus("emoji");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed setting status";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      emoji: context?.emoji || "",
      message: context ? decodeURIComponent(context.message.replace(/\+/g, "%20")) : "",
      limitedAvailability: context?.limitedAvailability === "true",
    },
  });

  const params = useMemo(() => {
    const params: Record<string, string> = {};

    if (values.emoji) {
      params.emoji = values.emoji;
    }

    if (values.message) {
      params.message = values.message;
    }

    if (values.limitedAvailability) {
      params.limitedAvailability = "true";
    }

    const searchParams = new URLSearchParams();

    const hasParams = Object.keys(params).length > 0;

    if (hasParams) {
      searchParams.append("context", JSON.stringify(params));
    }

    return searchParams;
  }, [values]);

  const entries = Object.entries(emoji);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Set Status" onSubmit={handleSubmit} />

          <Action icon={Icon.Minus} title="Clear Status" onAction={clearStatus} />

          <Action.CreateQuicklink
            quicklink={{
              name: "GitHub Status",
              link: "raycastinternal://extensions/raycast/github/set-status?" + params.toString(),
            }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      {viewer?.status?.message || viewer?.status?.emoji ? (
        <>
          <Form.Description
            title="Current Status"
            text={`${viewer.status.emoji ? viewer.status.emoji + " " : ""}${viewer.status.message || ""}`}
          />
          <Form.Separator />
        </>
      ) : null}

      <Form.Dropdown {...itemProps.emoji} title="Emoji" placeholder="Unicode emoji (e.g 🧑‍💻)">
        {entries.map(([key, value]) => {
          return <Form.Dropdown.Item key={key} value={key} title={key} icon={value} />;
        })}
      </Form.Dropdown>

      <Form.TextField {...itemProps.message} title="Message" placeholder="Coding" />

      <Form.Checkbox {...itemProps.limitedAvailability} label="Busy" />

      <Form.Separator />

      <Form.DatePicker {...itemProps.expiresAt} title="Expires At" />

      <Form.Dropdown {...itemProps.organizationId} title="Visible To">
        <Form.Dropdown.Item value="" title="Everyone" />

        {viewer?.organizations?.nodes?.map((organization) => {
          if (!organization) {
            return null;
          }

          return (
            <Form.Dropdown.Item
              key={organization.id}
              value={organization.id}
              icon={{ source: organization.avatarUrl, mask: Image.Mask.Circle }}
              title={organization.login}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <View>
      <SetStatusForm context={props.launchContext} />
    </View>
  );
}
