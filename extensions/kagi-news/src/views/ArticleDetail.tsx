import { Detail } from "@raycast/api";
import { Article, Source } from "../interfaces";
import { getDomain } from "../utils";

interface ArticleDetailProps {
  article: Article;
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  const sources = article.sources || [];
  const highlights = article.highlights || [];

  let markdown = `# ${article.title}\n\n## Summary\n${article.summary}`;

  if (highlights.length > 0) {
    markdown += `\n\n## Talking Points\n`;
    highlights.forEach((highlight) => {
      markdown += `- ${highlight}\n`;
    });
  }

  if (article.didYouKnow) {
    markdown += `\n\n## Did You Know?\n${article.didYouKnow}`;
  }

  const allText = [article.summary, ...(highlights || []), article.didYouKnow || ""].join(" ");
  const refRegex = /\[([a-z0-9.-]+)#(\d+)\]/g;
  const referencedSources = new Map<string, Source>();

  let match;
  while ((match = refRegex.exec(allText)) !== null) {
    const domain = match[1];
    const num = parseInt(match[2], 10);
    const key = `${domain}#${num}`;

    const source = sources.find((s) => getDomain(s.url) === domain);
    if (source && !referencedSources.has(key)) {
      referencedSources.set(key, source);
    }
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        referencedSources.size > 0 ? (
          <Detail.Metadata>
            {Array.from(referencedSources.entries()).map(([key, source], index) => (
              <Detail.Metadata.Link key={index} title={`[${key}]`} target={source.url} text={source.name} />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
