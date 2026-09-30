import {
  Action,
  ActionPanel,
  BrowserExtension,
  Detail,
  Form,
  Grid,
  Icon,
  List,
  Color,
  environment,
  getPreferenceValues,
  getApplications,
  launchCommand,
  LaunchType,
  open,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  addFilter,
  extractBaseDomainFromUrl,
  extractDomainFromUrl,
  getFiltersForDomain,
  parseCssSelectors,
  resetAllSkillsForDomain,
  resetCoverSkillsForDomain,
  resetFilterSkillsForDomain,
} from "./filters";
import { buildEpubBuffer, EpubResource } from "./epub";
import crypto from "crypto";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { sendEpubByEmail } from "./email";
import { SetupDeliveryModeForm } from "./setup-delivery-mode";
import { resolveSendPreferences, shouldShowSetupScreen } from "./settings";
import { addToHistory } from "./history-storage";

type ViewState = {
  isLoading: boolean;
  title: string;
  markdownBody: string;
  author: string;
  skillDomain: string;
  pageUrl: string;
  sourceHtml: string;
  coverSelectors: string[];
  readabilityHtml: string;
  contentFilters: string[];
};

type ArticleData = Omit<ViewState, "isLoading">;

type CoverSelectionMethod = "css-selector" | "first-image";

type EpubPreviewMetadata = {
  domain: string;
  coverMethodLabel: string;
  coverStatusLabel: string;
  coverThumbnail?: string;
  coverPreviewThumbnail?: string;
};

type CoverImageCandidate = {
  selector: string;
  previewDataUrl: string;
  sourceUrl: string;
  width: number;
  height: number;
};

type SendToKindleCommandProps = {
  autoSend?: boolean;
};

export default async function Command() {
  const preferences = await resolveSendPreferences();
  if (shouldShowSetupScreen(preferences)) {
    await launchCommand({ name: "set-change-sending-method", type: LaunchType.UserInitiated });
    return;
  }

  try {
    const article = await loadArticle();
    await sendArticle(article, { direct: true });
    await addToHistory({
      title: article.title,
      url: article.pageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to send",
      message,
    });
  }
}

export function SendToKindleCommand({ autoSend = false }: SendToKindleCommandProps) {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ViewState>({
    isLoading: true,
    title: "Reading",
    markdownBody: "",
    author: "",
    skillDomain: "",
    pageUrl: "",
    sourceHtml: "",
    coverSelectors: [],
    readabilityHtml: "",
    contentFilters: [],
  });
  const [epubPreviewMetadata, setEpubPreviewMetadata] = useState<EpubPreviewMetadata>({
    domain: "",
    coverMethodLabel: "Analyzing...",
    coverStatusLabel: "Checking image...",
  });

  useEffect(() => {
    let isMounted = true;

    async function checkSetupRequirement() {
      const preferences = await resolveSendPreferences();
      if (!isMounted) return;
      setNeedsOnboarding(shouldShowSetupScreen(preferences));
    }

    checkSetupRequirement();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (needsOnboarding !== false) return;

    let isMounted = true;

    async function run() {
      try {
        const article = await loadArticle();
        if (!isMounted) return;
        setState({
          isLoading: false,
          ...article,
        });
        if (autoSend) {
          await sendArticle(article, { direct: true });
          await addToHistory({
            title: article.title,
            url: article.pageUrl,
          });
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to load page",
          message,
        });
        setState({
          isLoading: false,
          title: "Error",
          markdownBody: message,
          author: "",
          skillDomain: "",
          pageUrl: "",
          sourceHtml: "",
          coverSelectors: [],
          readabilityHtml: "",
          contentFilters: [],
        });
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [autoSend, needsOnboarding, version]);

  useEffect(() => {
    if (needsOnboarding !== false || state.isLoading) return;

    let isMounted = true;
    const domain =
      state.author || extractBaseDomainFromUrl(state.pageUrl) || extractDomainFromUrl(state.pageUrl) || "Unknown";
    setEpubPreviewMetadata((previous) => ({
      ...previous,
      domain,
      coverMethodLabel: "Analyzing...",
      coverStatusLabel: "Checking image...",
      coverThumbnail: undefined,
    }));

    async function loadEpubPreviewMetadata() {
      const preview = await buildEpubPreviewMetadata(state);
      if (!isMounted) return;
      setEpubPreviewMetadata(preview);
    }

    loadEpubPreviewMetadata().catch(() => {
      if (!isMounted) return;
      setEpubPreviewMetadata({
        domain,
        coverMethodLabel: "Unavailable",
        coverStatusLabel: "Unable to compute cover preview.",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [
    needsOnboarding,
    state.author,
    state.coverSelectors,
    state.isLoading,
    state.markdownBody,
    state.pageUrl,
    state.sourceHtml,
  ]);

  if (needsOnboarding === null) {
    return <Detail isLoading markdown="Loading setup..." navigationTitle="Send to Kindle" />;
  }

  if (needsOnboarding) {
    return <SetupDeliveryModeForm onCompleted={() => setNeedsOnboarding(false)} />;
  }

  async function handleSend() {
    try {
      await sendArticle(state);
      await addToHistory({
        title: state.title,
        url: state.pageUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to send",
        message,
      });
    }
  }

  async function handleResetSkills(
    mode: "cover" | "filter" | "all",
    title:
      | "Reset Cover Skills for this Domain"
      | "Reset Filter Skills for this Domain"
      | "Reset All Skills for this Domain",
  ) {
    try {
      const domain = state.skillDomain.trim();
      if (!domain) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing domain",
          message: "No domain found for this page.",
        });
        return;
      }

      if (mode === "cover") {
        await resetCoverSkillsForDomain(domain);
      } else if (mode === "filter") {
        await resetFilterSkillsForDomain(domain);
      } else {
        await resetAllSkillsForDomain(domain);
      }

      setVersion((v) => v + 1);
      await showToast({
        style: Toast.Style.Success,
        title,
        message: "Preview reloaded.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to reset skills",
        message,
      });
    }
  }

  const markdown = buildMarkdown(state.title, state.markdownBody, { includeTitle: true });

  return (
    <Detail
      markdown={markdown}
      isLoading={state.isLoading}
      navigationTitle={state.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Kindle Title" text={state.title.trim() || "Reading"} />
          <Detail.Metadata.Label title="Domain" text={epubPreviewMetadata.domain || "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Cover"
            text={epubPreviewMetadata.coverStatusLabel}
            icon={epubPreviewMetadata.coverThumbnail}
          />
          <Detail.Metadata.Label title="Cover Method" text={epubPreviewMetadata.coverMethodLabel} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Send to Kindle" onAction={() => handleSend()} />
          {epubPreviewMetadata.coverThumbnail && (
            <Action.Push
              title="View Cover"
              shortcut={{ modifiers: ["opt"], key: "p" }}
              target={
                <CoverPreview
                  coverPreviewThumbnail={epubPreviewMetadata.coverPreviewThumbnail}
                  coverStatusLabel={epubPreviewMetadata.coverStatusLabel}
                  coverMethodLabel={epubPreviewMetadata.coverMethodLabel}
                  title={state.title}
                />
              }
            />
          )}
          {!autoSend && (
            <>
              <Action.Push
                title="Add Cover Skill"
                shortcut={{ modifiers: ["opt"], key: "k" }}
                target={
                  <AddCoverSkillGrid
                    sourceHtml={state.sourceHtml}
                    pageUrl={state.pageUrl}
                    domain={state.skillDomain}
                    onSaved={(selector) => {
                      setState((previous) => ({
                        ...previous,
                        coverSelectors: Array.from(new Set([...previous.coverSelectors, selector])),
                      }));
                    }}
                  />
                }
              />
              <Action.Push
                title="Add Filter Skill"
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                target={
                  <AddFilterSkillList
                    readabilityHtml={state.readabilityHtml}
                    sourceHtml={state.sourceHtml}
                    pageUrl={state.pageUrl}
                    domain={state.skillDomain}
                    existingFilters={state.contentFilters}
                    onReload={() => setVersion((v) => v + 1)}
                  />
                }
              />
              <Action.Push
                title="Edit Content"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={
                  <EditArticleForm
                    title={state.title}
                    markdownBody={state.markdownBody}
                    onSave={({ title, markdownBody }) => {
                      setState((previous) => ({
                        ...previous,
                        title,
                        markdownBody,
                      }));
                    }}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Original Source Code"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={state.sourceHtml}
              />
              <Action.CopyToClipboard title="Copy Markdown" content={markdown} />
              <ActionPanel.Section title="Skills">
                <Action
                  title="Reset Cover Skills for This Domain"
                  style={Action.Style.Destructive}
                  onAction={() => handleResetSkills("cover", "Reset Cover Skills for this Domain")}
                />
                <Action
                  title="Reset Filter Skills for This Domain"
                  style={Action.Style.Destructive}
                  onAction={() => handleResetSkills("filter", "Reset Filter Skills for this Domain")}
                />
                <Action
                  title="Reset All Skills for This Domain"
                  style={Action.Style.Destructive}
                  onAction={() => handleResetSkills("all", "Reset All Skills for this Domain")}
                />
              </ActionPanel.Section>
            </>
          )}
          <Action title="Reveal Output Folder" onAction={() => showInFinder(environment.supportPath)} />
        </ActionPanel>
      }
    />
  );
}

async function loadArticle(): Promise<ArticleData> {
  if (!environment.canAccess(BrowserExtension)) {
    throw new Error("Raycast browser extension is not available.");
  }

  const tabs = await BrowserExtension.getTabs();
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];

  const html = await BrowserExtension.getContent({
    format: "html",
    tabId: activeTab?.id,
  });

  const { document } = parseHTML(html);
  const pageUrl = activeTab?.url ?? "https://example.com";

  try {
    (document as unknown as { URL?: string }).URL = pageUrl;
    (document as unknown as { baseURI?: string }).baseURI = pageUrl;
  } catch {
    // Best-effort only; Readability can still parse without these.
  }

  const domain = extractDomainFromUrl(pageUrl);
  const sourceDomain = extractBaseDomainFromUrl(pageUrl);
  const coverSelectorList: string[] = [];
  const seenCoverSelectors = new Set<string>();
  let contentFilters: string[] = [];
  if (domain) {
    const filters = await getFiltersForDomain(domain);
    const invalidSelectors: string[] = [];

    for (const filter of filters) {
      const coverSelectors = parseCssSelectors(filter.coverSelector);
      for (const coverSelector of coverSelectors) {
        if (seenCoverSelectors.has(coverSelector)) continue;
        seenCoverSelectors.add(coverSelector);
        coverSelectorList.push(coverSelector);
      }

      if (!filter.selector.trim()) {
        continue;
      }

      try {
        const selector = parseCssSelectors(filter.selector).join(", ");
        if (!selector) continue;

        const matches = Array.from(document.querySelectorAll(selector)) as Array<{ remove?: () => void }>;
        matches.forEach((element) => element.remove?.());
      } catch {
        invalidSelectors.push(filter.selector);
      }
    }

    // Collect effective content filters (selectors)
    // We want to return all valid selectors that were used
    contentFilters = filters
      .filter((f) => !invalidSelectors.includes(f.selector) && f.selector.trim())
      .map((f) => f.selector);

    if (invalidSelectors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid CSS filters",
        message: `${invalidSelectors.length} filter(s) ignored.`,
      });
    }
  }

  const reader = new Readability(document, { keepClasses: true });
  const article = reader.parse();

  if (!article?.content) {
    throw new Error("Readability could not extract readable content.");
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  const normalizedContent = absolutizeHtmlUrls(article.content, pageUrl);

  return {
    title: article.title?.trim() || activeTab?.title || "Reading",
    markdownBody: normalizeImageOnlyLinkMarkdown(turndownService.turndown(normalizedContent)),
    author: sourceDomain || domain || "",
    skillDomain: sourceDomain || domain || "",
    pageUrl,
    sourceHtml: html,
    coverSelectors: coverSelectorList,
    readabilityHtml: article.content,
    contentFilters,
  };
}

function absolutizeHtmlUrls(html: string, baseUrl: string): string {
  if (!html.trim()) return html;

  const { document } = parseHTML(`<article>${html}</article>`);
  const article = document.querySelector("article");
  if (!article) return html;

  const srcAttributes = ["src", "data-src", "data-original", "data-lazy-src", "data-actualsrc"];
  const imageNodes = Array.from(article.querySelectorAll("img, source")) as Array<{
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
  }>;
  for (const node of imageNodes) {
    for (const attribute of srcAttributes) {
      const value = node.getAttribute(attribute);
      const absolute = absolutizeUrl(value, baseUrl);
      if (absolute) {
        node.setAttribute(attribute, absolute);
      }
    }

    const srcset = node.getAttribute("srcset");
    if (srcset) {
      node.setAttribute("srcset", absolutizeSrcset(srcset, baseUrl));
    }

    const dataSrcset = node.getAttribute("data-srcset");
    if (dataSrcset) {
      node.setAttribute("data-srcset", absolutizeSrcset(dataSrcset, baseUrl));
    }
  }

  const anchors = Array.from(article.querySelectorAll("a")) as Array<{
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
  }>;
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    const absolute = absolutizeUrl(href, baseUrl);
    if (absolute) {
      anchor.setAttribute("href", absolute);
    }
  }

  return article.innerHTML;
}

function normalizeImageOnlyLinkMarkdown(markdown: string): string {
  if (!markdown.trim()) return markdown;

  // Turndown can emit image-only links across multiple lines:
  // [\n\n![alt](img-url)\n\n](target-url)
  // This renders poorly in Raycast Detail (visible brackets + URL), so unwrap to plain image markdown.
  return markdown.replace(/\[\s*(!\[[^\]]*\]\([^)]+\))\s*\]\([^)]+\)/gs, "$1");
}

function absolutizeSrcset(srcset: string, baseUrl: string): string {
  return srcset
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return trimmed;
      const parts = trimmed.split(/\s+/);
      const absolute = absolutizeUrl(parts[0], baseUrl) ?? parts[0];
      const descriptor = parts.slice(1).join(" ");
      return descriptor ? `${absolute} ${descriptor}` : absolute;
    })
    .join(", ");
}

function absolutizeUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

async function sendArticle(inputState: ArticleData, options?: { direct?: boolean }) {
  if (!inputState.markdownBody.trim()) {
    throw new Error("No content to send.");
  }

  const preferences = await resolveSendPreferences();
  const sendMethod = preferences.sendMethod ?? "app";
  const extensionPreferences = getPreferenceValues<{ shareEpubCover?: boolean; disableArticleLinks?: boolean }>();
  const shareEpubCover = extensionPreferences.shareEpubCover !== false;
  const disableArticleLinks = extensionPreferences.disableArticleLinks === true;
  const includeTitleInMarkdown = sendMethod !== "email";
  const includeTitleInEpub = !includeTitleInMarkdown;
  const markdown = buildMarkdown(inputState.title, inputState.markdownBody, { includeTitle: includeTitleInMarkdown });

  const progressToast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing Your Kindle Delivery",
    message: "Building EPUB and embedding images...",
  });

  let articleHtml = markdownToHtml(markdown);
  if (disableArticleLinks) {
    articleHtml = stripLinksFromHtml(articleHtml);
  }
  const { html, resources, warnings, coverResource, invalidCoverSelectors } = await inlineImages({
    html: articleHtml,
    pageUrl: inputState.pageUrl,
    sourceHtml: inputState.sourceHtml,
    coverSelectors: shareEpubCover ? inputState.coverSelectors : [],
    allowCoverResource: shareEpubCover,
  });

  if (warnings.length > 0) {
    progressToast.message = `${warnings.length} image(s) ignored.`;
  }
  if (invalidCoverSelectors.length > 0) {
    progressToast.message = `${invalidCoverSelectors.length} cover selector(s) ignored.`;
  }

  const epubBuffer = await buildEpubBuffer({
    title: inputState.title,
    author: inputState.author,
    language: "en",
    bodyHtml: html,
    resources,
    coverResource,
    includeTitleInContent: includeTitleInEpub,
  });

  const safeTitle = sanitizeFilename(inputState.title) || "Article";
  const fileName = `${safeTitle}.epub`;
  await mkdir(environment.supportPath, { recursive: true });
  const filePath = path.join(environment.supportPath, fileName);
  await writeFile(filePath, epubBuffer);

  if (sendMethod === "email") {
    progressToast.title = "Delivering to Kindle Inbox";
    progressToast.message = "Sending email...";
    await sendEpubByEmail({
      title: inputState.title,
      filename: fileName,
      epubBuffer,
      preferences,
    });
    await deleteGeneratedEpub(filePath);

    progressToast.style = Toast.Style.Success;
    progressToast.title = options?.direct ? "Delivered to Kindle Inbox" : "File Sent by Email";
    progressToast.message = options?.direct ? "Your EPUB was sent successfully." : "";
    return;
  }

  progressToast.title = "Opening Send to Kindle";
  progressToast.message = "Transferring EPUB...";
  const opened = await openWithSendToKindle(filePath);
  if (!opened) {
    progressToast.style = Toast.Style.Failure;
    progressToast.title = "Send to Kindle App Not Found";
    progressToast.message = "Install the Amazon app or open the file manually.";
    return;
  }
  await deleteGeneratedEpub(filePath);

  progressToast.style = Toast.Style.Success;
  progressToast.title = options?.direct ? "Delivered to Send to Kindle" : "File Sent to Send to Kindle";
  progressToast.message = options?.direct ? "The app received your EPUB." : "";
}

async function deleteGeneratedEpub(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Do not fail delivery when local cleanup fails.
  }
}

type EditArticleFormProps = {
  title: string;
  markdownBody: string;
  onSave: (next: { title: string; markdownBody: string }) => void;
};

function EditArticleForm({ title, markdownBody, onSave }: EditArticleFormProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(markdownBody);
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Edit article"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={() => {
              const normalizedTitle = draftTitle.trim() || "Reading";
              onSave({
                title: normalizedTitle,
                markdownBody: draftBody.trim(),
              });
              pop();
            }}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={draftTitle} onChange={setDraftTitle} />
      <Form.TextArea id="content" title="Content (Markdown)" value={draftBody} onChange={setDraftBody} />
    </Form>
  );
}

type CoverPreviewProps = {
  coverPreviewThumbnail?: string;
  coverStatusLabel: string;
  coverMethodLabel: string;
  title: string;
};

function CoverPreview({ coverPreviewThumbnail, coverStatusLabel, coverMethodLabel, title }: CoverPreviewProps) {
  const { pop } = useNavigation();

  const markdown = coverPreviewThumbnail
    ? `![Cover Preview](${coverPreviewThumbnail})`
    : `# No Cover Available\n\n${coverStatusLabel}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Cover Preview"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text={coverStatusLabel} />
          <Detail.Metadata.Label title="Method" text={coverMethodLabel} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Close" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

type AddCoverSkillGridProps = {
  sourceHtml: string;
  pageUrl: string;
  domain: string;
  onSaved: (selector: string) => void;
};

function AddCoverSkillGrid({ sourceHtml, pageUrl, domain, onSaved }: AddCoverSkillGridProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<CoverImageCandidate[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidates() {
      try {
        const candidates = await listCoverCandidates({
          sourceHtml,
          pageUrl,
          minWidth: 400,
        });
        if (!isMounted) return;
        setItems(candidates);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCandidates().catch(async () => {
      if (!isMounted) return;
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to list images",
        message: "Couldn't parse images from the source HTML.",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [pageUrl, sourceHtml]);

  async function handleAddCoverSelector(selector: string) {
    const normalizedDomain = domain.trim();
    if (!normalizedDomain) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing domain",
        message: "No domain found for this page.",
      });
      return;
    }

    const result = await addFilter(normalizedDomain, "", selector);
    onSaved(selector);
    await showToast({
      style: Toast.Style.Success,
      title: result.operation === "created" ? "Skill created" : "Skill updated",
      message: `Cover CSS added for ${normalizedDomain}.`,
    });
    pop();
  }

  return (
    <Grid
      isLoading={isLoading}
      navigationTitle="Add cover skill"
      searchBarPlaceholder="Search by selector"
      fit={Grid.Fit.Fill}
      aspectRatio="2/3"
    >
      {items.length === 0 && !isLoading ? (
        <Grid.EmptyView
          title="No image found"
          description="No source image of at least 400px width could be resolved."
        />
      ) : (
        items.map((item) => (
          <Grid.Item
            key={`${item.selector}-${item.sourceUrl}`}
            content={item.previewDataUrl}
            title={item.height > 0 ? `${item.width}x${item.height}` : `${item.width}px wide`}
            subtitle={item.selector}
            actions={
              <ActionPanel>
                <Action title="Add Cover CSS Selector" onAction={() => handleAddCoverSelector(item.selector)} />
                <Action.CopyToClipboard title="Copy CSS Selector" content={item.selector} />
                <Action.OpenInBrowser title="Open Source Image" url={item.sourceUrl} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

type CssSelectorCandidate = {
  selector: string;
  preview: string;
  matchCount: number;
  specificityScore: number;
  riskScore: number;
  confidenceScore: number;
  sourceKind: "id" | "class" | "tag-class" | "tag";
};

type AddFilterSkillListProps = {
  readabilityHtml: string;
  sourceHtml: string;
  pageUrl: string;
  domain: string;
  existingFilters: string[];
  onReload: () => void;
};

function AddFilterSkillList({
  readabilityHtml,
  sourceHtml,
  pageUrl,
  domain,
  existingFilters,
  onReload,
}: AddFilterSkillListProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<CssSelectorCandidate[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showAllSelectors, setShowAllSelectors] = useState(false);
  const [addedSelectors, setAddedSelectors] = useState<Set<string>>(new Set(existingFilters));
  const hasChangesRef = useRef(false);

  useEffect(() => {
    return () => {
      if (hasChangesRef.current) {
        onReload();
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectors() {
      try {
        const selectors = await extractSelectorsFromReadability(readabilityHtml, sourceHtml, pageUrl);
        if (!isMounted) return;
        setItems(selectors);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSelectors().catch(async () => {
      if (!isMounted) return;
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to extract selectors",
        message: "Couldn't parse CSS selectors from Readability content.",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [readabilityHtml, sourceHtml, pageUrl]);

  async function handleAddFilterSelector(selector: string) {
    const normalizedDomain = domain.trim();
    if (!normalizedDomain) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing domain",
        message: "No domain found for this page.",
      });
      return;
    }

    const result = await addFilter(normalizedDomain, selector, "");
    setAddedSelectors((prev) => new Set(prev).add(selector));
    hasChangesRef.current = true;
    await showToast({
      style: Toast.Style.Success,
      title: result.operation === "created" ? "Skill created" : "Skill updated",
      message: `Filter CSS added for ${normalizedDomain}.`,
    });
  }

  const normalizedSearchText = searchText.trim().toLowerCase();
  const isSearching = normalizedSearchText.length > 0;
  const recommendedItems = buildRecommendedSelectorSubset(items);
  const defaultItems = buildAdaptiveVisibleSelectors(recommendedItems);
  const hiddenCount = Math.max(0, items.length - defaultItems.length);
  const filteredItems = isSearching
    ? items.filter((item) => `${item.selector}\n${item.preview}`.toLowerCase().includes(normalizedSearchText))
    : showAllSelectors
      ? items
      : defaultItems;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Add filter skill"
      searchBarPlaceholder="Search selector or preview"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          title={items.length === 0 ? "No selectors found" : "No matching result"}
          description={
            items.length === 0
              ? "No CSS selectors could be extracted from the article content."
              : "Try a selector fragment or text visible in Content Preview."
          }
        />
      ) : (
        filteredItems.map((item) => {
          const isAdded = addedSelectors.has(item.selector);
          return (
            <List.Item
              key={item.selector}
              title={item.selector}
              subtitle={`${item.matchCount} element${item.matchCount > 1 ? "s" : ""}`}
              icon={isAdded ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined}
              detail={
                <List.Item.Detail
                  markdown={`### Content Preview\n\n${item.preview}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="CSS Selector" text={item.selector} />
                      <List.Item.Detail.Metadata.Label
                        title="Elements Found (Source HTML)"
                        text={`${item.matchCount} element${item.matchCount > 1 ? "s" : ""}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Confidence Score" text={`${item.confidenceScore}`} />
                      <List.Item.Detail.Metadata.Label title="Specificity Score" text={`${item.specificityScore}`} />
                      <List.Item.Detail.Metadata.Label title="Risk Score" text={`${item.riskScore}`} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Domain" text={domain} />
                      {isAdded && <List.Item.Detail.Metadata.Label title="Status" text="✓ Added to filters" />}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={isAdded ? "Already Added" : "Add Filter CSS Selector"}
                    onAction={() => handleAddFilterSelector(item.selector)}
                    icon={isAdded ? Icon.Checkmark : Icon.Plus}
                  />
                  <Action.CopyToClipboard title="Copy CSS Selector" content={item.selector} />
                  <Action title="Return to Preview" onAction={pop} />
                </ActionPanel>
              }
            />
          );
        })
      )}
      {!isSearching && !showAllSelectors && hiddenCount > 0 && (
        <List.Item
          key="load-all-selectors"
          title={`Load all selectors (${hiddenCount} hidden)`}
          icon={Icon.List}
          detail={
            <List.Item.Detail
              markdown={`### Recommended View\n\nShowing ${defaultItems.length} selectors ranked by confidence and safety.\n\nUse this action to load all ${items.length} selectors.`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Load All Selectors" onAction={() => setShowAllSelectors(true)} icon={Icon.List} />
              <Action title="Return to Preview" onAction={pop} />
            </ActionPanel>
          }
        />
      )}
      {!isSearching && showAllSelectors && hiddenCount > 0 && (
        <List.Item
          key="show-recommended-only"
          title="Show recommended only"
          icon={Icon.Filter}
          detail={
            <List.Item.Detail
              markdown={`### All Selectors Loaded\n\nCurrently showing all ${items.length} selectors.\n\nUse this action to go back to the recommended subset.`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Show Recommended Only" onAction={() => setShowAllSelectors(false)} icon={Icon.Filter} />
              <Action title="Return to Preview" onAction={pop} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function extractSelectorsFromReadability(
  readabilityHtml: string,
  sourceHtml: string,
  pageUrl: string,
): CssSelectorCandidate[] {
  if (!readabilityHtml.trim()) return [];

  const { document: readabilityDocument } = parseHTML(readabilityHtml);
  const { document: sourceDocument } = sourceHtml.trim() ? parseHTML(sourceHtml) : parseHTML(readabilityHtml);
  const allElements = readabilityDocument.querySelectorAll("*");
  const selectorMap = new Map<string, CssSelectorCandidate>();

  // Filter out document-level elements
  const excludedTags = new Set(["html", "head", "body", "script", "style", "meta", "link"]);

  for (const element of Array.from(allElements)) {
    const el = element as unknown as DomElementLike;
    if (!el.tagName) continue;

    const tagName = el.tagName.toLowerCase();
    if (excludedTags.has(tagName)) continue;

    const possibleSelectors = new Set<string>();

    // 1. ID Selector
    if (el.id && typeof el.id === "string" && el.id.trim()) {
      possibleSelectors.add(`#${escapeCssId(el.id.trim())}`);
    }

    // 2. Class Selectors
    if (el.className && typeof el.className === "string") {
      const classes = el.className.split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        possibleSelectors.add(`.${escapeCssClass(cls)}`);
        // 3. Tag + Class combination (for slightly more specificity)
        possibleSelectors.add(`${tagName}.${escapeCssClass(cls)}`);
      }
    }

    // 4. Specific Tags (if no class/id, but interesting tag)
    if (["figure", "aside", "blockquote", "img", "video", "iframe", "canvas", "code", "pre"].includes(tagName)) {
      possibleSelectors.add(tagName);
    }

    // Process all found selectors for this element
    for (const selector of possibleSelectors) {
      if (!selector.trim() || selector.startsWith("#readability")) {
        continue;
      }
      if (selectorMap.has(selector)) continue;

      // New selector found, compute preview
      let nodes: unknown[];
      try {
        nodes = Array.from(readabilityDocument.querySelectorAll(selector)) as unknown[];
      } catch {
        continue;
      }
      if (nodes.length === 0) continue;
      const textContent = nodes
        .map((node) => {
          const n = node as unknown as { textContent?: string };
          return n.textContent?.trim() || "";
        })
        .filter(Boolean)
        .join("\n\n---\n\n")
        .trim();

      const imagePreviewUrl = nodes
        .map((node) => extractPreviewImageUrl(node, pageUrl))
        .find((url): url is string => Boolean(url));

      const preview = buildMixedSelectorPreview(textContent, imagePreviewUrl);
      let sourceMatchCount = nodes.length;
      try {
        sourceMatchCount = Array.from(sourceDocument.querySelectorAll(selector)).length;
      } catch {
        sourceMatchCount = nodes.length;
      }
      const sourceKind = inferSelectorSourceKind(selector);
      const specificityScore = getSpecificityScore(sourceKind);
      const riskScore = getRiskScore(sourceMatchCount);
      const previewScore = preview === NO_CONTENT_PREVIEW ? -8 : 8;
      const broadPenalty = getBroadSelectorPenalty(selector, sourceKind);
      const confidenceScore = specificityScore + riskScore + previewScore + broadPenalty;

      selectorMap.set(selector, {
        selector,
        preview,
        matchCount: sourceMatchCount,
        specificityScore,
        riskScore,
        confidenceScore,
        sourceKind,
      });
    }
  }

  // Convert to array
  const results: CssSelectorCandidate[] = Array.from(selectorMap.values());

  // Sort by confidence (high to low), then safest/smallest match count, then alpha.
  results.sort((a, b) => {
    if (a.confidenceScore !== b.confidenceScore) return b.confidenceScore - a.confidenceScore;
    if (a.matchCount !== b.matchCount) return a.matchCount - b.matchCount;

    return a.selector.localeCompare(b.selector);
  });

  return results;
}

const HIGH_CONFIDENCE_THRESHOLD = 28;
const RECOMMENDED_SELECTOR_TARGET = 20;
const NO_CONTENT_PREVIEW = "(No text content)";
const VERY_BROAD_TAGS = new Set(["div", "section", "p", "span", "article", "main", "ul", "ol", "li"]);
const GENERIC_CLASS_TOKENS = new Set([
  "container",
  "content",
  "wrapper",
  "inner",
  "outer",
  "main",
  "body",
  "layout",
  "grid",
  "row",
  "col",
  "module",
  "block",
]);

function inferSelectorSourceKind(selector: string): CssSelectorCandidate["sourceKind"] {
  if (selector.startsWith("#")) return "id";
  if (selector.startsWith(".")) return "class";
  if (selector.includes(".")) return "tag-class";
  return "tag";
}

function getSpecificityScore(sourceKind: CssSelectorCandidate["sourceKind"]): number {
  if (sourceKind === "id") return 45;
  if (sourceKind === "tag-class") return 35;
  if (sourceKind === "class") return 30;
  return 5;
}

function getRiskScore(matchCount: number): number {
  if (matchCount === 1) return 15;
  if (matchCount >= 2 && matchCount <= 4) return 8;
  if (matchCount >= 5 && matchCount <= 10) return -8;
  if (matchCount > 20) return -35;
  if (matchCount > 10) return -20;
  return 0;
}

function getBroadSelectorPenalty(selector: string, sourceKind: CssSelectorCandidate["sourceKind"]): number {
  let penalty = 0;

  if (sourceKind === "tag" && VERY_BROAD_TAGS.has(selector.toLowerCase())) {
    penalty -= 20;
  }

  const classTokens = extractClassTokens(selector);
  if (classTokens.some((token) => GENERIC_CLASS_TOKENS.has(token.toLowerCase()))) {
    penalty -= 10;
  }

  return penalty;
}

function extractClassTokens(selector: string): string[] {
  if (selector.startsWith(".")) {
    return selector
      .slice(1)
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (!selector.includes(".")) return [];
  const [, ...classParts] = selector.split(".");
  return classParts.map((part) => part.trim()).filter(Boolean);
}

function getCanonicalSelectorGroupKey(selector: string): string {
  if (!selector) return "";
  if (selector.startsWith("#")) return selector;

  const classTokens = extractClassTokens(selector)
    .map((token) => token.toLowerCase())
    .sort((a, b) => a.localeCompare(b));
  if (classTokens.length > 0) {
    return `class:${classTokens.join(".")}`;
  }

  return `tag:${selector.toLowerCase()}`;
}

function buildRecommendedSelectorSubset(items: CssSelectorCandidate[]): CssSelectorCandidate[] {
  const grouped = new Set<string>();
  const deduplicated: CssSelectorCandidate[] = [];

  for (const item of items) {
    const groupKey = getCanonicalSelectorGroupKey(item.selector);
    if (grouped.has(groupKey)) continue;
    grouped.add(groupKey);
    deduplicated.push(item);
  }

  return deduplicated;
}

function buildAdaptiveVisibleSelectors(items: CssSelectorCandidate[]): CssSelectorCandidate[] {
  if (items.length <= RECOMMENDED_SELECTOR_TARGET) return items;

  const selected = new Map<string, CssSelectorCandidate>();
  for (const item of items) {
    if (item.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD) {
      selected.set(item.selector, item);
    }
  }

  if (selected.size < RECOMMENDED_SELECTOR_TARGET) {
    for (const item of items) {
      if (selected.has(item.selector)) continue;
      selected.set(item.selector, item);
      if (selected.size >= RECOMMENDED_SELECTOR_TARGET) break;
    }
  }

  return Array.from(selected.values());
}

function buildMixedSelectorPreview(textContent: string, imagePreviewUrl: string | undefined): string {
  const hasText = textContent.trim().length > 0;
  const hasImage = Boolean(imagePreviewUrl);

  if (hasText && hasImage) {
    return `${textContent}\n\n---\n\n![Content Preview](${imagePreviewUrl})`;
  }

  if (hasText) return textContent;
  if (hasImage) return `![Content Preview](${imagePreviewUrl})`;
  return NO_CONTENT_PREVIEW;
}

function extractPreviewImageUrl(node: unknown, pageUrl: string): string | null {
  const candidate = node as unknown as {
    tagName?: string;
    getAttribute?: (name: string) => string | null;
    querySelector?: (selector: string) => unknown;
  };

  let imageNode = candidate;
  if ((candidate.tagName || "").toLowerCase() !== "img" && typeof candidate.querySelector === "function") {
    const nestedImage = candidate.querySelector("img") as unknown;
    if (nestedImage) {
      imageNode = nestedImage as typeof candidate;
    }
  }

  if ((imageNode.tagName || "").toLowerCase() !== "img" || typeof imageNode.getAttribute !== "function") {
    return null;
  }

  const rawUrl =
    imageNode.getAttribute("src") ||
    imageNode.getAttribute("data-src") ||
    imageNode.getAttribute("data-original") ||
    imageNode.getAttribute("data-lazy-src") ||
    imageNode.getAttribute("data-actualsrc") ||
    pickFirstSrcsetUrl(imageNode.getAttribute("srcset")) ||
    pickFirstSrcsetUrl(imageNode.getAttribute("data-srcset"));

  if (!rawUrl) return null;

  try {
    return new URL(rawUrl, pageUrl).href;
  } catch {
    return rawUrl;
  }
}

function pickFirstSrcsetUrl(srcset: string | null): string | null {
  if (!srcset) return null;
  const firstEntry = srcset.split(",")[0]?.trim();
  if (!firstEntry) return null;
  return firstEntry.split(/\s+/)[0] || null;
}

type CoverCandidateInput = {
  sourceHtml: string;
  pageUrl: string;
  minWidth: number;
};

type DomElementLike = {
  tagName?: string;
  id?: string;
  className?: string;
  parentElement?: unknown;
  childNodes?: unknown[];
  previousElementSibling?: unknown;
  querySelector?: (selector: string) => unknown;
  querySelectorAll?: (selector: string) => unknown[];
  getAttribute?: (name: string) => string | null;
};

type ImageDimensions = {
  width: number;
  height: number;
};

async function listCoverCandidates({
  sourceHtml,
  pageUrl,
  minWidth,
}: CoverCandidateInput): Promise<CoverImageCandidate[]> {
  if (!sourceHtml.trim()) return [];
  const { document } = parseHTML(sourceHtml);

  // CRITICAL: Limit the number of img elements we even examine to prevent memory overflow
  const allImageElements = document.querySelectorAll("img");
  const maxElementsToExamine = 120; // Wider scan to avoid missing hero image in long pages
  const imageElements = Array.from(allImageElements).slice(0, maxElementsToExamine) as unknown[];

  const seenCandidates = new Set<string>();
  const items: CoverImageCandidate[] = [];
  const maxCandidates = 5; // Reduced from 8 to 5 for memory safety

  for (const node of imageElements) {
    // Stop if we already have enough candidates
    if (items.length >= maxCandidates) break;

    const imageElement = isImageElementLike(node) ? node : null;
    if (!imageElement) continue;
    const domNode = node as DomElementLike;

    const selector = buildCssSelector(domNode);
    if (!selector) continue;

    const sourceUrls = chooseImageUrlsWithPictureSources(domNode, imageElement, pageUrl).slice(0, 8);
    if (sourceUrls.length === 0) continue;

    const declaredWidth = inferDeclaredWidth(domNode, imageElement);
    let addedCandidate = false;
    for (const sourceUrl of sourceUrls) {
      const candidateKey = `${selector}::${sourceUrl}`;
      if (seenCandidates.has(candidateKey)) continue;

      const fetched = await fetchImage(sourceUrl, pageUrl);
      if (!fetched) continue;

      const dimensions = getImageDimensions(fetched.data, fetched.mediaType);
      const width = dimensions?.width ?? declaredWidth;
      if (!width || width < minWidth) continue;

      const previewBuffer = (await resizeImageForCover(fetched.data, fetched.mediaType)) ?? fetched.data;
      const previewDataUrl = `data:${fetched.mediaType};base64,${previewBuffer.toString("base64")}`;
      const height = dimensions?.height ?? 0;

      seenCandidates.add(candidateKey);
      items.push({
        selector,
        sourceUrl,
        previewDataUrl,
        width,
        height,
      });
      addedCandidate = true;
      break;
    }

    // Fallback: keep candidate if declared dimensions are sufficient,
    // even when fetching/normalizing fails (eg. hotlink/webp conversion issues).
    if (!addedCandidate && declaredWidth && declaredWidth >= minWidth) {
      const sourceUrl = sourceUrls[0];
      const candidateKey = `${selector}::${sourceUrl}`;
      if (!seenCandidates.has(candidateKey)) {
        seenCandidates.add(candidateKey);
        items.push({
          selector,
          sourceUrl,
          previewDataUrl: sourceUrl,
          width: declaredWidth,
          height: 0,
        });
      }
    }
  }

  return items;
}

function inferDeclaredWidth(
  domNode: DomElementLike,
  imageElement: { getAttribute: (name: string) => string | null },
): number | null {
  const widthAttribute = parsePixels(imageElement.getAttribute("width"));
  if (widthAttribute) return widthAttribute;

  const style = imageElement.getAttribute("style");
  if (style) {
    const styleMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i);
    if (styleMatch) {
      const parsed = Number(styleMatch[1]);
      if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
    }
  }

  const srcset = imageElement.getAttribute("srcset") || imageElement.getAttribute("data-srcset");
  if (srcset) {
    const srcsetWidths = srcset
      .split(",")
      .map((entry) => entry.trim().match(/\s(\d+)w$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (srcsetWidths.length > 0) {
      return Math.max(...srcsetWidths);
    }
  }

  const pictureSourceWidths = listPictureSourceWidths(domNode);
  if (pictureSourceWidths.length > 0) {
    return Math.max(...pictureSourceWidths);
  }

  const sourceCandidates = [
    imageElement.getAttribute("src"),
    imageElement.getAttribute("data-src"),
    imageElement.getAttribute("data-original"),
    imageElement.getAttribute("data-lazy-src"),
    imageElement.getAttribute("data-actualsrc"),
  ];
  for (const candidate of sourceCandidates) {
    if (!candidate) continue;
    const queryMatch = candidate.match(/[?&](?:w|width)=(\d{2,5})/i);
    if (!queryMatch) continue;
    const parsed = Number(queryMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function chooseImageUrlsWithPictureSources(
  domNode: DomElementLike,
  imageElement: { getAttribute: (name: string) => string | null },
  pageUrl: string,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const pictureCandidates = listPictureSourceUrls(domNode);
  for (const candidate of pictureCandidates) {
    try {
      const resolved = candidate.startsWith("data:") ? candidate : new URL(candidate, pageUrl).toString();
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      urls.push(resolved);

      const original = extractOriginalImageUrlCandidate(resolved, pageUrl);
      if (original && !seen.has(original)) {
        seen.add(original);
        urls.push(original);
      }
    } catch {
      // Try next candidate.
    }
  }

  const fallback = chooseImageUrl(imageElement, pageUrl);
  if (fallback && !seen.has(fallback)) {
    urls.push(fallback);
  }

  return urls;
}

function listPictureSourceWidths(node: DomElementLike): number[] {
  const picture = getParentPictureElement(node);
  if (!picture?.querySelectorAll) return [];

  const sourceNodes = Array.from(picture.querySelectorAll("source")) as unknown[];
  const widths: number[] = [];
  for (const sourceNode of sourceNodes) {
    if (!isDomElementLike(sourceNode) || typeof sourceNode.getAttribute !== "function") continue;
    const widthAttribute = parsePixels(sourceNode.getAttribute("width"));
    if (widthAttribute) widths.push(widthAttribute);

    const srcset = sourceNode.getAttribute("srcset");
    if (!srcset) continue;
    const srcsetWidths = srcset
      .split(",")
      .map((entry) => entry.trim().match(/\s(\d+)w$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value) && value > 0);
    widths.push(...srcsetWidths);
  }

  return widths;
}

function listPictureSourceUrls(node: DomElementLike): string[] {
  const picture = getParentPictureElement(node);
  if (!picture?.querySelectorAll) return [];

  type SrcsetCandidate = { url: string; width: number | null };
  const candidates: SrcsetCandidate[] = [];
  const sourceNodes = Array.from(picture.querySelectorAll("source")) as unknown[];
  for (const sourceNode of sourceNodes) {
    if (!isDomElementLike(sourceNode) || typeof sourceNode.getAttribute !== "function") continue;
    const srcset = sourceNode.getAttribute("srcset");
    if (!srcset) continue;
    candidates.push(...parseSrcsetCandidates(srcset));
  }

  candidates.sort((a, b) => {
    if (a.width === null && b.width === null) return 0;
    if (a.width === null) return 1;
    if (b.width === null) return -1;
    return b.width - a.width;
  });

  const dedupedUrls: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    dedupedUrls.push(candidate.url);
  }

  return dedupedUrls;
}

function getParentPictureElement(node: DomElementLike): DomElementLike | null {
  const parent = isDomElementLike(node.parentElement) ? node.parentElement : null;
  if (!parent) return null;
  return parent.tagName?.toLowerCase() === "picture" ? parent : null;
}

function parsePixels(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function isDomElementLike(value: unknown): value is DomElementLike {
  if (!value || typeof value !== "object") return false;
  const element = value as Partial<DomElementLike>;
  return typeof element.tagName === "string";
}

// New simplified buildCssSelector function

function escapeCssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function escapeCssClass(className: string): string {
  return className.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function buildCssSelector(element: DomElementLike): string {
  if (!isDomElementLike(element)) return "";

  const id = typeof element.id === "string" ? element.id.trim() : "";
  if (id) {
    return `#${escapeCssId(id)}`;
  }

  // Utility classes to exclude (generic, non-semantic)
  const utilityClasses = new Set([
    "lazyload",
    "lazy",
    "loaded",
    "loading",
    "active",
    "inactive",
    "visible",
    "hidden",
    "entered",
    "exited",
    "fade",
    "show",
    "hide",
    "open",
    "closed",
  ]);

  // Try to find a good selector from this element or its parents
  // Check up to 2 levels of parents
  let current: DomElementLike | null = element;
  let depth = 0;
  const maxDepth = 2;

  while (current && isDomElementLike(current) && depth <= maxDepth) {
    const classNames =
      typeof current.className === "string"
        ? current.className
            .split(/\s+/)
            .map((className) => className.trim())
            .filter(Boolean)
        : [];

    // Filter out utility classes and js/is/has prefixes
    const cleanClasses = classNames.filter((c) => !utilityClasses.has(c.toLowerCase()) && !c.match(/^(js-|is-|has-)/));

    // Look for BEM-style classes (block__element or block--modifier)
    const bemClasses = cleanClasses.filter((c) => c.includes("__") || c.includes("--"));

    if (bemClasses.length > 0) {
      // Prefer longer, more specific BEM classes
      const bestBem = bemClasses.sort((a, b) => b.length - a.length)[0];
      return `.${escapeCssClass(bestBem)}`;
    }

    // Look for semantic/specific class names
    const semanticClasses = cleanClasses.filter(
      (className) =>
        className.includes("topper") ||
        className.includes("hero") ||
        className.includes("featured") ||
        className.includes("main") ||
        className.includes("cover") ||
        (className.includes("article") && className.includes("image")) ||
        className.includes("visual") ||
        className.includes("banner") ||
        className.includes("thumbnail") ||
        className.includes("poster"),
    );

    if (semanticClasses.length > 0) {
      const bestSemantic = semanticClasses.sort((a, b) => b.length - a.length)[0];
      return `.${escapeCssClass(bestSemantic)}`;
    }

    // If we have meaningful classes on current element, use them
    if (cleanClasses.length > 0 && depth === 0) {
      const meaningfulClasses = cleanClasses.filter((c) => c.length > 3);
      if (meaningfulClasses.length > 0) {
        return `.${escapeCssClass(meaningfulClasses[0])}`;
      }
    }

    // Move to parent
    current = isDomElementLike(current.parentElement) ? current.parentElement : null;
    depth++;
  }

  // Fallback to tag with classes from original element
  const tag = element.tagName?.toLowerCase();
  if (!tag || tag === "html") return "";

  const originalClasses =
    typeof element.className === "string"
      ? element.className
          .split(/\s+/)
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

  const cleanOriginalClasses = originalClasses.filter(
    (c) => !utilityClasses.has(c.toLowerCase()) && !c.match(/^(js-|is-|has-)/),
  );

  if (cleanOriginalClasses.length > 0) {
    const classList = cleanOriginalClasses
      .slice(0, 2)
      .map((c) => escapeCssClass(c))
      .join(".");
    return `${tag}.${classList}`;
  }

  return tag;
}
function getImageDimensions(data: Buffer, mediaType: string): ImageDimensions | null {
  if (mediaType === "image/png") {
    if (data.length < 24) return null;
    const signature = data.slice(0, 8);
    const isPngSignature = signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isPngSignature) return null;
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  if (mediaType === "image/gif") {
    if (data.length < 10) return null;
    const signature = data.slice(0, 6).toString("ascii");
    if (signature !== "GIF87a" && signature !== "GIF89a") return null;
    const width = data.readUInt16LE(6);
    const height = data.readUInt16LE(8);
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  if (mediaType === "image/jpeg") {
    return getJpegDimensions(data);
  }

  return null;
}

function getJpegDimensions(data: Buffer): ImageDimensions | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;

  while (offset + 1 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 1 >= data.length) break;

    const segmentLength = data.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > data.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      if (offset + 7 > data.length) return null;
      const height = data.readUInt16BE(offset + 3);
      const width = data.readUInt16BE(offset + 5);
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

type InlineImagesResult = {
  html: string;
  resources: EpubResource[];
  warnings: string[];
  coverResource?: EpubResource;
  invalidCoverSelectors: string[];
};

type InlineImagesInput = {
  html: string;
  pageUrl: string;
  sourceHtml?: string;
  coverSelectors?: string[];
  allowCoverResource?: boolean;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type Fetcher = (input: string, init?: { headers?: Record<string, string> }) => Promise<FetchResponse>;

type ImageElementLike = {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  tagName?: string;
  querySelector?: (selector: string) => unknown;
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);
const INPUT_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};
const COVER_MAX_WIDTH = 1600;
const COVER_MAX_HEIGHT = 2560;

async function inlineImages({
  html,
  pageUrl,
  sourceHtml,
  coverSelectors = [],
  allowCoverResource = true,
}: InlineImagesInput): Promise<InlineImagesResult> {
  if (!html.trim()) {
    return { html, resources: [], warnings: [], invalidCoverSelectors: [] };
  }

  const baseUrl = pageUrl || "https://example.com";
  const { document } = parseHTML(`<article>${html}</article>`);
  const article = document.querySelector("article");
  if (!article) {
    return { html, resources: [], warnings: [], invalidCoverSelectors: [] };
  }

  const coverLookup = allowCoverResource
    ? await pickCoverFromSelectors({
        sourceHtml,
        pageUrl: baseUrl,
        selectors: coverSelectors,
      })
    : { invalidSelectors: [] };

  const imageElements = Array.from(article.querySelectorAll("img")) as ImageElementLike[];
  if (imageElements.length === 0) {
    return {
      html,
      resources: [],
      warnings: [],
      coverResource: coverLookup.coverResource,
      invalidCoverSelectors: coverLookup.invalidSelectors,
    };
  }

  const resources: EpubResource[] = [];
  const warnings: string[] = [];
  const cache = new Map<string, EpubResource>();
  let counter = 1;
  let coverResource: EpubResource | undefined = coverLookup.coverResource;

  for (const img of imageElements) {
    const candidate = chooseImageUrl(img, baseUrl);
    if (!candidate) continue;

    try {
      let resource = cache.get(candidate);
      if (!resource) {
        const fetched = await fetchImage(candidate, pageUrl);
        if (!fetched) {
          warnings.push(candidate);
          continue;
        }

        if (!SUPPORTED_IMAGE_MIME_TYPES.has(fetched.mediaType)) {
          warnings.push(candidate);
          continue;
        }

        const extension = MIME_EXTENSION_MAP[fetched.mediaType] || "jpg";
        const hash = crypto.createHash("sha1").update(candidate).digest("hex").slice(0, 10);
        const href = `images/image-${counter}-${hash}.${extension}`;
        const id = `img-${counter}-${hash}`;
        counter += 1;

        resource = {
          id,
          href,
          mediaType: fetched.mediaType,
          data: fetched.data,
        };
        cache.set(candidate, resource);
        resources.push(resource);
      }

      img.setAttribute("src", resource.href);
      img.removeAttribute("srcset");
      img.removeAttribute("data-srcset");
      img.removeAttribute("data-src");
      img.removeAttribute("data-original");
      img.removeAttribute("data-lazy-src");
      img.removeAttribute("data-actualsrc");

      if (allowCoverResource && !coverResource) {
        const coverData = await resizeImageForCover(resource.data, resource.mediaType);
        coverResource = buildCoverResource(candidate, resource, coverData ?? resource.data);
      }
    } catch {
      warnings.push(candidate);
    }
  }

  const updatedHtml = article.innerHTML;
  return {
    html: updatedHtml,
    resources,
    warnings,
    coverResource,
    invalidCoverSelectors: coverLookup.invalidSelectors,
  };
}

function chooseImageUrl(element: { getAttribute: (name: string) => string | null }, pageUrl: string): string | null {
  const candidates: string[] = [];

  const src = element.getAttribute("src");
  if (src) candidates.push(src);

  const dataSrc = element.getAttribute("data-src");
  if (dataSrc) candidates.push(dataSrc);

  const dataOriginal = element.getAttribute("data-original");
  if (dataOriginal) candidates.push(dataOriginal);

  const dataLazy = element.getAttribute("data-lazy-src");
  if (dataLazy) candidates.push(dataLazy);

  const dataActual = element.getAttribute("data-actualsrc");
  if (dataActual) candidates.push(dataActual);

  const srcset = element.getAttribute("srcset") || element.getAttribute("data-srcset");
  if (srcset) {
    const srcsetCandidates = parseSrcset(srcset);
    candidates.push(...srcsetCandidates);
  }

  const cleaned = candidates.map((candidate) => candidate.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  const expanded: string[] = [];
  const seenExpanded = new Set<string>();
  for (const candidate of cleaned) {
    if (!seenExpanded.has(candidate)) {
      seenExpanded.add(candidate);
      expanded.push(candidate);
    }
    const original = extractOriginalImageUrlCandidate(candidate, pageUrl);
    if (original && !seenExpanded.has(original)) {
      seenExpanded.add(original);
      expanded.push(original);
    }
  }

  const preferred = expanded.find((candidate) => hasSupportedExtension(candidate));
  const chosen = preferred ?? expanded[expanded.length - 1];

  try {
    if (chosen.startsWith("data:")) return chosen;
    return new URL(chosen, pageUrl).toString();
  } catch {
    return null;
  }
}

type CoverFromSelectorsInput = {
  sourceHtml?: string;
  pageUrl: string;
  selectors: string[];
};

type CoverFromSelectorsResult = {
  coverResource?: EpubResource;
  invalidSelectors: string[];
  coverMethod?: CoverSelectionMethod;
};

async function pickCoverFromSelectors({
  sourceHtml,
  pageUrl,
  selectors,
}: CoverFromSelectorsInput): Promise<CoverFromSelectorsResult> {
  if (!sourceHtml?.trim() || selectors.length === 0) {
    return { invalidSelectors: [] };
  }

  const { document } = parseHTML(sourceHtml);
  const invalidSelectors: string[] = [];

  for (const selector of selectors) {
    let matches: Element[] = [];
    try {
      matches = Array.from(document.querySelectorAll(selector));
    } catch {
      invalidSelectors.push(selector);
      continue;
    }

    // Keep a cap for performance, but allow enough matches for broad selectors (eg. ".w-full")
    const limitedMatches = matches.slice(0, 120);

    type CoverCandidate = {
      imageElement: ImageElementLike;
      url: string;
      declaredWidth: number | null;
    };

    const candidates: CoverCandidate[] = [];
    const seenUrls = new Set<string>();

    // Phase 1: Collect all candidates with their declared dimensions (fast, no network calls)
    for (const match of limitedMatches) {
      const imageElement = findImageElement(match);
      if (!imageElement) continue;

      const declaredWidth = inferDeclaredWidth(match as unknown as DomElementLike, imageElement);
      const urls = chooseImageUrlsWithPictureSources(match as unknown as DomElementLike, imageElement, pageUrl).slice(
        0,
        6,
      );
      for (const url of urls) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        candidates.push({
          imageElement,
          url,
          declaredWidth,
        });
      }
    }

    if (candidates.length === 0) continue;

    // Sort candidates by declared width (largest first), putting unknowns at the end
    candidates.sort((a, b) => {
      if (a.declaredWidth === null && b.declaredWidth === null) return 0;
      if (a.declaredWidth === null) return 1;
      if (b.declaredWidth === null) return -1;
      return b.declaredWidth - a.declaredWidth;
    });

    // Phase 2: Try to fetch images, starting with the largest declared size
    // If we have declared dimensions, only try the top candidates
    // If no declared dimensions, try all candidates
    const hasDeclaredDimensions = candidates.some((c) => c.declaredWidth !== null);
    const candidatesToTry = hasDeclaredDimensions ? candidates.slice(0, 12) : candidates;

    type FetchedCandidate = {
      url: string;
      fetched: { data: Buffer; mediaType: string };
      width: number;
      height: number;
    };

    const fetchedCandidates: FetchedCandidate[] = [];

    for (const candidate of candidatesToTry) {
      try {
        const fetched = await fetchImage(candidate.url, pageUrl);
        if (!fetched || !SUPPORTED_IMAGE_MIME_TYPES.has(fetched.mediaType)) {
          continue;
        }

        const dimensions = getImageDimensions(fetched.data, fetched.mediaType);
        const width = dimensions?.width ?? candidate.declaredWidth ?? 0;
        const height = dimensions?.height ?? 0;

        if (width > 0) {
          fetchedCandidates.push({
            url: candidate.url,
            fetched,
            width,
            height,
          });
        }
      } catch {
        // Continue to next candidate
      }
    }

    if (fetchedCandidates.length === 0) continue;

    // Select the largest image by area (width × height)
    const largest = fetchedCandidates.reduce((prev, current) => {
      const prevArea = prev.width * (prev.height || prev.width);
      const currentArea = current.width * (current.height || current.width);
      return currentArea > prevArea ? current : prev;
    });

    const coverData = await resizeImageForCover(largest.fetched.data, largest.fetched.mediaType);
    return {
      coverResource: buildCoverResource(largest.url, largest.fetched, coverData ?? largest.fetched.data),
      invalidSelectors,
      coverMethod: "css-selector",
    };
  }

  return { invalidSelectors };
}

function isImageElementLike(value: unknown): value is ImageElementLike {
  if (!value || typeof value !== "object") return false;
  const element = value as Partial<ImageElementLike>;
  return (
    typeof element.getAttribute === "function" &&
    typeof element.setAttribute === "function" &&
    typeof element.removeAttribute === "function"
  );
}

function findImageElement(element: unknown): ImageElementLike | null {
  if (!element || typeof element !== "object") return null;
  const node = element as ImageElementLike;
  const tagName = typeof node.tagName === "string" ? node.tagName.toLowerCase() : "";
  if (tagName === "img" && isImageElementLike(node)) {
    return node;
  }

  const nested = typeof node.querySelector === "function" ? node.querySelector("img") : null;
  return isImageElementLike(nested) ? nested : null;
}

function parseSrcset(srcset: string): string[] {
  return parseSrcsetCandidates(srcset).map((candidate) => candidate.url);
}

function parseSrcsetCandidates(srcset: string): Array<{ url: string; width: number | null }> {
  return srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/).filter(Boolean);
      const url = parts[0] ?? "";
      const widthToken = parts.find((part) => /^\d+w$/i.test(part));
      const width = widthToken ? Number(widthToken.slice(0, -1)) : null;
      return {
        url,
        width: Number.isFinite(width) && width !== null && width > 0 ? width : null,
      };
    })
    .filter((candidate) => Boolean(candidate.url));
}

function buildCoverResource(
  sourceUrl: string,
  fetchedImage: { data: Buffer; mediaType: string },
  coverData: Buffer,
): EpubResource {
  const coverExtension = MIME_EXTENSION_MAP[fetchedImage.mediaType] || "jpg";
  const coverHash = crypto.createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10);
  return {
    id: "cover-image",
    href: `images/cover-${coverHash}.${coverExtension}`,
    mediaType: fetchedImage.mediaType,
    data: coverData,
    properties: "cover-image",
  };
}

async function resolveFirstImageCoverFromHtml(
  html: string,
  pageUrl: string,
): Promise<{ coverResource?: EpubResource; coverMethod?: CoverSelectionMethod }> {
  if (!html.trim()) return {};
  const { document } = parseHTML(`<article>${html}</article>`);
  const article = document.querySelector("article");
  if (!article) return {};

  const imageElements = Array.from(article.querySelectorAll("img")) as ImageElementLike[];
  for (const imageElement of imageElements) {
    const candidate = chooseImageUrl(imageElement, pageUrl);
    if (!candidate) continue;

    try {
      const fetched = await fetchImage(candidate, pageUrl);
      if (!fetched || !SUPPORTED_IMAGE_MIME_TYPES.has(fetched.mediaType)) {
        continue;
      }

      const resized = await resizeImageForCover(fetched.data, fetched.mediaType);
      return {
        coverResource: buildCoverResource(candidate, fetched, resized ?? fetched.data),
        coverMethod: "first-image",
      };
    } catch {
      // Keep scanning until a compatible image is found.
    }
  }

  return {};
}

async function resolveEpubCoverPreview(
  inputState: ArticleData,
  options?: { shareEpubCover?: boolean; disableArticleLinks?: boolean; includeTitleInMarkdown?: boolean },
): Promise<{ coverResource?: EpubResource; coverMethod?: CoverSelectionMethod }> {
  if (options?.shareEpubCover === false) {
    return {};
  }

  const includeTitleInMarkdown = options?.includeTitleInMarkdown ?? true;
  const markdown = buildMarkdown(inputState.title, inputState.markdownBody, { includeTitle: includeTitleInMarkdown });
  let articleHtml = markdownToHtml(markdown);
  if (options?.disableArticleLinks) {
    articleHtml = stripLinksFromHtml(articleHtml);
  }

  const fromSelectors = await pickCoverFromSelectors({
    sourceHtml: inputState.sourceHtml,
    pageUrl: inputState.pageUrl,
    selectors: inputState.coverSelectors,
  });
  if (fromSelectors.coverResource) {
    return {
      coverResource: fromSelectors.coverResource,
      coverMethod: fromSelectors.coverMethod,
    };
  }

  return resolveFirstImageCoverFromHtml(articleHtml, inputState.pageUrl);
}

async function buildEpubPreviewMetadata(inputState: ArticleData): Promise<EpubPreviewMetadata> {
  const preferences = await resolveSendPreferences();
  const sendMethod = preferences.sendMethod ?? "app";
  const extensionPreferences = getPreferenceValues<{ shareEpubCover?: boolean; disableArticleLinks?: boolean }>();
  const shareEpubCover = extensionPreferences.shareEpubCover !== false;
  const disableArticleLinks = extensionPreferences.disableArticleLinks === true;
  const includeTitleInMarkdown = sendMethod !== "email";
  const domain =
    inputState.author ||
    extractBaseDomainFromUrl(inputState.pageUrl) ||
    extractDomainFromUrl(inputState.pageUrl) ||
    "Unknown";

  if (!shareEpubCover) {
    return {
      domain,
      coverMethodLabel: "Disabled by preference",
      coverStatusLabel: "Cover sharing is disabled.",
    };
  }

  const coverPreview = await resolveEpubCoverPreview(inputState, {
    shareEpubCover,
    disableArticleLinks,
    includeTitleInMarkdown,
  });

  if (!coverPreview.coverResource) {
    return {
      domain,
      coverMethodLabel: "No cover found",
      coverStatusLabel: "No image found (CSS selectors and first article image).",
    };
  }

  const coverMethodLabel = coverPreview.coverMethod === "css-selector" ? "Cover Skill" : "First article image";
  const coverThumbnail = `data:${coverPreview.coverResource.mediaType};base64,${coverPreview.coverResource.data.toString("base64")}`;

  // Create a smaller thumbnail for the preview screen (240px) to improve loading speed
  const previewData = await resizeImageForPreview(
    coverPreview.coverResource.data,
    coverPreview.coverResource.mediaType,
  );
  const coverPreviewThumbnail = previewData
    ? `data:${coverPreview.coverResource.mediaType};base64,${previewData.toString("base64")}`
    : coverThumbnail;

  return {
    domain,
    coverMethodLabel,
    coverStatusLabel: "Cover ready",
    coverThumbnail,
    coverPreviewThumbnail,
  };
}

function hasSupportedExtension(candidate: string): boolean {
  try {
    if (candidate.startsWith("data:")) return false;
    const url = new URL(candidate, "https://example.com");
    const extension = path.extname(url.pathname).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif"].includes(extension);
  } catch {
    return false;
  }
}

function extractOriginalImageUrlCandidate(candidate: string, pageUrl: string): string | null {
  try {
    if (candidate.startsWith("data:")) return null;
    const parsed = new URL(candidate, pageUrl);
    const original = parsed.searchParams.get("url");
    if (!original) return null;
    const resolvedOriginal = new URL(original, parsed).toString();
    if (!resolvedOriginal || resolvedOriginal === parsed.toString()) return null;
    return resolvedOriginal;
  } catch {
    return null;
  }
}

async function fetchImage(url: string, pageUrl?: string): Promise<{ data: Buffer; mediaType: string } | null> {
  if (url.startsWith("data:")) {
    const decoded = decodeDataUri(url);
    if (!decoded) return null;
    return normalizeImage(decoded.data, decoded.mediaType);
  }

  const fetcher = (globalThis as unknown as { fetch?: Fetcher }).fetch;
  if (!fetcher) return null;

  const headers: Record<string, string> = {
    Accept: "image/png,image/jpeg,image/gif,image/*;q=0.8,*/*;q=0.5",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (pageUrl) {
    try {
      const refererUrl = new URL(pageUrl);
      headers["Referer"] = refererUrl.origin + refererUrl.pathname;
    } catch {
      // Ignore invalid pageUrl
    }
  }

  try {
    const response = await fetcher(url, { headers });

    if (!response.ok) {
      const originalCandidate = pageUrl ? extractOriginalImageUrlCandidate(url, pageUrl) : null;
      if (originalCandidate && originalCandidate !== url) {
        return fetchImage(originalCandidate, pageUrl);
      }
      return null;
    }
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType?.startsWith("image/")) return null;
    if (!INPUT_IMAGE_MIME_TYPES.has(contentType)) return null;

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const normalized = await normalizeImage(data, contentType);
    if (normalized) return normalized;

    const originalCandidate = pageUrl ? extractOriginalImageUrlCandidate(url, pageUrl) : null;
    if (originalCandidate && originalCandidate !== url) {
      return fetchImage(originalCandidate, pageUrl);
    }
    return null;
  } catch {
    const originalCandidate = pageUrl ? extractOriginalImageUrlCandidate(url, pageUrl) : null;
    if (originalCandidate && originalCandidate !== url) {
      return fetchImage(originalCandidate, pageUrl);
    }
    return null;
  }
}

function decodeDataUri(dataUri: string): { data: Buffer; mediaType: string } | null {
  const match = dataUri.match(/^data:([^;,]+)?(;base64)?,/i);
  if (!match) return null;
  const mediaType = match[1]?.toLowerCase() || "image/png";
  if (!INPUT_IMAGE_MIME_TYPES.has(mediaType)) return null;
  const isBase64 = Boolean(match[2]);
  const dataPart = dataUri.slice(match[0].length);
  try {
    const buffer = isBase64 ? Buffer.from(dataPart, "base64") : Buffer.from(decodeURIComponent(dataPart));
    return { data: buffer, mediaType };
  } catch {
    return null;
  }
}

async function normalizeImage(data: Buffer, mediaType: string): Promise<{ data: Buffer; mediaType: string } | null> {
  if (mediaType === "image/webp") {
    const converted = await convertImageToJpegWithSips(data, "webp");
    if (!converted) return null;
    return { data: converted, mediaType: "image/jpeg" };
  }

  if (mediaType === "image/avif") {
    const converted = await convertImageToJpegWithSips(data, "avif");
    if (!converted) return null;
    return { data: converted, mediaType: "image/jpeg" };
  }

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mediaType)) return null;
  return { data, mediaType };
}

const execFileAsync = promisify(execFile);

async function convertImageToJpegWithSips(data: Buffer, format: "webp" | "avif"): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;

  const tempDir = path.join(os.tmpdir(), "send-to-kindle-images");
  await mkdir(tempDir, { recursive: true });
  const token = crypto.randomUUID();
  const inputPath = path.join(tempDir, `image-${token}.${format}`);
  const outputPath = path.join(tempDir, `image-${token}.jpg`);

  try {
    await writeFile(inputPath, data);
    await execFileAsync("sips", ["-s", "format", "jpeg", inputPath, "--out", outputPath]);
    return await readFile(outputPath);
  } catch {
    return null;
  }
}

async function resizeImageForCover(data: Buffer, mediaType: string): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;

  const tempDir = path.join(os.tmpdir(), "send-to-kindle-cover");
  await mkdir(tempDir, { recursive: true });
  const token = crypto.randomUUID();
  const extension = MIME_EXTENSION_MAP[mediaType] || "jpg";
  const inputPath = path.join(tempDir, `cover-${token}.${extension}`);
  const resizedPath = path.join(tempDir, `cover-${token}-resized.${extension}`);
  const outputPath = path.join(tempDir, `cover-${token}-cropped.${extension}`);

  try {
    await writeFile(inputPath, data);
    const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", inputPath]);
    const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/i);
    const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/i);
    const width = widthMatch ? Number(widthMatch[1]) : NaN;
    const height = heightMatch ? Number(heightMatch[1]) : NaN;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const scale = Math.max(COVER_MAX_WIDTH / width, COVER_MAX_HEIGHT / height, 1);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    await execFileAsync("sips", ["-z", String(targetHeight), String(targetWidth), inputPath, "--out", resizedPath]);
    await execFileAsync("sips", [
      "-c",
      String(COVER_MAX_HEIGHT),
      String(COVER_MAX_WIDTH),
      resizedPath,
      "--out",
      outputPath,
    ]);
    return await readFile(outputPath);
  } catch {
    return null;
  }
}

async function resizeImageForPreview(data: Buffer, mediaType: string): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;

  const tempDir = path.join(os.tmpdir(), "send-to-kindle-preview");
  await mkdir(tempDir, { recursive: true });
  const token = crypto.randomUUID();
  const extension = MIME_EXTENSION_MAP[mediaType] || "jpg";
  const inputPath = path.join(tempDir, `preview-${token}.${extension}`);
  const outputPath = path.join(tempDir, `preview-${token}-resized.${extension}`);

  try {
    await writeFile(inputPath, data);

    // Resize to 240px width maintaining aspect ratio
    await execFileAsync("sips", ["-Z", "240", inputPath, "--out", outputPath]);

    return await readFile(outputPath);
  } catch {
    return null;
  } finally {
    try {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function buildMarkdown(title: string, markdownBody: string, options?: { includeTitle?: boolean }): string {
  const safeTitle = title.trim() || "Reading";
  const normalizedTitle = safeTitle.replace(/\\\[/g, "(").replace(/\\\]/g, ")");
  const body = markdownBody.trim().replace(/\\\[/g, "(").replace(/\\\]/g, ")");
  const includeTitle = options?.includeTitle ?? true;
  if (!body) return includeTitle ? `# ${normalizedTitle}` : "";
  return includeTitle ? `# ${normalizedTitle}\n\n${body}` : body;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeFence = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = inlineMarkdownToHtml(paragraph.join(" ").trim());
    if (text) html.push(`<p>${text}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type: "ul" | "ol") => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const code = escapeHtml(codeLines.join("\n"));
        const langClass = codeFence ? ` class="language-${escapeHtml(codeFence)}"` : "";
        html.push(`<pre><code${langClass}>${code}</code></pre>`);
        inCodeBlock = false;
        codeFence = "";
        codeLines = [];
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
        codeFence = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const content = inlineMarkdownToHtml(headingMatch[2].trim());
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      openList("ul");
      html.push(`<li>${inlineMarkdownToHtml(unorderedMatch[1].trim())}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      openList("ol");
      html.push(`<li>${inlineMarkdownToHtml(orderedMatch[1].trim())}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCodeBlock) {
    const code = escapeHtml(codeLines.join("\n"));
    html.push(`<pre><code>${code}</code></pre>`);
  }

  flushParagraph();
  closeList();

  return html.join("\n");
}

function stripLinksFromHtml(html: string): string {
  if (!html.trim()) return html;

  const { document } = parseHTML(`<article>${html}</article>`);
  const article = document.querySelector("article");
  if (!article) return html;

  const anchors = Array.from(article.querySelectorAll("a")) as Array<{
    firstChild: unknown;
    parentNode?: {
      insertBefore: (node: unknown, anchor: unknown) => void;
      removeChild: (node: unknown) => void;
    };
  }>;

  for (const anchor of anchors) {
    const parent = anchor.parentNode;
    if (!parent) continue;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
  }

  return article.innerHTML;
}

function inlineMarkdownToHtml(value: string): string {
  let output = escapeHtml(value);

  const codeSpans: string[] = [];
  output = output.replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${url}" alt="${alt}" />`;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    return `<a href="${url}">${applyInlineEmphasis(text)}</a>`;
  });

  output = applyInlineEmphasis(output);

  for (let i = 0; i < codeSpans.length; i += 1) {
    const token = `\u0000CODE${i}\u0000`;
    output = output.replace(token, codeSpans[i]);
  }

  return output;
}

function applyInlineEmphasis(value: string): string {
  let output = value;

  output = output.replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`);
  output = output.replace(
    /(^|[^A-Za-z0-9])__(?=\S)([^_]*?\S)__([^A-Za-z0-9]|$)/g,
    (_, pre, bold, post) => `${pre}<strong>${bold}</strong>${post}`,
  );
  output = output.replace(/\*([^*]+)\*/g, (_, italic) => `<em>${italic}</em>`);
  output = output.replace(
    /(^|[^A-Za-z0-9])_(?=\S)([^_]*?\S)_([^A-Za-z0-9]|$)/g,
    (_, pre, italic, post) => `${pre}<em>${italic}</em>${post}`,
  );

  return output;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function openWithSendToKindle(filePath: string): Promise<boolean> {
  try {
    await open(filePath, "Send to Kindle");
    return true;
  } catch {
    // Fall back to finding an app by name that can open .epub
  }

  try {
    const apps = await getApplications(filePath);
    const app = apps.find((candidate) => candidate.name.toLowerCase().includes("send to kindle"));
    if (!app) return false;
    await open(filePath, app);
    return true;
  } catch {
    return false;
  }
}
