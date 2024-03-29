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
import { PURLCreateResponse } from "./common/types";
import { getPrefs } from "./common/prefs";

const purlURLRegex =
  /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

interface FormValues {
  name: string;
  url: string;
  listed: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function createPURL(values: FormValues): Promise<void> {
    setIsLoading(true);

    const response: PURLCreateResponse = await POST("purl", {
      name: values.name,
      url: values.url,
      listed: values.listed,
    });

    await showHUD(`Copied PURL to clipboard!`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    const prefs = getPrefs();
    await Clipboard.copy(`https://${prefs.username}.url.lol/${response.name}`);
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: createPURL,
    validation: {
      name: (value) => {
        if (!value) {
          return "Name is required";
        }
      },
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        if (purlURLRegex.test(value) === false) {
          return "Must be valid URL";
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
        title="Name"
        placeholder=""
        info={"Name at which this PURL will be accessible."}
        {...itemProps.name}
      />
      <Form.TextField
        title="URL"
        placeholder=""
        info={"URL to which this PURL will redirect."}
        {...itemProps.url}
      />
      <Form.Checkbox
        label="Listed"
        info={
          "Whether this PURL should be publicly listed in your PURLs. This does not prevent others from guessing the name and accessing the PURL."
        }
        {...itemProps.listed}
      />
    </Form>
  );
}
