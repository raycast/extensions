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
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch-polyfill";
import Gemini from "gemini-ai";
import fs from "fs";

export default (props, context, allowPaste = false) => {
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  const { query: argQuery } = props.arguments;
  const { apiKey } = getPreferenceValues();
  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const getResponse = async (query, data) => {
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for Gemini...",
    });

    const start = Date.now();
    const gemini = new Gemini(apiKey, { fetch });

    try {
      await gemini.ask(query, {
        stream: (x) => {
          setMarkdown((markdown) => markdown + x);
        },
        data: data ?? [],
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access Gemini.\n\nThis may be because Gemini has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
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
      if (context) {
        try {
          let selected = await getSelectedText();
          getResponse(`${context}\n${selected}`);
        } catch (e) {
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
            <Action.CopyToClipboard content={markdown} />
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

              const files = values.files
                .filter((file) => fs.existsSync(file) && fs.lstatSync(file).isFile())
                .map((file) => fs.readFileSync(file));

              getResponse(`${context ? `${context}\n\n` : ""}${values.query}`, files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" id="query" />
      <Form.Description title="Files" text="Images that you want Gemini to analyze along with your prompt." />
      <Form.FilePicker id="files" title="" allowMultipleSelection={false} />
    </Form>
  );
};
