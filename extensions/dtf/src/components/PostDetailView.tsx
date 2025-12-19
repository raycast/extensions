import { Detail, ActionPanel, Action, Icon, Image, Keyboard, AI, environment, showHUD, Clipboard } from "@raycast/api";
import { DisplayPost, PostBlock, MediaItem } from "../api/types";
import { formatDate, formatNumber } from "../utils/formatters";
import { AIPostView } from "./AIPostView";
import { getPostTextContent, getTLDRPrompt } from "../utils/ai-helpers";

interface PostDetailViewProps {
  readonly post: DisplayPost;
  readonly blocks?: PostBlock[];
}

// Format audio/video duration
function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Removes HTML tags but keeps text
function stripHtml(html: string): string {
  return html.replaceAll(/<[^>]+>/g, "").trim();
}

// Convert HTML to markdown
function htmlToMarkdown(html: string): string {
  let result = html;

  // 1. Handle <b>...<a>text</a>...</b> — link inside bold block
  // <b>6. <a href="url">Title</a><br /></b> → **6. [Title](url)**\n\n
  result = result.replaceAll(/<b>([\s\S]*?)<\/b>/gi, (_, boldContent) => {
    // Process links inside bold block
    let inner = boldContent;

    // Replace links inside bold with markdown links
    inner = inner.replaceAll(
      /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
      (__: string, url: string, linkContent: string) => {
        const linkText = stripHtml(linkContent);
        return `[${linkText}](${url})`;
      },
    );

    // Remove <br> at the end of bold block and replace with line break after
    const hasBrAtEnd = /<br\s*\/?>\s*$/.test(inner);
    inner = inner.replaceAll(/<br\s*\/?>/g, "");

    // Clean remaining tags
    inner = stripHtml(inner).trim();

    if (!inner) return "";

    return `**${inner}**${hasBrAtEnd ? "\n\n" : ""}`;
  });

  // 2. Handle remaining links (not inside bold)
  result = result.replaceAll(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, url, content) => {
    const linkText = stripHtml(content);
    // Check if text was bold inside the link
    const isBold = /<b>|<strong>/i.test(content);
    const isItalic = /<i>|<em>/i.test(content);

    let linkMd = `[${linkText}](${url})`;
    if (isBold) linkMd = `**${linkMd}**`;
    if (isItalic) linkMd = `*${linkMd}*`;

    return linkMd;
  });

  // 3. Paragraphs and line breaks
  result = result
    .replaceAll("<p>", "")
    .replaceAll("</p>", "\n\n")
    .replaceAll(/<br\s*\/?>/g, "\n\n");

  // 4. Remaining Bold and Italic
  result = result
    .replaceAll("<b>", "**")
    .replaceAll("</b>", "**")
    .replaceAll("<strong>", "**")
    .replaceAll("</strong>", "**")
    .replaceAll("<i>", "*")
    .replaceAll("</i>", "*")
    .replaceAll("<em>", "*")
    .replaceAll("</em>", "*");

  // 5. Remove remaining tags
  result = result.replaceAll(/<[^>]+>/g, "").trim();

  // 6. Cleanup: remove empty ** and normalize
  result = result
    .replaceAll(/\*\*\s*\*\*/g, " ")
    .replaceAll("****", "")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

  // 7. Convert hashtags to clickable links
  result = result.replaceAll(/#([a-zA-Zа-яА-ЯёЁ0-9_]+)/g, (_, tag) => {
    const encodedTag = encodeURIComponent(tag);
    return `[#${tag}](https://dtf.ru/tag/${encodedTag})`;
  });

  return result;
}

// Content block handlers
function renderMediaBlock(block: PostBlock): string[] {
  const results: string[] = [];
  if (!block.data?.items || !Array.isArray(block.data.items)) return results;

  for (const item of block.data.items as MediaItem[]) {
    if (!item.image?.data?.uuid) continue;

    const uuid = item.image.data.uuid;
    const imageType = item.image.data.type;
    const hasAudio = item.image.data.has_audio;

    if (imageType === "gif" && hasAudio) {
      const videoUrl = `https://leonardo.osnova.io/${uuid}/-/format/mp4/`;
      const previewUrl = `https://leonardo.osnova.io/${uuid}/-/preview/800/`;
      results.push(`[![▶️ Video](${previewUrl})](${videoUrl})`);
      if (item.title) results.push(`*${htmlToMarkdown(item.title)}*`);
    } else {
      const imageUrl = `https://leonardo.osnova.io/${uuid}/-/preview/800/`;
      results.push(`![](${imageUrl})`);
      if (item.title) results.push(`*${htmlToMarkdown(item.title)}*`);
    }
  }
  return results;
}

function renderVideoBlock(block: PostBlock): string[] {
  const results: string[] = [];
  if (!block.data?.video?.data?.external_service) return results;

  const service = block.data.video.data.external_service;
  const thumbnailUuid = block.data.video.data.thumbnail?.data?.uuid;

  if (service.name === "youtube" && service.id) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${service.id}`;
    const thumbnailUrl = thumbnailUuid
      ? `https://leonardo.osnova.io/${thumbnailUuid}/-/preview/800/`
      : `https://img.youtube.com/vi/${service.id}/maxresdefault.jpg`;
    results.push(`[![▶️ YouTube](${thumbnailUrl})](${youtubeUrl})`, `[🔗 Watch on YouTube →](${youtubeUrl})`);
  } else if (service.name === "vimeo" && service.id) {
    const vimeoUrl = `https://vimeo.com/${service.id}`;
    if (thumbnailUuid) {
      results.push(`[![▶️ Vimeo](https://leonardo.osnova.io/${thumbnailUuid}/-/preview/800/)](${vimeoUrl})`);
    }
    results.push(`[🔗 Watch on Vimeo →](${vimeoUrl})`);
  } else if (service.name && service.id) {
    if (thumbnailUuid) {
      results.push(`![](https://leonardo.osnova.io/${thumbnailUuid}/-/preview/800/)`);
    }
    results.push(`*Video: ${service.name}*`);
  }
  return results;
}

function renderQuizBlock(block: PostBlock): string | null {
  const quizTitle = block.data?.title;
  if (typeof quizTitle !== "string" || !quizTitle) return null;

  const quizParts: string[] = [`📊 **${quizTitle}**`];
  const items = block.data.items;

  if (items && typeof items === "object" && !Array.isArray(items)) {
    const options = Object.values(items);
    for (let i = 0; i < options.length; i++) {
      quizParts.push(`${i + 1}. ${options[i]}`);
    }
  }

  if (block.data.is_public === false) {
    quizParts.push("\n*Anonymous poll*");
  }

  return quizParts.join("\n");
}

function renderPersonBlock(block: PostBlock): string {
  const personName = typeof block.data?.title === "string" ? block.data.title : "";
  const personRole = typeof block.data?.description === "string" ? block.data.description : "";
  const personAvatarUuid = block.data?.image?.data?.uuid;

  let personMd = "";
  if (personAvatarUuid) {
    personMd += `![](https://leonardo.osnova.io/${personAvatarUuid}/-/preview/100/)\n\n`;
  }
  personMd += `👤 **${personName}**`;
  if (personRole) {
    personMd += ` — ${personRole}`;
  }
  return personMd;
}

function renderListBlock(block: PostBlock): string[] {
  if (!block.data?.items || !Array.isArray(block.data.items)) return [];
  const isOrdered = block.data.type === "OL";
  const listItems = (block.data.items as string[]).map((item, i) => {
    const prefix = isOrdered ? `${i + 1}.` : "-";
    return `${prefix} ${htmlToMarkdown(item)}`;
  });
  return [listItems.join("\n")];
}

function renderQuoteBlock(block: PostBlock): string[] {
  if (!block.data?.text) return [];
  let quote = `> ${htmlToMarkdown(block.data.text)}`;
  if (block.data.subline1 && typeof block.data.subline1 === "string") {
    quote += `\n>\n> — *${block.data.subline1}*`;
  }
  return [quote];
}

function renderLinkBlock(block: PostBlock): string[] {
  if (!block.data?.link?.data?.url) return [];
  const url = block.data.link.data.url;
  const title = block.data.link.data.title || url;
  const description = block.data.link.data.description;
  let linkMd = `[🔗 ${title}](${url})`;
  if (description) linkMd += `\n\n*${description}*`;
  return [linkMd];
}

function renderCodeBlock(block: PostBlock): string[] {
  if (!block.data?.text) return [];
  const lang = typeof block.data.lang === "string" ? block.data.lang : "";
  return ["```" + lang + "\n" + block.data.text + "\n```"];
}

function formatEmbedDate(timestamp: number | undefined): string {
  if (typeof timestamp !== "number") return "";
  const postDate = new Date(timestamp * 1000);
  return postDate.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildEmbedMeta(data: Record<string, unknown>, dateStr: string): string {
  const parts: string[] = [];
  const author = data.author as { name?: string } | undefined;
  const subsite = data.subsite as { name?: string } | undefined;
  if (author?.name) parts.push(`👤 ${author.name}`);
  if (subsite?.name) parts.push(`📁 ${subsite.name}`);
  if (dateStr) parts.push(`📅 ${dateStr}`);
  return parts.length > 0 ? `> ${parts.join(" · ")}` : "";
}

function renderOsnovaEmbedBlock(block: PostBlock): string[] {
  // Data can be directly in block.data or nested in block.data.osnovaEmbed.data
  const blockData = block.data as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nestedEmbed = blockData?.osnovaEmbed as any;
  const data = (nestedEmbed?.data ?? blockData) as Record<string, unknown>;

  if (!data || data.isNotAvailable) return [];

  const title = typeof data.title === "string" ? data.title : "";
  const description = typeof data.description === "string" ? data.description : "";
  const url = typeof data.url === "string" ? data.url : "";
  const image = data.image as { data?: { uuid?: string } } | undefined;
  const imageUuid = image?.data?.uuid;
  const dateStr = formatEmbedDate(data.date as number | undefined);

  const results: string[] = [];

  // Preview image (clickable if url exists)
  if (imageUuid) {
    const imageUrl = `https://leonardo.osnova.io/${imageUuid}/-/preview/800/`;
    results.push(url ? `[![](${imageUrl})](${url})` : `![](${imageUrl})`);
  }

  // Title as link
  if (title) {
    results.push(url ? `> 📎 **[${title}](${url})**` : `> 📎 **${title}**`);
  }

  // Description
  if (description) {
    results.push(`> *${htmlToMarkdown(description)}*`);
  }

  // Metadata line
  const metaLine = buildEmbedMeta(data, dateStr);
  if (metaLine) results.push(metaLine);

  return results.length > 0 ? results : [`> 📎 *Встроенный пост недоступен*`];
}

function renderAudioBlock(block: PostBlock): string[] {
  if (!block.data?.audio?.data?.uuid) return [];
  const audioData = block.data.audio.data;
  const audioUrl = `https://leonardo.osnova.io/audio/${audioData.uuid}/${audioData.filename}`;
  const duration = formatDuration(audioData.audio_info?.duration);
  const audioTitle = typeof block.data.title === "string" && block.data.title ? block.data.title : audioData.filename;
  const durationPart = duration ? ` (${duration})` : "";
  return [`🎵 [${audioTitle}](${audioUrl})${durationPart}`];
}

// Block type to handler mapping
const blockRenderers: Record<string, (block: PostBlock) => string[]> = {
  text: (block) => (block.data?.text ? [htmlToMarkdown(block.data.text)] : []),
  header: (block) => {
    if (!block.data?.text) return [];
    const level = block.data.style === "h3" ? "###" : "##";
    return [`${level} ${htmlToMarkdown(block.data.text)}`];
  },
  media: renderMediaBlock,
  video: renderVideoBlock,
  list: renderListBlock,
  quote: renderQuoteBlock,
  incut: (block) => (block.data?.text ? [`> 📌 ${htmlToMarkdown(block.data.text)}`] : []),
  link: renderLinkBlock,
  code: renderCodeBlock,
  delimiter: () => ["⁂"],
  audio: renderAudioBlock,
  osnovaEmbed: renderOsnovaEmbedBlock,
  quiz: (block) => {
    const result = renderQuizBlock(block);
    return result ? [result] : [];
  },
  person: (block) => [renderPersonBlock(block)],
};

function renderBlock(block: PostBlock): string[] {
  const renderer = blockRenderers[block.type];
  return renderer ? renderer(block) : [];
}

// Convert blocks to markdown
function blocksToMarkdown(blocks: PostBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.hidden) continue;
    parts.push(...renderBlock(block));
  }

  return parts.join("\n\n");
}

export function PostDetailView({ post, blocks }: PostDetailViewProps) {
  const hasAIAccess = environment.canAccess(AI);

  const handleQuickTLDR = async () => {
    if (!hasAIAccess) {
      await showHUD("AI features require Raycast Pro");
      return;
    }

    await showHUD("Generating TLDR...");

    try {
      const postContent = getPostTextContent(post);
      const prompt = getTLDRPrompt(postContent);
      const tldr = await AI.ask(prompt, { creativity: "low" });

      await Clipboard.copy(tldr);
      await showHUD("TLDR copied to clipboard!");
    } catch {
      await showHUD("Failed to generate TLDR");
    }
  };

  // Generate content from blocks if they exist
  let contentMarkdown = "";

  if (blocks && blocks.length > 0) {
    // Skip cover blocks for main content (they are already in the cover)
    const contentBlocks = blocks.filter((b) => !b.cover || b.type !== "media");
    contentMarkdown = blocksToMarkdown(contentBlocks);
  } else if (post.excerpt) {
    // Fallback to excerpt if no blocks
    contentMarkdown = post.excerpt;
  }

  // Cover (first media block with cover=true)
  const coverMarkdown = post.coverImage ? `![](${post.coverImage})\n\n` : "";

  // Content only, without meta info (it's in sidebar)
  const markdown = `${coverMarkdown}# ${post.title}

${contentMarkdown}
`.trim();

  const showSubsite = post.subsite.name && post.subsite.name.length > 0;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={post.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Author"
            text={post.author.name}
            icon={post.author.avatar ? { source: post.author.avatar, mask: Image.Mask.Circle } : Icon.Person}
          />
          {showSubsite && (
            <Detail.Metadata.Label
              title="Topic"
              text={post.subsite.name}
              icon={post.subsite.avatar ? { source: post.subsite.avatar, mask: Image.Mask.Circle } : Icon.Folder}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Views" text={formatNumber(post.stats.views)} icon={Icon.Eye} />
          <Detail.Metadata.Label title="Comments" text={formatNumber(post.stats.comments)} icon={Icon.Bubble} />
          <Detail.Metadata.Label title="Likes" text={formatNumber(post.stats.likes)} icon={Icon.Heart} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Date" text={formatDate(post.date)} icon={Icon.Calendar} />
          <Detail.Metadata.Link title="Open" target={post.url} text="Read on DTF" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={post.url} title="Open in Browser" />
          </ActionPanel.Section>

          {hasAIAccess && (
            <ActionPanel.Section title="AI">
              <Action.Push
                icon={Icon.Document}
                title="Summarize"
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "s" },
                  Windows: { modifiers: ["ctrl"], key: "s" },
                }}
                target={<AIPostView post={post} mode="summarize" />}
              />
              <Action.Push
                icon={Icon.Globe}
                title="Translate to English"
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "t" },
                  Windows: { modifiers: ["ctrl"], key: "t" },
                }}
                target={<AIPostView post={post} mode="translate" />}
              />
              <Action.Push
                icon={Icon.BulletPoints}
                title="Extract Key Points"
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "k" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
                }}
                target={<AIPostView post={post} mode="keypoints" />}
              />
              <Action
                icon={Icon.Stars}
                title="Quick TLDR (Copy)"
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "s" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                }}
                onAction={handleQuickTLDR}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action.CopyToClipboard content={post.url} title="Copy Link" shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard
              content={post.title}
              title="Copy Title"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
