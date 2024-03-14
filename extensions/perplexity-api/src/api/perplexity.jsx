import {
  Form,
  Detail,
  ActionPanel,
  Action,
  Toast,
  showToast,
  getSelectedText,
  getPreferenceValues,
  popToRoot,
  Keyboard,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default (props, { context = undefined, allowPaste = false, useSelected = false }) => {
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  let { query: argQuery } = props.arguments;
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const { apiKey, modelSelector } = getPreferenceValues();
  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");

  // cost per token
  let prompt_cost, completion_cost;
  switch (modelSelector) {
    case "pplx-7b-chat":
    case "mistral-7b-instruct":
      prompt_cost = 0.07 / 1_000_000;
      completion_cost = 0.28 / 1_000_000;
      break;
    case "mixtral-8x7b-instruct":
      prompt_cost = 0.14 / 1_000_000;
      completion_cost = 0.56 / 1_000_000;
      break;
    case "codellama-34b-instruct":
      prompt_cost = 0.35 / 1_000_000;
      completion_cost = 1.4 / 1_000_000;
      break;
    case "llama-2-70b-chat":
    case "codellama-70b-instruct":
    case "pplx-70b-chat":
      prompt_cost = 0.7 / 1_000_000;
      completion_cost = 2.8 / 1_000_000;
      break;
  }

  const getResponse = async (query) => {
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: `Waiting for '${modelSelector}'...`,
    });

    const start = Date.now();

    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelSelector,
        messages: [
          { role: "system", content: `Be precise.` },
          { role: "user", content: query },
        ],
        frequency_penalty: 1.2,
        temperature: 0.0,
        top_p: 0.9,
      }),
    };
    let jsonResponse = undefined;
    try {
      let response = await fetch("https://api.perplexity.ai/chat/completions", options);
      jsonResponse = await response.json();

      const content = jsonResponse.choices[0].message.content;
      const usage = jsonResponse.usage;
      const apiCosts = usage.prompt_tokens * prompt_cost + usage.completion_tokens * completion_cost; // compute costs

      setMarkdown(content);

      await showToast({
        style: Toast.Style.Success,
        title: "Done!",
        message: `${Number((Date.now() - start) / 1000).toFixed(1)}sec, I/O tok: ${usage.prompt_tokens} / ${usage.completion_tokens}, ${(apiCosts * 100).toFixed(4)}ct`,
      });
    } catch (e) {
      console.log(e);
      let errorMessage = jsonResponse
        ? jsonResponse.error
        : "Please try another prompt, and if it still does not work, create an issue on GitHub.";
      setMarkdown(
        `## Issue when accessing the API. \n\n ${errorMessage.message} \n\n Error-code: ${errorMessage.code} \n\n Error-type: ${errorMessage.type}`,
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response Failed",
        message: `${((Date.now() - start) / 1000).toFixed(1)} sec.`,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        if (!context && !useSelected && argQuery !== "") {
          getResponse(argQuery);
          return;
        }

        if (!context && !useSelected) {
          setPage(Pages.Form);
          return;
        }

        let selected = await getSelectedText();

        if (useSelected) {
          if (argQuery === "") {
            setSelected(selected);
            setPage(Pages.Form);
          } else if (context) {
            getResponse(`${context} \n\n comment: ${argQuery} \n\n Text: ${selected}`);
          } else {
            getResponse(`${argQuery} \n\n Text: ${selected}`);
          }
          return;
        }

        getResponse(`${context} \n\n Text: ${selected}`);
      } catch (e) {
        console.error(e);
        await popToRoot();
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not get the selected text",
        });
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
            icon={Icon.Stars}
            title="Submit Prompt"
            onSubmit={(values) => {
              if (values.query === "" || values.query === " ") {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Prompt is empty",
                });
                return;
              }
              setMarkdown("");

              if (useSelected) {
                getResponse(`${context} \n\n comment: ${values.query} \n\n Text: ${selectedState}`);
                return;
              }
              getResponse(values.query);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" id="query" placeholder="Explain what..." on />
    </Form>
  );
};
