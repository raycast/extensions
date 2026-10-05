import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

type PageType = "website" | "article" | "profile" | "book" | "music" | "video";

type FormValues = {
  title: string;
  description: string;
  url: string;
  image: string;
  pageType: PageType;
  siteName: string;
  author: string;
  twitterHandle: string;
};

const initialValues: FormValues = {
  title: "",
  description: "",
  url: "",
  image: "",
  pageType: "website",
  siteName: "",
  author: "",
  twitterHandle: "",
};

export default function Command() {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <MetaForm />;
}

function MetaForm() {
  const { push } = useNavigation();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [metaTags, setMetaTags] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");
  const canGenerate = Boolean(values.title.trim() && values.description.trim());
  const canCopy = Boolean(metaTags);
  const resultText = getResultText(metaTags, isProcessing, canGenerate);
  const titleCount = getCountText(values.title.length, TITLE_LIMIT);
  const descriptionCount = getCountText(
    values.description.length,
    DESCRIPTION_LIMIT,
  );
  const previewMarkdown = useMemo(
    () => getPreviewMarkdown(values, metaTags),
    [values, metaTags],
  );

  useEffect(() => {
    if (!canGenerate) {
      setMetaTags("");
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(async () => {
      try {
        const nextMetaTags = await runMeta(values);

        setMetaTags(nextMetaTags);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${JSON.stringify(values)}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not generate meta tags",
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [canGenerate, values]);

  async function copyMetaTags() {
    if (!canCopy) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title and description required",
      });
      return;
    }

    await Clipboard.copy(metaTags);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Meta Tags",
    });
  }

  return (
    <Form
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Meta Tags"
            onAction={copyMetaTags}
          />
          <Action
            icon={Icon.Eye}
            title="Show Preview"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() =>
              push(
                <Detail
                  markdown={previewMarkdown}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy Meta Tags"
                        onAction={copyMetaTags}
                      />
                    </ActionPanel>
                  }
                  metadata={
                    <Detail.Metadata>
                      <Detail.Metadata.Label title="Title" text={titleCount} />
                      <Detail.Metadata.Label
                        title="Description"
                        text={descriptionCount}
                      />
                      <Detail.Metadata.Label
                        title="Page Type"
                        text={getPageTypeLabel(values.pageType)}
                      />
                    </Detail.Metadata>
                  }
                />,
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title={`Title (${titleCount})`}
        placeholder="Page title"
        value={values.title}
        onChange={(title) =>
          setValues((currentValues) => ({
            ...currentValues,
            title,
          }))
        }
      />
      <Form.TextArea
        id="description"
        title={`Description (${descriptionCount})`}
        placeholder="Short page description"
        value={values.description}
        onChange={(description) =>
          setValues((currentValues) => ({
            ...currentValues,
            description,
          }))
        }
      />
      <Form.Separator />
      <Form.TextField
        id="url"
        title="Canonical URL"
        placeholder="https://example.com/page"
        value={values.url}
        onChange={(url) =>
          setValues((currentValues) => ({
            ...currentValues,
            url,
          }))
        }
      />
      <Form.TextField
        id="image"
        title="Preview Image URL"
        placeholder="https://example.com/image.png"
        value={values.image}
        onChange={(image) =>
          setValues((currentValues) => ({
            ...currentValues,
            image,
          }))
        }
      />
      <Form.Dropdown
        id="pageType"
        title="Page Type"
        value={values.pageType}
        onChange={(pageType) =>
          setValues((currentValues) => ({
            ...currentValues,
            pageType: pageType as PageType,
          }))
        }
      >
        <Form.Dropdown.Item title="Website" value="website" />
        <Form.Dropdown.Item title="Article" value="article" />
        <Form.Dropdown.Item title="Profile" value="profile" />
        <Form.Dropdown.Item title="Book" value="book" />
        <Form.Dropdown.Item title="Music" value="music" />
        <Form.Dropdown.Item title="Video" value="video" />
      </Form.Dropdown>
      <Form.TextField
        id="siteName"
        title="Site Name"
        placeholder="Example Site"
        value={values.siteName}
        onChange={(siteName) =>
          setValues((currentValues) => ({
            ...currentValues,
            siteName,
          }))
        }
      />
      <Form.TextField
        id="author"
        title="Author"
        placeholder="Author name"
        value={values.author}
        onChange={(author) =>
          setValues((currentValues) => ({
            ...currentValues,
            author,
          }))
        }
      />
      <Form.TextField
        id="twitterHandle"
        title="Twitter/X Handle"
        placeholder="@example"
        value={values.twitterHandle}
        onChange={(twitterHandle) =>
          setValues((currentValues) => ({
            ...currentValues,
            twitterHandle,
          }))
        }
      />
      <Form.Description title="Meta Tags" text={resultText} />
    </Form>
  );
}

async function runMeta(values: FormValues): Promise<string> {
  const args = [
    "meta",
    "--quiet",
    "--title",
    values.title,
    "--description",
    values.description,
    "--page-type",
    values.pageType,
  ];

  appendOption(args, "--url", values.url);
  appendOption(args, "--image", values.image);
  appendOption(args, "--site-name", values.siteName);
  appendOption(args, "--author", values.author);
  appendOption(args, "--twitter-handle", values.twitterHandle);

  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), args);

  return stdout.trimEnd();
}

function appendOption(args: string[], name: string, value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return;
  }

  args.push(name, trimmedValue);
}

function getResultText(
  metaTags: string,
  isProcessing: boolean,
  canGenerate: boolean,
): string {
  if (!canGenerate) {
    return "Enter a title and description to generate tags.";
  }

  if (isProcessing) {
    return metaTags ? `${metaTags}\n...` : "...";
  }

  return metaTags || " ";
}

function getCountText(count: number, limit: number): string {
  return `${count}/${limit}`;
}

function getPageTypeLabel(pageType: PageType): string {
  switch (pageType) {
    case "article":
      return "Article";
    case "profile":
      return "Profile";
    case "book":
      return "Book";
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "website":
      return "Website";
  }
}

function getPreviewMarkdown(values: FormValues, metaTags: string): string {
  const title = values.title.trim() || "Untitled page";
  const description =
    values.description.trim() || "Enter a description to preview metadata.";
  const siteName = values.siteName.trim();
  const url = values.url.trim();
  const image = values.image.trim();
  const author = values.author.trim();
  const twitterHandle = values.twitterHandle.trim();

  return `# ${escapeMarkdown(title)}

${image ? `![Preview image](${image})\n\n` : ""}
${escapeMarkdown(description)}

${siteName || url ? `**${escapeMarkdown(siteName || url)}**\n\n` : ""}${
    author ? `Author: ${escapeMarkdown(author)}\n\n` : ""
  }${twitterHandle ? `Twitter/X: ${escapeMarkdown(twitterHandle)}\n\n` : ""}## Generated Tags

\`\`\`html
${metaTags || "Enter a title and description to generate tags."}
\`\`\`
`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
