import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs";
import Gemini from "gemini-ai";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { getSafetySettings } from "./safetySettings";
import { useCommandHistory } from "./useCommandHistory";

export default (props, { context = undefined, allowPaste = false, useSelected = false, buffer = [] }) => {
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  let { query: argQuery } = props.arguments;
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const { apiKey, model, customModel } = getPreferenceValues();
  // set defaultModel to customModel if customModel is a non-empty string
  const isCustomModelValid = Boolean(customModel && customModel.trim().length > 0);
  const defaultModel = isCustomModelValid ? customModel : getPreferenceValues().defaultModel;
  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [textarea, setTextarea] = useState("");
  const { addToHistory } = useCommandHistory();

  const getResponse = async (query, data) => {
    setLastQuery(query);
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for Gemini...",
    });

    const start = Date.now();
    const gemini = new Gemini(apiKey, { fetch });

    try {
      let response = await gemini.ask(query, {
        model: model === "default" ? defaultModel : model,
        stream: (x) => {
          try {
            if (x !== undefined && x !== null) {
              setMarkdown((markdown) => markdown + x);
            }
          } catch (streamError) {
            console.error("Error in stream callback:", streamError);
            showToast({
              style: Toast.Style.Failure,
              title: "Response Failed",
              message: streamError.message, // Display the error message in the toast notification
            });
          }
        },
        data: data ?? buffer,
        safetySettings: getSafetySettings(),
      });
      setMarkdown(response);
      setLastResponse(response);

      // Add to history with model information
      const usedModel = model === "default" ? defaultModel : model;
      await addToHistory(query, response, usedModel);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      if (e.message.includes("429")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "You have been rate-limited.",
          message: "Please slow down.",
        });
        setMarkdown("## Could not access Gemini.\n\nYou have been rate limited. Please slow down and try again later.");
      } else if (e.message.includes("The model is overloaded")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Model Overloaded",
          message: "The model is currently overloaded. Please try again later.",
        });
        setMarkdown("## Could not access Gemini.\n\nThe model is currently overloaded. Please try again later.");
      } else {
        console.error(e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Response Failed",
          // message: `${(Date.now() - start) / 1000} seconds`,
          message: e.message, // Display the error message in the toast notification
        });
        setMarkdown(
          "## Could not access Gemini.\n\nThis may be because Gemini has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
        );
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (useSelected) {
        try {
          let selected = await getSelectedText();
          if (argQuery === "") {
            setSelected(selected);
            setPage(Pages.Form);
          } else {
            getResponse(`${context}\n${argQuery}\n${selected}`);
            return;
          }
          getResponse(`${context}\n${selected}`);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not get the selected text. Continue without it.",
          });
          getResponse(argQuery);
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
            <Action
              title="View History"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={async () => {
                await launchCommand({
                  name: "history",
                  type: LaunchType.UserInitiated,
                });
              }}
            />
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
          <Action
            icon={Icon.Clipboard}
            title="Append Selected Text"
            onAction={async () => {
              try {
                const selectedText = await getSelectedText();
                setTextarea((text) => text + selectedText);
              } catch (error) {
                await showToast({
                  title: "Could not get the selected text",
                  style: Toast.Style.Failure,
                });
              }
            }}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Prompt"
        id="query"
        value={textarea}
        onChange={(value) => setTextarea(value)}
        placeholder="Ask Gemini a question..."
      />
      {!buffer.length && (
        <>
          <Form.Description title="Image" text="Image that you want Gemini to analyze along with your prompt." />
          <Form.FilePicker id="files" title="" allowMultipleSelection={false} />
          <Form.Description text="Note that image data will not be carried over if you continue in Chat." />
        </>
      )}
    </Form>
  );
};
