import { Form, ActionPanel, Action, showToast, Toast, open, getPreferenceValues, useNavigation } from "@raycast/api";
import React, { useState, useEffect, useRef } from "react";

interface Preferences {
  baseUrl: string;
}

export default function OpenMultipleTabs() {
  const { baseUrl: defaultBaseUrl } = getPreferenceValues<Preferences>();
  const [ids, setIds] = useState("");
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const idsRef = useRef<Form.TextArea>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    idsRef.current?.focus();
  }, []);

  const handleOpenTabs = async () => {
    const idsArray = ids.split(/[\s\n]+/).filter(Boolean);
    if (idsArray.length === 0) {
      await showToast(Toast.Style.Failure, "No id found", "Please enter at least 1 Id.");
      return;
    }

    for (const id of idsArray) {
      const url = `${baseUrl}${id}`;
      try {
        await open(url);
      } catch {
        await showToast(Toast.Style.Failure, "Error", "Can't open Url.");
        return;
      }
    }

    await showToast(Toast.Style.Success, "Urls openned succesfully", `${idsArray.length} tabs openned.`);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Open Urls in Browser" onAction={handleOpenTabs} />
        </ActionPanel>
      }
    >
      <Form.Description text="Concat an url with a list of Ids to open them in the browser. Ex : https://test.com/Id1, https://test.com/Id2, ..." />
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        placeholder="Enter Base Url here"
        value={baseUrl}
        onChange={(newValue) => setBaseUrl(newValue)}
      />
      <Form.TextArea
        id="ids"
        title="IDs"
        placeholder="Enter Ids separated by spaces or line breaks"
        value={ids}
        onChange={setIds}
        ref={idsRef}
      />
    </Form>
  );
}
