import {
  Form,
  Detail,
  ActionPanel,
  Action,
  Toast,
  showToast,
  getSelectedText,
  popToRoot,
  Keyboard,
  launchCommand,
  LaunchType,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch-polyfill";
import * as G4F from "g4f";
const g4f = new G4F.G4F();
import fs from "fs";

export default (props, { context = undefined, allowPaste = false, useSelected = false, buffer = [] }) => {
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  let { query: argQuery } = props.arguments;
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");

  const getResponse = async (query, data) => {
    setLastQuery(query);
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for GPT...",
    });

    const start = Date.now();

    try {
      console.log(query, data ?? buffer);
      const messages = [{ role: "user", content: query }];
      // load provider and model from preferences
      const preferences = getPreferenceValues();
      const providerString = preferences["gptProvider"];
      const [provider, model] = g4f_providers[providerString];
      const options = {
        provider: provider,
        model: model,
      };

      // generate response
      let response = await g4f.chatCompletion(messages, options);
      setMarkdown(response);
      setLastResponse(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access GPT.\n\nThis may be because GPT has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response Failed",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (context || useSelected) {
        try {
          let selected = await getSelectedText();
          if (useSelected) {
            if (argQuery === "") {
              setSelected(selected);
              setPage(Pages.Form);
            } else {
              getResponse(`${argQuery}\n${selected}`);
            }
            return;
          }
          getResponse(`${context}\n${selected}`);
        } catch (e) {
          console.error(e);
          await popToRoot();
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not get the selected text",
          });
        }
      } else {
        if (argQuery === "") {
          setPage(Pages.Form);
        } else {
          getResponse(argQuery);
        }
      }
    })();
  }, []);

  return page === Pages.Detail ? (
    <Detail
      actions={
        !isLoading && (
          <ActionPanel>
            {allowPaste && <Action.Paste content={markdown} />}
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
            {lastQuery && lastResponse && (
              <Action
                title="Continue in Chat"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
                onAction={async () => {
                  await launchCommand({
                    name: "aiChat",
                    type: LaunchType.UserInitiated,
                    context: { query: lastQuery, response: lastResponse, creationName: "" },
                  });
                }}
              />
            )}
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={markdown}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              setMarkdown("");

              let files = undefined;
              if (values.files) {
                files = values.files
                  .filter((file) => fs.existsSync(file) && fs.lstatSync(file).isFile())
                  .map((file) => fs.readFileSync(file));
              }

              if (useSelected) {
                getResponse(`${values.query}\n${selectedState}`, files);
                return;
              }
              getResponse(`${context ? `${context}\n\n` : ""}${values.query}`, files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" id="query" />
      {!buffer.length && (
        <>
          <Form.Description title="Image" text="Image that you want GPT to analyze along with your prompt." />
          <Form.FilePicker id="files" title="" allowMultipleSelection={false} />
          <Form.Description text="Note that image data will not be carried over if you continue in Chat." />
        </>
      )}
    </Form>
  );
};

export const g4f_providers = {
  GPT: [g4f.providers.GPT, "gpt-4"],
  Bing: [g4f.providers.Bing, "gpt-4"],
};
