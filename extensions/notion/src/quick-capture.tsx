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
  Icon,
} from "@raycast/api";
import { useForm, withAccessToken } from "@raycast/utils";
import { parseHTML } from "linkedom";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

import { useSearchPages } from "./hooks";
import {
  appendToPage,
  createDatabasePage,
  fetchDatabase,
  fetchPage,
  getPageIcon,
  getPageName,
  Page,
  PageContent,
} from "./utils/notion";
import { notionService } from "./utils/notion/oauth";
import { Quicklink } from "./utils/types";

type QuickCaptureFormValues = {
  url: string;
  captureAs: string;
  page: string;
};

type LaunchContext = {
  defaults?: {
    captureAs?: string;
    pageId?: string;
    objectType?: Page["object"];
  };
};

type QuickCaptureProps = {
  launchContext?: LaunchContext;
};

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
    console.error(error);
  }
};

function validateUrl(input: string) {
  const urlPattern = new RegExp(
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,
    "i",
  );

  return urlPattern.test(input);
}

function getSummaryPrompt(content: string) {
  return `Summarize the page content surrounded by triple quotes. Please use the following template:

# {Heading of the page}

{Summary of the content describing what the page is about. Break it down in multiple paragraphs if necessary.}

Here's the content:
"""
${content}
"""`;
}

function QuickCapture({ launchContext }: QuickCaptureProps) {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading } = useSearchPages(searchText);

  const searchPages = data?.pages;

  const { itemProps, handleSubmit, setValue } = useForm<QuickCaptureFormValues>({
    initialValues: {
      captureAs: launchContext?.defaults?.captureAs,
    },
    async onSubmit(values) {
      try {
        await closeMainWindow();

        await showToast({ style: Toast.Style.Animated, title: "Capturing content to page" });

        const pageDetail = await getPageDetail(values.url);
        const pageLink = pageDetail ? `[${pageDetail.title}](${values.url})` : values.url;

        let content: PageContent;

        switch (values.captureAs) {
          case "url": {
            content = [{ type: "bookmark", bookmark: { url: values.url } }];
            break;
          }

          case "full": {
            content = pageLink;
            if (pageDetail) content += `\n\n${pageDetail.content}`;
            break;
          }

          case "ai": {
            content = pageLink;
            if (pageDetail) {
              const summary = await AI.ask(getSummaryPrompt(pageDetail.content));
              content += `\n\n${summary}`;
            }
            break;
          }

          default: {
            content = pageLink;
          }
        }

        let selectedPage: Page | undefined;

        if (launchContext?.defaults?.pageId) {
          const { pageId, objectType = "page" } = launchContext.defaults;
          selectedPage = objectType === "page" ? await fetchPage(pageId) : await fetchDatabase(pageId);
        } else {
          selectedPage = searchPages?.find((page) => page.id === values.page);
        }

        if (!selectedPage) {
          await showToast({ style: Toast.Style.Failure, title: "Could not find page" });
          return;
        }

        if (selectedPage.object === "page") {
          await appendToPage(selectedPage.id, { content });
        }

        if (selectedPage.object === "database") {
          await createDatabasePage({
            database: selectedPage.id,
            content,
            "property::title::title": pageDetail?.title,
          });
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
      let text: string | undefined;

      try {
        text = await getSelectedText();
      } catch (error) {
        console.error(error);
      }

      if (!text) {
        try {
          text = await Clipboard.readText();
        } catch (error) {
          console.error(error);
        }
      }

      if (text && validateUrl(text)) {
        setValue("url", text.trim());
      }
    }

    getText();
  }, []);

  function getQuicklink(): Quicklink {
    const url = "raycast://extensions/notion/notion/quick-capture";
    const page = searchPages?.find((page) => page.id === itemProps.page.value);
    const launchContext: LaunchContext = {
      defaults: {
        captureAs: itemProps.captureAs.value,
        pageId: page?.id,
        objectType: page?.object,
      },
    };

    return {
      name: page ? `Quick capture to ${getPageName(page)}` : "Quick capture",
      link: url + "?launchContext=" + encodeURIComponent(JSON.stringify(launchContext)),
    };
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Capture" icon={Icon.SaveDocument} />
          <Action.CreateQuicklink title="Create Quicklink" quicklink={getQuicklink()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        {...itemProps.url}
        info="Quick tip for future usage: You can either select a URL or copy one to your clipboard to fill this field when launching the command."
      />

      <Form.Dropdown {...itemProps.captureAs} title="Capture As" storeValue>
        <Form.Dropdown.Item title="Bookmark" value="url" icon={Icon.Link} />
        <Form.Dropdown.Item title="Full Page" value="full" icon={Icon.Paragraph} />
        <Form.Dropdown.Item title="Summarize Page with AI" value="ai" icon={Icon.Stars} />
      </Form.Dropdown>

      {/*
        When a default page/database is specified in the LaunchContext, we will fetch it directly instead
        of adding an option for it in the dropdown
      */}
      {launchContext?.defaults?.pageId ? null : (
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
      )}
    </Form>
  );
}

export default withAccessToken(notionService)(QuickCapture);
