import { Readability } from "@mozilla/readability";
import {
  ActionPanel,
  Action,
  Form,
  Clipboard,
  getSelectedText,
  showToast,
  Toast,
  closeMainWindow,
  AI,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { parseHTML } from "linkedom";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

import { useSearchPages } from "./hooks";
import { appendToPage, createDatabasePage, getPageIcon } from "./utils/notion";

const getPageDetail = async (url: string) => {
  try {
    const response = await fetch(url);
    const data = await response.text();
    const { document } = parseHTML(data);
    const reader = new Readability(document);
    const parsedDocument = reader.parse();
    const content = parsedDocument?.textContent;
    return { title: document.title, content: content ?? "" };
  } catch (error) {
    console.log(error);
  }
};

function validateUrl(input: string) {
  const urlPattern = new RegExp(
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,
    "i",
  );

  return urlPattern.test(input);
}

export default function QuickCapture() {
  const [searchText, setSearchText] = useState<string>("");

  const { data: searchPages, isLoading } = useSearchPages(searchText);

  const { itemProps, handleSubmit, setValue } = useForm<{
    url: string;
    captureAs: string;
    page: string;
  }>({
    async onSubmit(values) {
      try {
        await closeMainWindow();

        await showToast({ style: Toast.Style.Animated, title: "Capturing content to page" });

        const result = await getPageDetail(values.url);
        const url = result ? `[${result.title}](${values.url})` : values.url;
        let content = url;

        if (result && values.captureAs === "full") {
          content += `\n\n${result?.content}`;
        }

        if (result && values.captureAs === "ai") {
          const summary = await AI.ask(
            `Summarize the content surrounded by triple quotes. Give it a heading. Format the output as a Markdown.\n\n"""${result?.content}"""`,
          );

          content += `\n\n${summary}`;
        }

        const selectedPage = searchPages?.find((page) => page.id === values.page);

        if (selectedPage?.object === "page") {
          await appendToPage(selectedPage.id, { content });
        }

        if (selectedPage?.object === "database") {
          await createDatabasePage({ database: selectedPage.id, content, "property::title::title": result?.title });
        }

        await showToast({ style: Toast.Style.Success, title: "Captured content to page" });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed capturing content to page" });
      }
    },
    validation: {
      url: (input) => {
        if (!input) return "The URL is required";
        if (!validateUrl(input)) return "The URL is not valid";
      },
    },
  });

  useEffect(() => {
    async function getText() {
      try {
        const text = (await getSelectedText()) || (await Clipboard.readText());
        if (text && validateUrl(text)) {
          setValue("url", text);
        }
      } catch (error) {
        console.error(error);
      }
    }

    getText();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Capture" />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        {...itemProps.url}
        info="Quick tip for future usage: You can either select a URL or copy one to your clipboard to fill this field when launching the command."
      />

      <Form.Dropdown {...itemProps.captureAs} title="Capture As" storeValue>
        <Form.Dropdown.Item title="Bookmark" value="url" />
        <Form.Dropdown.Item title="Full Page" value="full" />
        <Form.Dropdown.Item title="Summarize Page with AI" value="ai" />
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.page}
        title="Notion Page"
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        storeValue
      >
        {searchPages?.map((page) => {
          return (
            <Form.Dropdown.Item
              key={page.id}
              title={page.title || "Untitled"}
              value={page.id}
              icon={getPageIcon(page)}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
