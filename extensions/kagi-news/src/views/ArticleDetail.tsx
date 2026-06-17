// Display detailed article with configurable sections and source links

import { Detail, getPreferenceValues } from "@raycast/api";
import { Article } from "../interfaces";
import { linkifyMarkdown, buildReferenceMap } from "../utils";

interface ArticleDetailProps {
  article: Article;
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  const preferences = getPreferenceValues<Preferences>();
  const visibleSources = article.sources || [];
  const highlights = article.highlights || [];

  // Build reference map once: [hostname#count] → { url, refNumber }
  const refMap = buildReferenceMap(visibleSources);

  // Start with title always
  let markdown = `# ${article.title}`;

  // If primary image preference is enabled, insert primary image immediately after title
  if (preferences.showPrimaryImage && article.primary_image) {
    const primaryImage = article.primary_image;
    if (primaryImage.url) {
      markdown += `\n\n![Primary Image](${primaryImage.url})`;
      if (primaryImage.caption) {
        markdown += `\n\n*${primaryImage.caption}*`;
      }
    }
  }

  // Summary must always appear after title (or title + primary image)
  markdown += `\n\n## Summary\n${linkifyMarkdown(article.summary, refMap) || ""}`;

  // KAGI NEWS OFFICIAL ORDER (from https://news.kagi.com/)

  // Highlights
  if (preferences.showTalkingPoints && highlights.length > 0) {
    markdown += `\n\n## Highlights\n`;
    highlights.forEach((highlight) => {
      markdown += `- ${linkifyMarkdown(highlight, refMap)}\n`;
    });
  }

  // Quote
  if (preferences.showQuote && article.quote) {
    markdown += `\n\n## Quote\n> "${article.quote}"`;
    if (article.quoteAuthor) {
      markdown += `\n\n— ${article.quoteAuthor}`;
      if (article.quoteAttribution) {
        markdown += ` (${article.quoteAttribution})`;
      }
    }
  }

  // Secondary Image
  if (preferences.showSecondaryImage && article.secondary_image) {
    const secondaryImage = article.secondary_image;
    if (secondaryImage.url) {
      markdown += `\n\n![Secondary Image](${secondaryImage.url})`;
      if (secondaryImage.caption) {
        markdown += `\n\n*${secondaryImage.caption}*`;
      }
    }
  }

  // Perspectives
  if (preferences.showPerspectives && article.perspectives) {
    const perspectives = article.perspectives;
    if (Array.isArray(perspectives) && perspectives.length > 0) {
      markdown += `\n\n## Perspectives\n`;
      perspectives.forEach((perspective) => {
        markdown += `- ${linkifyMarkdown(perspective.text, refMap)}\n`;
      });
    }
  }

  // Historical Background
  if (preferences.showHistoricalBackground && article.historicalBackground) {
    markdown += `\n\n## Historical Background\n${linkifyMarkdown(article.historicalBackground, refMap)}`;
  }

  // Humanitarian Impact
  if (preferences.showHumanitarianImpact && article.humanitarianImpact) {
    markdown += `\n\n## Humanitarian Impact\n${linkifyMarkdown(article.humanitarianImpact, refMap)}`;
  }

  // Technical Details
  if (preferences.showTechnicalDetails && article.technicalDetails) {
    const details = article.technicalDetails;
    if (Array.isArray(details) && details.length > 0) {
      markdown += `\n\n## Technical Details\n`;
      details.forEach((detail) => {
        markdown += `- ${linkifyMarkdown(detail, refMap)}\n`;
      });
    }
  }

  // Business Angle
  if (preferences.showBusinessAngleText && article.businessAngleText) {
    markdown += `\n\n## Business Angle\n${linkifyMarkdown(article.businessAngleText, refMap)}`;
  }

  if (preferences.showBusinessAnglePoints && article.businessAnglePoints) {
    const points = article.businessAnglePoints;
    if (Array.isArray(points) && points.length > 0) {
      markdown += `\n\n## Business Angle Points\n`;
      points.forEach((point) => {
        markdown += `- ${linkifyMarkdown(point, refMap)}\n`;
      });
    }
  }

  // Scientific Significance
  if (preferences.showScientificSignificance && article.scientificSignificance) {
    const significance = article.scientificSignificance;
    if (Array.isArray(significance) && significance.length > 0) {
      markdown += `\n\n## Scientific Significance\n`;
      significance.forEach((sig) => {
        markdown += `- ${linkifyMarkdown(sig, refMap)}\n`;
      });
    }
  }

  // Travel Advisory
  if (preferences.showTravelAdvisory && article.travelAdvisory) {
    const advisory = article.travelAdvisory;
    if (Array.isArray(advisory) && advisory.length > 0) {
      markdown += `\n\n## Travel Advisory\n`;
      advisory.forEach((item) => {
        markdown += `- ${linkifyMarkdown(item, refMap)}\n`;
      });
    }
  }

  // Performance Statistics
  if (preferences.showPerformanceStatistics && article.performanceStatistics) {
    const stats = article.performanceStatistics;
    if (Array.isArray(stats) && stats.length > 0) {
      markdown += `\n\n## Performance Statistics\n`;
      stats.forEach((stat) => {
        markdown += `- ${linkifyMarkdown(stat, refMap)}\n`;
      });
    }
  }

  // League Standings
  if (preferences.showLeagueStandings && article.leagueStandings) {
    markdown += `\n\n## League Standings\n${linkifyMarkdown(article.leagueStandings, refMap)}`;
  }

  // Design Principles
  if (preferences.showDesignPrinciples && article.designPrinciples) {
    markdown += `\n\n## Design Principles\n${linkifyMarkdown(article.designPrinciples, refMap)}`;
  }

  // User Experience Impact
  if (preferences.showUserExperienceImpact && article.userExperienceImpact) {
    markdown += `\n\n## Experience Impact\n${linkifyMarkdown(article.userExperienceImpact, refMap)}`;
  }

  // Gameplay Mechanics
  if (preferences.showGameplayMechanics && article.gameplayMechanics) {
    const mechanics = article.gameplayMechanics;
    if (Array.isArray(mechanics) && mechanics.length > 0) {
      markdown += `\n\n## Gameplay Mechanics\n`;
      mechanics.forEach((mechanic) => {
        markdown += `- ${linkifyMarkdown(mechanic, refMap)}\n`;
      });
    }
  }

  // Industry Impact
  if (preferences.showIndustryImpact && article.industryImpact) {
    const impacts = article.industryImpact;
    if (Array.isArray(impacts) && impacts.length > 0) {
      markdown += `\n\n## Industry Impact\n`;
      impacts.forEach((impact) => {
        markdown += `- ${linkifyMarkdown(impact, refMap)}\n`;
      });
    }
  }

  // Technical Specifications
  if (preferences.showTechnicalSpecifications && article.technicalSpecifications) {
    markdown += `\n\n## Technical Specifications\n${linkifyMarkdown(article.technicalSpecifications, refMap)}`;
  }

  // Timeline of Events
  if (preferences.showTimeline && article.timeline) {
    const timeline = article.timeline;
    if (Array.isArray(timeline) && timeline.length > 0) {
      markdown += `\n\n## Timeline\n`;
      timeline.forEach((event) => {
        markdown += `- **${event.date}**: ${linkifyMarkdown(event.content, refMap)}\n`;
      });
    }
  }

  // International Reactions
  if (preferences.showInternationalReactions && article.internationalReactions) {
    const reactions = article.internationalReactions;
    if (Array.isArray(reactions) && reactions.length > 0) {
      markdown += `\n\n## International Reactions\n`;
      reactions.forEach((reaction) => {
        markdown += `- ${linkifyMarkdown(reaction, refMap)}\n`;
      });
    }
  }

  // Quick Questions
  if (preferences.showSuggestedQna && article.suggestedQna) {
    const qna = article.suggestedQna;
    if (Array.isArray(qna) && qna.length > 0) {
      markdown += `\n\n## Quick Questions\n`;
      qna.forEach((item) => {
        markdown += `**${item.question}**\n\n${linkifyMarkdown(item.answer, refMap)}\n\n`;
      });
    }
  }

  // Action Items
  if (preferences.showUserActionItems && article.userActionItems) {
    const items = article.userActionItems;
    if (Array.isArray(items) && items.length > 0) {
      markdown += `\n\n## Action Items\n`;
      items.forEach((item) => {
        markdown += `- ${linkifyMarkdown(item, refMap)}\n`;
      });
    }
  }

  // Did You Know?
  if (preferences.showDidYouKnow && article.didYouKnow) {
    markdown += `\n\n## Did You Know?\n${linkifyMarkdown(article.didYouKnow, refMap)}`;
  }

  // ADDITIONAL SECTIONS (not displayed on https://news.kagi.com/)

  // Culinary Significance
  if (preferences.showCulinarySignificance && article.culinarySignificance) {
    markdown += `\n\n## Culinary Significance\n${linkifyMarkdown(article.culinarySignificance, refMap)}`;
  }

  // Destination Highlights
  if (preferences.showDestinationHighlights && article.destinationHighlights) {
    markdown += `\n\n## Destination Highlights\n${linkifyMarkdown(article.destinationHighlights, refMap)}`;
  }

  // DIY Tips
  if (preferences.showDiyTips && article.diyTips) {
    markdown += `\n\n## DIY Tips\n${linkifyMarkdown(article.diyTips, refMap)}`;
  }

  // Economic Implications
  if (preferences.showEconomicImplications && article.economicImplications) {
    markdown += `\n\n## Economic Implications\n${linkifyMarkdown(article.economicImplications, refMap)}`;
  }

  // Future Outlook
  if (preferences.showFutureOutlook && article.futureOutlook) {
    markdown += `\n\n## Future Outlook\n${linkifyMarkdown(article.futureOutlook, refMap)}`;
  }

  // Geopolitical Context
  if (preferences.showGeopoliticalContext && article.geopoliticalContext) {
    markdown += `\n\n## Geopolitical Context\n${linkifyMarkdown(article.geopoliticalContext, refMap)}`;
  }

  // Key Players
  if (preferences.showKeyPlayers && article.keyPlayers) {
    const players = article.keyPlayers;
    if (Array.isArray(players) && players.length > 0) {
      markdown += `\n\n## Key Players\n`;
      players.forEach((player) => {
        markdown += `- ${linkifyMarkdown(player, refMap)}\n`;
      });
    }
  }

  // Location
  if (preferences.showLocation && article.location) {
    markdown += `\n\n## Location\n${linkifyMarkdown(article.location, refMap)}`;
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        visibleSources.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Sources"
              text={`${article.uniqueDomains || 0} publishers • ${article.numberOfTitles || 0} articles`}
            />
            <Detail.Metadata.Separator />
            {visibleSources.map((source, index) => {
              const refNumber = index + 1;
              let displayHost: string;
              try {
                const url = new URL(source.url);
                displayHost = url.hostname.startsWith("www.") ? url.hostname.slice(4) : url.hostname;
              } catch {
                displayHost = "Invalid URL";
              }
              const title = `${refNumber}. ${displayHost}`;
              const text = source.name && source.name.trim().length > 0 ? source.name : undefined;
              return <Detail.Metadata.Link key={source.url} title={title} target={source.url} text={text || ""} />;
            })}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
