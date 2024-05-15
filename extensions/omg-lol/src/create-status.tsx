import {
  ActionPanel,
  Form,
  Action,
  showHUD,
  PopToRootType,
  Clipboard,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import React, { useState } from "react";
import emojis from "./common/emoji";
import { Emojis, Emoji } from "./common/emoji";

import { POST } from "./common/api";
import { StatusCreateResponse } from "./common/types";

interface FormValues {
  emoji: string;
  content: string;
  skip: boolean;
}

const getCategoryEmojis = (category: string): Emoji[] => {
  return emojis[category as keyof Emojis];
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function createStatus(values: FormValues): Promise<void> {
    setIsLoading(true);

    const response: StatusCreateResponse = await POST("statuses", {
      emoji: values.emoji === "" ? null : values.emoji,
      content: values.content,
      skip_mastodon_post: !values.skip,
    });

    await showHUD(`Copied status URL to clipboard!`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    await Clipboard.copy(response.url);
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: createStatus,
    validation: {
      content: (value) => {
        if (!value) {
          return "Status is required";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="emoji" title="Emoji">
        <Form.Dropdown.Item value="" title="Default Emoji" icon="✨" />
        {Object.keys(emojis).map((category: string) => (
          <Form.Dropdown.Section title={category} key={category}>
            {getCategoryEmojis(category).map(
              (emoji: { emoji: string; name: string }) => (
                <Form.Dropdown.Item
                  key={`${emoji.name}-${emoji.emoji}`}
                  value={emoji.emoji}
                  title={emoji.name}
                  icon={emoji.emoji}
                />
              ),
            )}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Status"
        placeholder=""
        info={"The content of your status update"}
        {...itemProps.content}
      />
      <Form.Checkbox
        id="skip"
        label="Post to Mastodon"
        info={"Whether this status should be posted to Mastodon or not."}
        defaultValue={true}
      />
    </Form>
  );
}
