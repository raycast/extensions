import dedent from "dedent";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";

type Status = mastodon.v1.Status;

export function renderToMarkdown(status: Status) {
  const content = status.spoilerText || status.text || stripHtml(status.content).result;
  return dedent`
		## ${status.account.displayName} \`${status.account.acct}\`

    ${content.trim()}

    ${status.mediaAttachments.map((media) => {
      switch (media.type) {
        case "image":
        case "gifv":
          return `![${media.description ?? ""}](${media.previewUrl})`;
        default:
          return "";
      }
    })}

    ${status.card ? `[${status.card.title}](${status.card.url})` : ""}
	`;
}
