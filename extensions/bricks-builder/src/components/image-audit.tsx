import {
  Action,
  ActionPanel,
  AI,
  Color,
  environment,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ReactElement, useMemo, useState } from "react";
import { ErrorEmptyView } from "./site-empty-view";
import {
  AuditImage,
  DynamicImage,
  getImageAudit,
  ImageAudit,
  ImageIssue,
  ImageKind,
  largeImageKb,
  setAltText,
} from "../lib/bricks-data";
import { Site } from "../lib/sites";
import { adminEditUrl } from "../lib/wordpress";

const ISSUES: Record<ImageIssue, { title: string; color: Color }> = {
  missing_alt: { title: "No Alt Text", color: Color.Orange },
  filename_alt: { title: "File Name as Alt", color: Color.Yellow },
  large: { title: "Large File", color: Color.Red },
  oversized: { title: "Oversized", color: Color.Orange },
  old_format: { title: "JPEG/PNG", color: Color.Blue },
  broken: { title: "Broken", color: Color.Red },
};

const KINDS: Record<ImageKind, { title: string; icon: Icon }> = {
  image: { title: "Image Elements", icon: Icon.Image },
  gallery: { title: "Image Galleries", icon: Icon.AppWindowGrid2x2 },
  background: { title: "Backgrounds", icon: Icon.Desktop },
  inline: { title: "<img> in Text and Code", icon: Icon.Code },
};

/** Most serious first: what a row's tag shows when no issue filter is active. */
const SEVERITY: ImageIssue[] = ["broken", "large", "missing_alt", "oversized", "filename_alt", "old_format"];

/** Rough size after converting to WebP: lossy WebP of a PNG photo or screenshot is far smaller; of a JPEG, about a third smaller. */
function webpEstimate(image: AuditImage): number | null {
  const bytes = image.served?.filesize;
  if (!bytes) return null;
  if (image.mime === "image/png") return bytes * 0.25;
  if (image.mime === "image/jpeg") return bytes * 0.7;
  return null;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "–";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Where an image is used: page titles and component names, without repeats. */
function placesOf(image: AuditImage): string[] {
  return [...new Set(image.usages.map((u) => (u.post ? u.post.title || "(no title)" : `${u.component} (component)`)))];
}

const needsLibraryAlt = (image: AuditImage) =>
  image.issues.includes("missing_alt") && image.alt_fix === "library" && image.id !== null && image.can_edit;

function matches(image: AuditImage, filter: string): boolean {
  const [type, value] = filter.split(":");
  if (type === "unused") return image.unused;
  if (image.unused) return false;
  switch (type) {
    case "issue":
      return value === "any" ? image.issues.length > 0 : image.issues.includes(value as ImageIssue);
    case "kind":
      return image.usages.some((u) => u.kind === value);
    case "loc":
      return image.usages.some((u) => u.component !== null);
    case "fix":
      return image.issues.includes("missing_alt") && image.alt_fix === value;
    case "page":
      return image.usages.some((u) => u.post?.id === Number(value));
    default:
      return true;
  }
}

/** Images in Bricks with their issues; `preset` is the dropdown's starting filter (e.g. "issue:missing_alt"). */
export function ImageList(props: { site: Site; preset: string }) {
  const { site } = props;
  const [filter, setFilter] = useState(props.preset);
  const [showingDetail, setShowingDetail] = useCachedState("audit-images:detail", true);
  const { data, isLoading, error, revalidate } = useCachedPromise(getImageAudit, [site, largeImageKb()], {
    keepPreviousData: true,
  });

  const pages = useMemo(() => {
    const map = new Map<number, string>();
    for (const image of data?.images ?? []) {
      for (const usage of image.usages) if (usage.post) map.set(usage.post.id, usage.post.title || "(no title)");
    }
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const visible = (data?.images ?? []).filter((image) => matches(image, filter));
  const showDynamic = filter === "kind:dynamic";
  const queue = visible.filter(needsLibraryAlt);

  const listActions = (
    <ActionPanel.Section>
      <Action
        title={showingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowingDetail(!showingDetail)}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && !showDynamic && visible.length > 0}
      navigationTitle={`Images · ${site.name}`}
      searchBarPlaceholder="Filter by file name, page, alt text, issue or source…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={setFilter}>
          <List.Dropdown.Section title="Issues">
            <List.Dropdown.Item title="All Issues" value="issue:any" icon={Icon.Warning} />
            {(Object.keys(ISSUES) as ImageIssue[]).map((issue) => (
              <List.Dropdown.Item key={issue} title={ISSUES[issue].title} value={`issue:${issue}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Missing Alt Text">
            <List.Dropdown.Item title="Fixable in Media Library" value="fix:library" icon={Icon.Image} />
            <List.Dropdown.Item title="Fix in Bricks" value="fix:bricks" icon={Icon.Hammer} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Source">
            <List.Dropdown.Item title="All Images in Bricks" value="all" />
            {(Object.keys(KINDS) as ImageKind[]).map((kind) => (
              <List.Dropdown.Item key={kind} title={KINDS[kind].title} value={`kind:${kind}`} icon={KINDS[kind].icon} />
            ))}
            <List.Dropdown.Item title="In Components" value="loc:component" icon={Icon.Box} />
            <List.Dropdown.Item title="Dynamic Data" value="kind:dynamic" icon={Icon.Bolt} />
            <List.Dropdown.Item
              title={`Unused in Bricks, No Alt (${data?.unused_library_total ?? 0})`}
              value="unused"
              icon={Icon.Folder}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Page">
            {pages.map(([id, title]) => (
              <List.Dropdown.Item key={id} title={title} value={`page:${id}`} icon={Icon.Document} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorEmptyView error={error} actions={listActions} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={isLoading ? "Checking images…" : "Nothing here"}
          actions={<ActionPanel>{listActions}</ActionPanel>}
        />
      )}
      {showDynamic && data && <DynamicSection images={data.dynamic} actions={listActions} />}
      {!showDynamic && data && (
        <List.Section
          title={filter === "unused" ? "Newest 300, not used by Bricks" : `${visible.length} images`}
          subtitle={
            filter === "unused" && data.unused_library_total > visible.length
              ? `of ${data.unused_library_total.toLocaleString()}`
              : undefined
          }
        >
          {visible.map((image) => (
            <ImageItem
              key={image.key}
              site={site}
              image={image}
              audit={data}
              queue={queue}
              showingDetail={showingDetail}
              focusIssue={filter.startsWith("issue:") ? (filter.slice(6) as ImageIssue) : undefined}
              onChange={revalidate}
              listActions={listActions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function issueNotes(image: AuditImage, audit: ImageAudit): { issue: ImageIssue; text: string }[] {
  const notes: { issue: ImageIssue; text: string }[] = [];
  const served = image.served;
  const webp = webpEstimate(image);
  const add = (issue: ImageIssue, text: string) => notes.push({ issue, text });
  for (const issue of image.issues) {
    if (issue === "missing_alt") {
      add(
        issue,
        image.alt_fix === "bricks"
          ? image.usages.some((u) => u.kind === "inline")
            ? "**No alt text:** an `<img>` tag in text or code has no `alt` attribute. Add it in Bricks."
            : "**No alt text:** the image isn't in the media library, so set the alt text on the element in Bricks."
          : "**No alt text:** none in the media library, and the element doesn't set its own.",
      );
    }
    if (issue === "filename_alt") add(issue, `**File name as alt:** “${image.alt}” doesn't describe the image.`);
    if (issue === "large" && served) {
      add(
        issue,
        `**Large file:** ${formatBytes(served.filesize)} served (the ${served.size} size, ${served.width}×${served.height}); the limit is ${formatBytes(audit.thresholds.large_bytes)}.${webp ? ` As WebP it would likely be around ${formatBytes(webp)}.` : ""}${served.size === "full" && (image.width ?? 0) > 1200 ? " Or pick a smaller image size in the element." : ""}`,
      );
    }
    if (issue === "oversized" && served) {
      add(
        issue,
        `**Oversized:** served ${served.width}px wide; no screen needs more than ${audit.thresholds.oversized_width}px. Pick a smaller image size in the element.`,
      );
    }
    if (issue === "old_format") {
      add(
        issue,
        `**JPEG/PNG:** WebP or AVIF is usually much smaller at the same quality${webp ? ` (around ${formatBytes(webp)} instead of ${formatBytes(served?.filesize)})` : ""}.`,
      );
    }
    if (issue === "broken") {
      add(
        issue,
        image.missing_id
          ? `**Broken:** elements point to media library image #${image.missing_id}, which doesn't exist on this site (deleted, or copied from another site). Pick the image again in Bricks.`
          : "**Broken:** the file doesn't exist on this site.",
      );
    }
  }
  return notes;
}

function ImageItem(props: {
  site: Site;
  image: AuditImage;
  audit: ImageAudit;
  queue: AuditImage[];
  showingDetail: boolean;
  /** The issue the list is filtered by: its tag and explanation come first. */
  focusIssue?: ImageIssue;
  onChange: () => void;
  listActions: ReactElement;
}) {
  const { site, image, queue } = props;
  const places = placesOf(image);
  const kinds = [...new Set(image.usages.map((u) => u.kind))];
  const posts = [...new Map(image.usages.filter((u) => u.post).map((u) => [u.post!.id, u.post!])).values()];
  const notes = issueNotes(image, props.audit);
  const position = queue.findIndex((i) => i.key === image.key);
  const { push } = useNavigation();

  // The filtered issue first, then the most serious, so the reason the image is listed is what you see.
  const issues = [...image.issues].sort(
    (a, b) =>
      Number(b === props.focusIssue) - Number(a === props.focusIssue) || SEVERITY.indexOf(a) - SEVERITY.indexOf(b),
  );
  const tagText = (issue: ImageIssue) =>
    issue === "large" && image.served?.filesize
      ? `${ISSUES.large.title} · ${formatBytes(image.served.filesize)}`
      : ISSUES[issue].title;
  const firstTag: List.Item.Accessory[] = issues.length
    ? [
        {
          tag: { value: tagText(issues[0]), color: ISSUES[issues[0]].color },
          tooltip: issues.map((i) => ISSUES[i].title).join(", "),
        },
        ...(issues.length > 1 ? [{ text: `+${issues.length - 1}` }] : []),
      ]
    : [];
  const markdown = [
    notes
      .sort((a, b) => Number(b.issue === props.focusIssue) - Number(a.issue === props.focusIssue))
      .map((n) => `- ${n.text}`)
      .join("\n"),
    image.preview ? `<img src="${image.preview}" alt="" height="160" />` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <List.Item
      icon={image.preview ? { source: image.preview, fallback: Icon.Image } : Icon.Image}
      title={image.filename || image.url || "Image"}
      subtitle={props.showingDetail ? undefined : places.join(", ")}
      keywords={[
        ...places,
        ...(image.alt ? [image.alt] : []),
        ...(image.title ? [image.title] : []),
        ...image.issues.map((i) => ISSUES[i].title),
        ...kinds.map((k) => KINDS[k].title),
        ...(image.mime ? [image.mime] : []),
      ]}
      accessories={
        props.showingDetail
          ? firstTag
          : [...firstTag, { text: `${image.usage_count}×`, tooltip: kinds.map((k) => KINDS[k].title).join(", ") }]
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Alt Text"
                text={image.decorative ? "Decorative (empty on purpose)" : (image.alt ?? "None")}
              />
              {image.width ? (
                <List.Item.Detail.Metadata.Label
                  title="Original"
                  text={`${image.width}×${image.height} · ${formatBytes(image.filesize)}`}
                />
              ) : null}
              {image.served && (
                <List.Item.Detail.Metadata.Label
                  title="Served"
                  text={`${image.served.size} · ${image.served.width}×${image.served.height} · ${formatBytes(image.served.filesize)}`}
                />
              )}
              {image.mime && <List.Item.Detail.Metadata.Label title="Type" text={image.mime} />}
              {image.issues.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Issues">
                  {image.issues.map((i) => (
                    <List.Item.Detail.Metadata.TagList.Item key={i} text={ISSUES[i].title} color={ISSUES[i].color} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              {image.unused ? (
                <List.Item.Detail.Metadata.Label title="Used In Bricks" text="No" />
              ) : (
                <List.Item.Detail.Metadata.Label
                  title="Used"
                  text={`${image.usage_count}× in ${kinds.map((k) => KINDS[k].title.toLowerCase()).join(", ")}`}
                />
              )}
              {places.slice(0, 8).map((place, index) => (
                <List.Item.Detail.Metadata.Label key={place} title={index === 0 ? "On" : ""} text={place} />
              ))}
              {places.length > 8 && <List.Item.Detail.Metadata.Label title="" text={`+${places.length - 8} more`} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {needsLibraryAlt(image) && (
            <Action.Push
              title="Add Alt Text"
              icon={Icon.Text}
              target={<AltTextForm site={site} queue={[image]} onSaved={props.onChange} />}
            />
          )}
          {needsLibraryAlt(image) && queue.length > 1 && (
            <Action
              title={`Add Alt Text One by One (${queue.length - Math.max(position, 0)} Left)`}
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() =>
                push(<AltTextForm site={site} queue={queue.slice(Math.max(position, 0))} onSaved={props.onChange} />)
              }
            />
          )}
          {!needsLibraryAlt(image) && image.id !== null && image.can_edit && (
            <Action.Push
              title="Edit Alt Text"
              icon={Icon.Pencil}
              target={<AltTextForm site={site} queue={[image]} onSaved={props.onChange} />}
            />
          )}
          {posts.length === 1 && (
            <Action.OpenInBrowser title="Open in Bricks" icon={Icon.Hammer} url={posts[0].builder_url} />
          )}
          {posts.length > 1 && (
            <ActionPanel.Submenu title="Open in Bricks…" icon={Icon.Hammer}>
              {posts.map((p) => (
                <Action.OpenInBrowser key={p.id} title={p.title || "(no title)"} url={p.builder_url} />
              ))}
            </ActionPanel.Submenu>
          )}
          {image.id !== null && image.can_edit && !image.decorative && (
            <Action
              title="Mark as Decorative"
              icon={Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() => saveAlt(site, image, "", true, props.onChange)}
            />
          )}
          {image.id !== null && (
            <Action.OpenInBrowser
              title="Open in Media Library"
              icon={Icon.Image}
              url={adminEditUrl(site, image.id)}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          )}
          {image.url && (
            <Action.OpenInBrowser title="Open Image" url={image.url} shortcut={Keyboard.Shortcut.Common.Open} />
          )}
          {image.url && (
            <Action.CopyToClipboard
              title="Copy Image URL"
              content={image.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {props.listActions}
        </ActionPanel>
      }
    />
  );
}

function DynamicSection(props: { images: DynamicImage[]; actions: ReactElement }) {
  return (
    <List.Section title="Dynamic Images" subtitle="The image depends on the post or query, so it can't be checked here">
      {props.images.map((image, index) => (
        <List.Item
          key={`${image.element_id}-${index}`}
          icon={Icon.Bolt}
          title={image.tag}
          subtitle={image.post ? image.post.title || "(no title)" : `${image.component} (component)`}
          keywords={[image.kind, image.post?.title ?? "", image.component ?? ""]}
          accessories={[
            ...(image.kind !== "background" && !image.own_alt
              ? [{ tag: { value: "alt from media library", color: Color.SecondaryText } }]
              : []),
            { tag: KINDS[image.kind].title },
          ]}
          actions={
            <ActionPanel>
              {image.post && (
                <Action.OpenInBrowser title="Open in Bricks" icon={Icon.Hammer} url={image.post.builder_url} />
              )}
              <Action.CopyToClipboard title="Copy Tag" content={image.tag} shortcut={Keyboard.Shortcut.Common.Copy} />
              {props.actions}
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

async function saveAlt(site: Site, image: AuditImage, alt: string, decorative: boolean, onSaved: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: decorative ? "Marking as decorative…" : "Saving alt text…",
  });
  try {
    await setAltText(site, image.id as number, alt, decorative);
    toast.style = Toast.Style.Success;
    toast.title = decorative ? `${image.filename} marked as decorative` : `Saved alt text for ${image.filename}`;
    onSaved();
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't save";
    toast.message = errorMessage(error);
    return false;
  }
}

/** Raycast AI can't see the image, so the suggestion comes from its name, title, caption and where it's used. */
async function suggestAlt(image: AuditImage): Promise<string> {
  const context = [
    `File name: ${image.filename}`,
    image.title ? `Media library title: ${image.title}` : "",
    image.caption ? `Caption: ${image.caption}` : "",
    `Used on: ${placesOf(image).join(", ")}`,
    ...image.usages.filter((u) => u.label).map((u) => `Element label: ${u.label}`),
  ]
    .filter(Boolean)
    .join("\n");
  const answer = await AI.ask(
    `Write alt text for an image on a website, from what's known about it. One short, plain sentence under 120 characters, no "image of". If the name is meaningless (like a hash or IMG_1234), describe it from the page context and keep it generic. Reply with the alt text only.\n\n${context}`,
    { creativity: "low" },
  );
  return answer.trim().replace(/^"|"$/g, "");
}

/** A meaningful media library title is a better starting point than nothing. */
function initialAlt(image: AuditImage): string {
  if (image.alt && !image.issues.includes("filename_alt")) return image.alt;
  const title = image.title ?? "";
  const stem = image.filename.replace(/\.[a-z0-9]+$/i, "");
  if (!title || title === stem || /^[\w-]*\d{3,}[\w-]*$/.test(title) || /^[0-9a-f-]{16,}$/i.test(title)) return "";
  return title.replace(/[-_]+/g, " ");
}

/** Alt text for one image, or several in a row: saving moves on to the next. */
export function AltTextForm(props: { site: Site; queue: AuditImage[]; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [index, setIndex] = useState(0);
  const image = props.queue[index];
  const [alt, setAlt] = useState(() => initialAlt(props.queue[0]));
  const [suggesting, setSuggesting] = useState(false);
  const canUseAI = environment.canAccess(AI);
  const total = props.queue.length;

  function next() {
    if (index + 1 >= total) {
      pop();
      return;
    }
    setIndex(index + 1);
    setAlt(initialAlt(props.queue[index + 1]));
  }

  async function save(decorative: boolean) {
    if (!decorative && !alt.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Write alt text, or mark it decorative" });
      return;
    }
    if (await saveAlt(props.site, image, decorative ? "" : alt.trim(), decorative, props.onSaved)) next();
  }

  return (
    <Form
      isLoading={suggesting}
      navigationTitle={total > 1 ? `Alt Text · ${index + 1} of ${total}` : "Alt Text"}
      actions={
        <ActionPanel>
          <Action
            title={total > 1 ? "Save and Next" : "Save Alt Text"}
            icon={Icon.Check}
            onAction={() => save(false)}
          />
          {canUseAI && (
            <Action
              title="Suggest with AI"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={async () => {
                setSuggesting(true);
                try {
                  setAlt(await suggestAlt(image));
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't suggest",
                    message: errorMessage(error),
                  });
                } finally {
                  setSuggesting(false);
                }
              }}
            />
          )}
          <Action.OpenInBrowser title="View Image" url={image.url} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action
            title="Mark as Decorative"
            icon={Icon.EyeDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() => save(true)}
          />
          {total > 1 && (
            <Action title="Skip" icon={Icon.ArrowRight} shortcut={{ modifiers: ["cmd"], key: "]" }} onAction={next} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title={image.filename}
        text={[
          image.title && image.title !== image.filename ? `Title: ${image.title}` : "",
          `Used on: ${placesOf(image).join(", ") || "nothing in Bricks"}`,
          image.width ? `${image.width}×${image.height}` : "",
        ]
          .filter(Boolean)
          .join("\n")}
      />
      <Form.TextArea
        id="alt"
        title="Alt Text"
        placeholder="Describe what the image shows (⌘O to view it)"
        value={alt}
        onChange={setAlt}
      />
      <Form.Description
        text={`Saved in the media library, so every element using it without its own alt text gets it.${canUseAI ? " ⌘G suggests one with Raycast AI from the file name and page." : ""} Decorative images (⌘⇧E) keep an empty alt so screen readers skip them.`}
      />
    </Form>
  );
}
