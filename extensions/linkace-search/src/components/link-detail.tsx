import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { buildLinkAceItemUrl, fetchLinkDetails, getReadableErrorMessage, isAbortError } from "../linkace-api";
import { type LinkAceLink } from "../types";

type Props = {
  link: LinkAceLink;
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
};

export function LinkDetail({ link, baseUrl, apiKey, proxyUrl }: Props) {
  const { error, isLoading, resolvedLink } = useResolvedLink({ link, baseUrl, apiKey, proxyUrl });
  const title = getItemTitle(resolvedLink);
  const linkAceItemUrl = useMemo(() => buildLinkAceItemUrl(baseUrl, resolvedLink.id), [baseUrl, resolvedLink.id]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(resolvedLink, error)}
      metadata={buildDetailMetadata(resolvedLink)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Link" url={resolvedLink.url} />
            <Action.OpenInBrowser
              title="Open in LinkAce"
              url={linkAceItemUrl}
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={resolvedLink.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Markdown Link"
              content={`[${title}](${resolvedLink.url})`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function getListItemIcon(link: LinkAceLink) {
  const hostname = getHostname(link.url);

  if (hostname) {
    return getFavicon(`https://${hostname}`, { fallback: Icon.Link });
  }

  return Icon.Link;
}

export function getListItemSubtitle(link: LinkAceLink) {
  return getShortUrl(link.url);
}

export function getListItemAccessories(link: LinkAceLink) {
  const accessories: List.Item.Accessory[] = [];

  if (Array.isArray(link.tags) && link.tags.length > 0) {
    const { shortText, fullText } = summarizeNames(link.tags.map((tag) => tag.name));
    accessories.push({
      icon: Icon.Tag,
      text: shortText,
      tooltip: `Tags: ${fullText}`,
    });
  }

  if (typeof link.visibility === "number" && link.visibility !== 1) {
    accessories.push({
      icon: { source: Icon.Circle, tintColor: getVisibilityColor(link.visibility) },
      tooltip: `Visibility: ${formatVisibility(link.visibility)}`,
    });
  }

  if (typeof link.status === "number" && link.status > 1) {
    accessories.push({
      icon: { source: getStatusIcon(link.status), tintColor: getStatusColor(link.status) },
      tooltip: `Status: ${formatStatus(link.status)}`,
    });
  }

  return accessories;
}

export function getItemTitle(link: LinkAceLink) {
  const title = link.title?.trim();
  return title && title.length > 0 ? title : link.url;
}

function useResolvedLink({ link, baseUrl, apiKey, proxyUrl }: Props) {
  const [resolvedLink, setResolvedLink] = useState(link);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!hasFullLinkDetails(link));

  useEffect(() => {
    setResolvedLink(link);
    setError(null);

    if (hasFullLinkDetails(link)) {
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function loadLinkDetails() {
      setIsLoading(true);

      try {
        const detailedLink = await fetchLinkDetails({
          baseUrl,
          apiKey,
          proxyUrl,
          linkId: link.id,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setResolvedLink(detailedLink);
        }
      } catch (fetchError) {
        if (isAbortError(fetchError)) {
          return;
        }

        setError(getReadableErrorMessage(fetchError, proxyUrl));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadLinkDetails();

    return () => {
      abortController.abort();
    };
  }, [apiKey, baseUrl, link, proxyUrl]);

  return { error, isLoading, resolvedLink };
}

function buildDetailMetadata(link: LinkAceLink) {
  const tags = link.tags ?? [];
  const lists = link.lists ?? [];

  return (
    <Detail.Metadata>
      <Detail.Metadata.Link title="URL" target={link.url} text={link.url} />
      <Detail.Metadata.Label title="Domain" text={getHostname(link.url) ?? "-"} />
      <Detail.Metadata.Label title="Visibility" text={formatVisibility(link.visibility)} />
      <Detail.Metadata.Label title="Status" text={formatStatus(link.status)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Created" text={formatDate(link.created_at)} />
      <Detail.Metadata.Label title="Updated" text={formatDate(link.updated_at)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Tags">
        {tags.length > 0 ? tags.map((tag) => <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />) : null}
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Lists">
        {lists.length > 0 ? lists.map((list) => <Detail.Metadata.TagList.Item key={list.id} text={list.name} />) : null}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function buildMarkdown(link: LinkAceLink, error?: string | null) {
  const title = getItemTitle(link);
  const description = link.description?.trim() ? link.description.trim() : "_No description available._";
  const tags = link.tags?.map((tag) => `- ${tag.name}`).join("\n") ?? "";
  const lists = link.lists?.map((list) => `- ${list.name}`).join("\n") ?? "";

  return [
    `# ${escapeMarkdown(title)}`,
    "",
    `[${escapeMarkdown(link.url)}](${link.url})`,
    "",
    description,
    error ? `\n> ${escapeMarkdown(error)}` : "",
    tags ? `\n## Tags\n\n${tags}` : "",
    lists ? `\n## Lists\n\n${lists}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMarkdown(value: string) {
  const charactersToEscape = new Set(["\\", "`", "*", "_", "{", "}", "[", "]", "(", ")", "#", "+", "-", ".", "!"]);
  return [...value].map((character) => (charactersToEscape.has(character) ? `\\${character}` : character)).join("");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatVisibility(value?: number | null) {
  switch (value) {
    case 1:
      return "Public";
    case 2:
      return "Internal";
    case 3:
      return "Private";
    default:
      return "Unknown";
  }
}

function formatStatus(value?: number | null) {
  switch (value) {
    case 1:
      return "OK";
    case 2:
      return "Moved";
    case 3:
      return "Broken";
    default:
      return "Unknown";
  }
}

function getStatusIcon(value: number) {
  switch (value) {
    case 2:
      return Icon.ArrowNe;
    case 3:
      return Icon.ExclamationMark;
    default:
      return Icon.CheckCircle;
  }
}

function getStatusColor(value: number) {
  switch (value) {
    case 2:
      return Color.Yellow;
    case 3:
      return Color.Red;
    default:
      return Color.Green;
  }
}

function getVisibilityColor(value: number) {
  switch (value) {
    case 1:
      return Color.Green;
    case 2:
      return Color.Yellow;
    case 3:
      return Color.Magenta;
    default:
      return Color.SecondaryText;
  }
}

function hasFullLinkDetails(link: LinkAceLink) {
  return Array.isArray(link.tags) && Array.isArray(link.lists);
}

function summarizeNames(names: string[], maxVisibleNames = 2) {
  const cleanedNames = names.map((name) => name.trim()).filter(Boolean);
  const visibleNames = cleanedNames.slice(0, maxVisibleNames);
  const remainingCount = cleanedNames.length - visibleNames.length;

  return {
    shortText: remainingCount > 0 ? `${visibleNames.join(", ")} +${remainingCount}` : visibleNames.join(", "),
    fullText: cleanedNames.join(", "),
  };
}

function getShortUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname;
    const shortUrl = `${parsedUrl.hostname}${pathname}`;
    return limitMiddle(shortUrl, 52);
  } catch {
    return url;
  }
}

function limitMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const prefixLength = Math.ceil((maxLength - 1) / 2);
  const suffixLength = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, prefixLength)}…${value.slice(-suffixLength)}`;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
