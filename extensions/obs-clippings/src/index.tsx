import { promises as fs } from "fs";
import {
  AI,
  Icon,
  Form,
  Action,
  ActionPanel,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

interface Preferences {
  // Must be the same name as set in manifest
  vault: string;
  aiPrompt: string;
}

interface FormValues {
  urlField: string;
  titleField: string;
  folderField: string;
  tagField: string;
  commentField: string;
}

export default function Command() {
  const description = "Markdown is **supported**";
  const [extractContent, setExtractContent] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  // Set error fields
  const [urlError, setUrlError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [folderError, setFolderError] = useState<string | undefined>();
  const [tagError, setTagError] = useState<string | undefined>();

  // Clear errors if there is a change
  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropFolderErrorIfNeeded() {
    if (folderError && folderError.length > 0) {
      setFolderError(undefined);
    }
  }

  function dropTagErrorIfNeeded() {
    if (tagError && tagError.length > 0) {
      setTagError(undefined);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      // Split tags into array and append "#" to each tag
      const tags = values.tagField
        .split(",")
        .map((tag) => `#${tag.trim()}`)
        .join(" ");

      let summaryContent = "";
      let pText = "";

      // Get HTML and Convert to markdown if enabled
      try {
        if (!extractContent) {
          const response = await fetch(values.urlField);
          const body = await response.text();
          const $ = cheerio.load(body);
          const pContent = $("p");
          const pTextArray: string[] = [];
          pContent.each(function () {
            pTextArray.push($(this).text() + "\n\n");
          });

          // Join the array elements into a single string with newlines
          pText = pTextArray.join("");

          if (!pText) {
            await showToast({
              style: Toast.Style.Failure,
              title: "AI",
              message: "No content found. Saving metadata..",
            });
            // Wait for 2 seconds before continuing
            await new Promise((resolve) => setTimeout(resolve, 2000));
            summaryContent = "No content to summarize. Usually this means there were no paragraph elements.";
            pText = "No content saved.";
          } else if (pText.length > 4096) {
            await showToast({
              style: Toast.Style.Failure,
              title: "AI",
              message: "Content too long. Saving..",
            });
            // Wait for 2 seconds before continuing
            await new Promise((resolve) => setTimeout(resolve, 2000));
            summaryContent = "Content too long to summarize. Maximum token limit exceeded.";
          } else {
            await showToast({
              style: Toast.Style.Animated,
              title: "AI",
              message: "Summarizing the article..",
            });
            // Ask AI to Summarize
            const askAI = await AI.ask(`${preferences.aiPrompt}${pText}`);

            // Ignore the Prompt in the Content
            summaryContent = askAI.replace(preferences.aiPrompt, "");
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AI",
          message: "An error occurred while summarizing the article.",
        });
        console.error(error);
      }
      // Grab form data and write markdown if enabled
      const formDataString =
        "> [!info] Details\n" +
        `> **Title:** ${values.titleField}\n` +
        `> **URL:** ${values.urlField}\n` +
        `> **Tags:** ${tags}\n\n` +
        "> [!documentation] Comments\n" +
        `${values.commentField}\n\n` +
        `> [!example] AI Summary\n\n\`\`\`\n${summaryContent}\n\`\`\`\n\n` + // Code Block
        "> [!abstract] Page Content\n\n" +
        `${pText}`;

      // Generate file name and folder path
      const fileName = `${preferences.vault}/${values.folderField}/${values.titleField}.md`;
      const folderPath = `${preferences.vault}/${values.folderField}`;

      // Create folder if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true });

      // Debug file creation
      await fs.writeFile(fileName, formDataString);
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Clipping created",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failure",
        message: "Couldn't create clipping",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Clipping" onSubmit={onSubmit} icon={Icon.Bookmark} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Cog} />
          <Action title="Adjust AI Prompt" onAction={openExtensionPreferences} icon={Icon.QuotationMarks} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="urlField"
        title="URL"
        placeholder="Enter URL"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={async (event) => {
          const url = String(event.target.value);
          const urlRegex = /^(https?):\/\/[^\s/$.?#].[^\s]*$/i;
          if (!url) {
            setUrlError("Field is empty.");
          } else if (!urlRegex.test(url)) {
            setUrlError("Invalid URL");
          } else if (!url.startsWith("https://")) {
            setUrlError("Requires Full URL");
          } else {
            // Make a request to the URL
            try {
              const response = await fetch(url);
              if (response.status >= 200 && response.status < 300) {
                dropUrlErrorIfNeeded();
              } else {
                setUrlError("URL does not exist.");
              }
            } catch (error) {
              setUrlError("Failed to fetch URL.");
            }
          }
        }}
      />
      <Form.TextField
        id="titleField"
        title="Title"
        placeholder="Enter Clipping Title"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          const title = String(event.target.value);
          if (!title) {
            setTitleError("Field is empty.");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="folderField"
        title="Sub-Folder"
        placeholder="Enter Sub-Folder"
        info="The clippings sub-folder"
        error={folderError}
        onChange={dropFolderErrorIfNeeded}
        onBlur={(event) => {
          const folder = String(event.target.value);
          if (!folder) {
            setFolderError("Field is empty.");
          } else {
            dropFolderErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="tagField"
        title="Tag(s)"
        placeholder="Enter Tag(s)"
        info="Must be comma separated"
        error={tagError}
        onChange={dropTagErrorIfNeeded}
        onBlur={(event) => {
          const tag = String(event.target.value);
          const numTags = tag.split(" ");
          if (!tag) {
            setTagError("Field is empty.");
          } else if (numTags.length > 1 && !tag.includes(",")) {
            setTagError("Separate with commas.");
          } else {
            dropTagErrorIfNeeded();
          }
        }}
      />
      <Form.TextArea id="commentField" title="Comment(s)" placeholder={description} enableMarkdown />
      <Form.Checkbox
        id="extractContent"
        label="Extract Content and Summarize with AI"
        info="You can adjust the AI prompt in Actions"
        defaultValue={extractContent}
        onChange={() => setExtractContent(!extractContent)}
      />
    </Form>
  );
}
