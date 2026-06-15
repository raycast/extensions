import { SlackBlock, SlackBlockText, SlackHistoryMessage, SlackMessageSenderDetails, SlackReferences } from "./types";

function blockTextToString(text?: SlackBlockText): string {
  if (!text) return "";
  return text.type === "plain_text" ? text.value : text.text;
}

/** Resolve the display name of a message's sender from the thread's sender_profiles map. */
export function slackSenderName(
  message: SlackHistoryMessage,
  senderProfiles: Record<string, SlackMessageSenderDetails>,
): string {
  const key = message.user ?? message.bot_id ?? "";
  const profile = senderProfiles[key];
  if (!profile) return "Unknown";
  if (profile.type === "User") {
    return (
      profile.content.profile?.display_name || profile.content.real_name || profile.content.name || profile.content.id
    );
  }
  return profile.content.name;
}

/** Replace Slack reference tokens (<@U…>, <#C…>, <url|label>, <!here>) with markdown. */
function resolveReferences(text: string, references?: SlackReferences): string {
  let out = text;
  out = out.replace(/<@([A-Z0-9]+)(\|[^>]*)?>/g, (_match, id: string) => {
    const name = references?.users?.[id];
    return name ? `@${name}` : `@${id}`;
  });
  out = out.replace(/<#([A-Z0-9]+)(\|([^>]*))?>/g, (_match, id: string, _full: string, name: string) => {
    const refName = name || references?.channels?.[id];
    return refName ? `#${refName}` : `#${id}`;
  });
  out = out.replace(/<!subteam\^([A-Z0-9]+)(\|([^>]*))?>/g, (_match, id: string, _full: string, name: string) =>
    name ? `@${name}` : `@${id}`,
  );
  out = out.replace(/<!(here|channel|everyone)>/g, (_match, keyword: string) => `@${keyword}`);
  out = out.replace(/<(https?:[^|>]+)\|([^>]+)>/g, (_match, url: string, label: string) => `[${label}](${url})`);
  out = out.replace(/<(https?:[^|>]+)>/g, (_match, url: string) => url);
  return out;
}

/** Convert Slack mrkdwn emphasis to GitHub-flavoured markdown. */
function slackMrkdwnToMarkdown(text: string): string {
  let out = text;
  // *bold* -> **bold** (Slack uses single asterisks)
  out = out.replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?:]|$)/g, "$1**$2**");
  // ~strike~ -> ~~strike~~
  out = out.replace(/(^|[\s(])~(?!\s)([^~\n]+?)~(?=[\s).,!?:]|$)/g, "$1~~$2~~");
  return out;
}

function blockToMarkdown(block: SlackBlock): string {
  switch (block.type) {
    case "section": {
      const main = blockTextToString(block.text);
      const fields = block.fields?.map(blockTextToString).filter(Boolean).join("\n") ?? "";
      return [main, fields].filter(Boolean).join("\n");
    }
    case "header":
      return `### ${blockTextToString(block.text)}`;
    case "divider":
      return "---";
    case "image":
      return `![${block.alt_text}](${block.image_url})`;
    default:
      return "";
  }
}

/** Render a Slack message (text or blocks, files, reactions) as markdown. */
export function slackMessageToMarkdown(message: SlackHistoryMessage, references?: SlackReferences): string {
  const parts: string[] = [];

  let body = message.text ?? "";
  if (!body && message.blocks) {
    body = message.blocks.map(blockToMarkdown).filter(Boolean).join("\n\n");
  }
  if (body) {
    parts.push(slackMrkdwnToMarkdown(resolveReferences(body, references)));
  }

  if (message.files?.length) {
    parts.push(
      message.files
        .map((file) => {
          const name = file.title || file.name || "file";
          return file.permalink ? `📎 [${name}](${file.permalink})` : `📎 ${name}`;
        })
        .join("\n"),
    );
  }

  if (message.reactions?.length) {
    parts.push(`_${message.reactions.map((reaction) => `:${reaction.name}: ${reaction.count}`).join("  ")}_`);
  }

  return parts.join("\n\n") || "_No message content_";
}
