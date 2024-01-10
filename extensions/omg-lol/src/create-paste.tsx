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

import { POST } from "./common/api";
import { PasteCreateResponse } from "./common/types";
import { getPrefs } from "./common/prefs";

const pasteTitleRegex = /^[a-zA-Z0-9-_.]+$/;

interface FormValues {
  title: string;
  content: string;
  listed: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function createPaste(values: FormValues): Promise<void> {
    setIsLoading(true);

    const response: PasteCreateResponse = await POST("pastebin", {
      title: values.title,
      content: values.content,
      listed: values.listed ? "on" : null,
    });

    await showHUD(`Copied URL to clipboard!`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    const prefs = getPrefs();
    await Clipboard.copy(
      `https://paste.lol/${prefs.username}/${response.title}`,
    );
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: createPaste,
    validation: {
      title: (value) => {
        if (!value) {
          return "Title is required";
        }
        if (pasteTitleRegex.test(value) === false) {
          return "A-Z, a-z, 0-9, -, _, .";
        }
      },
      content: (value) => {
        if (!value) {
          return "Content is required";
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
      <Form.TextField
        title="Title"
        placeholder=""
        info={
          "Slug by which this paste will be accessible. Alphanumeric, with dashes, underscores, and periods."
        }
        {...itemProps.title}
      />
      <Form.TextArea
        title="Content"
        placeholder=""
        info={"Text content of the paste"}
        {...itemProps.content}
      />
      <Form.Checkbox
        label="Listed"
        info={
          "Whether this paste should be publicly listed on your pastebin. This does not prevent others from guessing the title and accessing the paste."
        }
        {...itemProps.listed}
      />
    </Form>
  );
}
