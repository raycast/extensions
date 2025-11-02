import { Detail, getPreferenceValues } from "@raycast/api";
import { Article, Source } from "../interfaces";
import { getDomain } from "../utils";

interface ArticleDetailProps {
  article: Article;
}

interface Preferences {
  showTalkingPoints: boolean;
  showPrimaryImage: boolean;
  showSecondaryImage: boolean;
  showPerspectives: boolean;
  showHistoricalBackground: boolean;
  showInternationalReactions: boolean;
  showTimeline: boolean;
  showTechnicalDetails: boolean;
  showIndustryImpact: boolean;
  showDidYouKnow: boolean;
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  const preferences = getPreferenceValues<Preferences>();
  const sources = article.sources || [];
  const highlights = article.highlights || [];

  let markdown = `# ${article.title}`;
  let allVisibleText = ""; // Track all visible content for source extraction

  if (preferences.showPrimaryImage && article.primary_image) {
    const primaryImage = article.primary_image;
    if (primaryImage.url) {
      markdown += `\n\n![Primary Image](${primaryImage.url})`;
      if (primaryImage.caption) {
        markdown += `\n\n> *${primaryImage.caption}*`;
      }
    }
  }

  markdown += `\n\n## Summary\n${article.summary}`;
  allVisibleText += article.summary + " ";

  if (preferences.showTalkingPoints && highlights.length > 0) {
    markdown += `\n\n## Talking Points\n`;
    highlights.forEach((highlight) => {
      markdown += `- ${highlight}\n`;
      allVisibleText += highlight + " ";
    });
  }

  if (preferences.showSecondaryImage && article.secondary_image) {
    const secondaryImage = article.secondary_image;
    if (secondaryImage.url) {
      markdown += `\n\n![Secondary Image](${secondaryImage.url})`;
      if (secondaryImage.caption) {
        markdown += `\n\n> *${secondaryImage.caption}*`;
      }
    }
  }

  if (preferences.showPerspectives && article.perspectives) {
    const perspectives = article.perspectives;
    if (Array.isArray(perspectives) && perspectives.length > 0) {
      markdown += `\n\n## Perspectives\n`;
      perspectives.forEach((perspective) => {
        markdown += `- ${perspective.text}\n`;
        allVisibleText += perspective.text + " ";
      });
    }
  }

  if (preferences.showHistoricalBackground && article.historical_background) {
    const historicalBackground = article.historical_background;
    markdown += `\n\n## Historical Background\n${historicalBackground}`;
    allVisibleText += historicalBackground + " ";
  }

  if (preferences.showTechnicalDetails && article.technical_details) {
    const details = article.technical_details;
    if (Array.isArray(details) && details.length > 0) {
      markdown += `\n\n## Technical Details\n`;
      details.forEach((detail) => {
        markdown += `- ${detail}\n`;
        allVisibleText += detail + " ";
      });
    }
  }

  if (preferences.showIndustryImpact && article.industry_impact) {
    const impacts = article.industry_impact;
    if (Array.isArray(impacts) && impacts.length > 0) {
      markdown += `\n\n## Industry Impact\n`;
      impacts.forEach((impact) => {
        markdown += `- ${impact}\n`;
        allVisibleText += impact + " ";
      });
    }
  }

  if (preferences.showTimeline && article.timeline) {
    const timeline = article.timeline;
    if (Array.isArray(timeline) && timeline.length > 0) {
      markdown += `\n\n## Timeline\n`;
      timeline.forEach((event) => {
        markdown += `**${event.date}**: ${event.content}\n\n`;
        allVisibleText += event.content + " ";
      });
    }
  }

  if (preferences.showInternationalReactions && article.international_reactions) {
    const reactions = article.international_reactions;
    if (Array.isArray(reactions) && reactions.length > 0) {
      markdown += `\n\n## International Reactions\n`;
      reactions.forEach((reaction) => {
        markdown += `- ${reaction}\n`;
        allVisibleText += reaction + " ";
      });
    }
  }

  if (preferences.showDidYouKnow && article.didYouKnow) {
    markdown += `\n\n## Did You Know?\n${article.didYouKnow}`;
    allVisibleText += article.didYouKnow + " ";
  }

  // Extract sources only from visible content
  const refRegex = /\[([a-z0-9.-]+)#(\d+)\]/g;
  const referencedSources = new Map<string, Source>();

  let match;
  while ((match = refRegex.exec(allVisibleText)) !== null) {
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
