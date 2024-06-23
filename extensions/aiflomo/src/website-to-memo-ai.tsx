import {
  AI,
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  BrowserExtension,
  openExtensionPreferences,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "cross-fetch";
import { useEffect, useState } from "react";

type FormValues = {
  browserTabId: string;
  memo: string;
  tags: string;
  model: AI.Model;
};

interface Preferences {
  api: string;
  defaultTags: string;
  defaultPrompt: string;
  defaultModel: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [formSubmitTitle, setFormSubmitTitle] = useState<string>("Summary By AI");
  const [tabs, setTabs] = useState<BrowserExtension.Tab[]>([]);
  useEffect(() => {
    BrowserExtension.getTabs().then((curTabs) => {
      setTabs(curTabs);
    });
  }, []);

  const {
    handleSubmit,
    itemProps,
    setValue: setFormValue,
    values: formValues,
  } = useForm<FormValues>({
    initialValues: {
      tags: preferences.defaultTags,
    },
    validation: {
      // memo: FormValidation.Required,
      tags: FormValidation.Required,
    },
    onSubmit: async (values) => {
      setFormSubmitTitle("Summarizing...");
      const browserContent = await BrowserExtension.getContent({
        format: "markdown",
        tabId: values.browserTabId ? +values.browserTabId : undefined,
      });
      const tabUrl = tabs.find((tab) => tab.id === +values.browserTabId)?.url;

      let allData = "";
      const answer = AI.ask(`Here's the browser content: ${browserContent}\n ${preferences.defaultPrompt}`, {
        creativity: "medium",
        model: values.model,
      });
      // Listen to "data" event to stream the answer
      answer.on("data", async (data) => {
        allData += data;
        if (allData.length % 50 === 0) {
          setFormValue("memo", allData);
        }
      });
      await answer;
      setFormValue("memo", allData + `\n\n[Source](${tabUrl})`);
      setFormSubmitTitle("ReSummarize?");

      showToast({
        style: Toast.Style.Success,
        title: "Summarized",
        message: "Browser content summarized",
      });
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={formSubmitTitle} onSubmit={handleSubmit} />
          <Action
            title="Send MEMO"
            onAction={() => {
              fetch(preferences.api, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json", // Specify the content type
                },
                body: JSON.stringify({ content: `${formValues.tags}\n${formValues.memo}` }),
              }).then(async (resp) => {
                if (resp.status !== 200) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: "Check that API MEMO URL is correct",
                  });
                }

                const respData = await resp.json();
                if (respData?.code === 0) {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Success",
                    message: "MEMO sent successfully",
                  });
                } else {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: JSON.stringify(respData),
                  });
                }
              });
            }}
          />
          <Action title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="model" defaultValue={preferences.defaultModel}>
        {Object.values(AI.Model).map((model) => {
          return <Form.Dropdown.Item key={model} title={model} value={model} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="browserTabId" title="browser tab" defaultValue={tabs.find((tab) => tab.active)?.id.toString()}>
        {tabs.map((tab) => {
          return <Form.Dropdown.Item key={tab.id} title={tab.title || tab.url} value={tab.id.toString()} />;
        })}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="memo" placeholder={`Waiting raycast ai`} {...itemProps.memo} />
      <Form.Separator />
      <Form.TextField title="tags" info="separated by space" {...itemProps.tags} />
    </Form>
  );
}
