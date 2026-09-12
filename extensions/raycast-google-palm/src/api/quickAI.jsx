import { Form, Detail, ActionPanel, Action } from "@raycast/api";
import { Toast, showToast } from "@raycast/api";
import { getSelectedText } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import PaLM from "palm-api";

export default (props, context, examples) => {
  const { query: argQuery } = props.arguments;
  const { apiKey } = getPreferenceValues();
  const [markdown, setMarkdown] = useState("");
  const [DOM, setDOM] = useState(<Detail markdown={markdown}></Detail>);

  const getResponse = async (query) => {
    setMarkdown("Please wait...");

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for PaLM...",
    });

    const start = Date.now();
    const bot = new PaLM(apiKey, { fetch });

    try {
      let response = await bot.ask(query, {
        examples: examples ?? [],
        temperature: context ? 0 : 0.7,
      });
      setMarkdown(response);
      await showToast({
        style: Toast.Style.Success,
        title: "Response Loaded",
        message: `Load finished in ${(Date.now() - start) / 1000} seconds.`,
      });
    } catch (e) {
      console.error(e);
      setMarkdown(
        "Could not access PaLM. This may be because PaLM has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response Failed",
      });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!context) {
          getResponse(`${argQuery}\n\n${await getSelectedText()}`);
        } else {
          getResponse(`${context ? `${context}\n\n` : ""}${argQuery ? argQuery : await getSelectedText()}`);
        }
        setDOM(<Detail markdown={markdown}></Detail>);
      } catch (e) {
        if (argQuery) {
          getResponse(`${context ? `${context}\n\n` : ""}${argQuery}`);
          setDOM(<Detail markdown={markdown}></Detail>);
        } else {
          setDOM(
            <Form
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    onSubmit={(values) => {
                      getResponse(`${context ? `${context}\n\n` : ""}${values.query}`);
                    }}
                  />
                </ActionPanel>
              }
            >
              <Form.TextField id="query" title="Query" />
            </Form>
          );
        }
      }
    })();
  }, []);

  useEffect(() => {
    setDOM(<Detail markdown={markdown}></Detail>);
  }, [markdown]);

  return DOM;
};
