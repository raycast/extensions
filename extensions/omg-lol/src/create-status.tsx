import {
  ActionPanel,
  Form,
  Action,
  showHUD,
  PopToRootType,
  Clipboard,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import * as unicodeEmoji from "unicode-emoji";

import { POST } from "./common/api";
import { StatusCreateResponse } from "./common/types";

interface FormValues {
  emoji: string;
  content: string;
  skip: boolean;
}

const emojis = unicodeEmoji.getEmojisGroupedBy("category");

const getCategoryName = (category: string): string => {
  const categoryNames: { [key: string]: string } = {
    "face-emotion": "Smileys & Emotion",
    symbols: "Symbols",
    "person-people": "People & Body",
    "animals-nature": "Animals & Nature",
    "food-drink": "Food & Drink",
    "travel-places": "Travel & Places",
    objects: "Objects",
    "activities-events": "Activities",
    flags: "Flags",
  };

  return categoryNames[category];
};

const getEmojis = (
  category: string,
): { emoji: string; description: string }[] => {
  return emojis[category as keyof typeof emojis];
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
          <Form.Dropdown.Section
            title={getCategoryName(category)}
            key={category}
          >
            {getEmojis(category).map(
              (emoji: { emoji: string; description: string }) => (
                <Form.Dropdown.Item
                  key={`${emoji.description}-${emoji.emoji}`}
                  value={emoji.emoji}
                  title={emoji.description}
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
