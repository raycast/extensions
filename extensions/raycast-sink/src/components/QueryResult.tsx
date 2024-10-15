import { Detail, ActionPanel, Action } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { useConfig } from "../hooks/useConfig";

interface QueryResultProps {
  link: Link | null;
  isLoading: boolean;
  error: string | null;
}

export function QueryResult({ link, isLoading, error }: QueryResultProps) {
  const { t } = useTranslation();
  const { config } = useConfig();
  const BASE_URL = config?.host;
  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (error) {
    return <Detail markdown={`# ${t.error}\n\n${error}`} />;
  }

  if (!link) {
    return <Detail markdown={`# ${t.notFound}\n\n${t.linkNotFound}`} />;
  }

  const markdown = `
# ${link.slug}

- ${t.targetUrl}: ${link.url}
- ${t.shortLink}: ${BASE_URL}/${link.slug}
- ${t.createdAt}: ${new Date(link.createdAt * 1000).toLocaleString()}
- ${t.updatedAt}: ${new Date(link.updatedAt * 1000).toLocaleString()}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${BASE_URL}/${link.slug}`} title={t.openShortLink} />
          <Action.OpenInBrowser url={link.url} title={t.openTargetUrl} />
          <Action.CopyToClipboard content={`${BASE_URL}/${link.slug}`} title={t.copyShortLink} />
        </ActionPanel>
      }
    />
  );
}
