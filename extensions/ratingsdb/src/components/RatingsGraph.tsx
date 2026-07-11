import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { MediaDetails, Episode } from "../types";
import { searchSeries } from "../utils/requests";
import { showFailureToast } from "@raycast/utils";

interface RatingData {
  season: number;
  episodes: Episode[];
}

const getMaxEpisodes = (seasons: RatingData[]): number => {
  return Math.max(...seasons.map((season) => season.episodes.length));
};

export default function RatingsGraph({ media }: { media: MediaDetails }) {
  const [seasons, setSeasons] = useState<RatingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllSeasons = async () => {
      if (media.Type !== "series" || !media.totalSeasons) {
        setIsLoading(false);
        return;
      }

      const totalSeasons = media.totalSeasons;
      const seasonsData: RatingData[] = [];

      try {
        for (let i = 1; i <= totalSeasons; i++) {
          const seasonData = await searchSeries(media.imdbID, i);
          if (seasonData && seasonData.Episodes) {
            seasonsData.push({
              season: i,
              episodes: seasonData.Episodes,
            });
          }
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch season data" });
      }

      setSeasons(seasonsData);
      setIsLoading(false);
    };

    fetchAllSeasons();
  }, [media]);

  const getRatingEmoji = (rating: string): string => {
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum)) return "⬛";

    if (ratingNum >= 8.5) return "🟩";
    if (ratingNum >= 7.5) return "🟨";
    if (ratingNum >= 6.0) return "🟧";
    return "🟥";
  };

  const generateMarkdownTable = () => {
    if (seasons.length === 0) {
      return "No ratings data available";
    }

    let markdown = "# Ratings Graph for " + media.Title + "\n\n";

    // Create header row with season numbers
    markdown += "|  | ";
    for (let i = 1; i <= seasons.length; i++) {
      markdown += `S${i} | `;
    }
    markdown += "\n";

    // Add separator row
    markdown += "| --- | ";
    for (let i = 1; i <= seasons.length; i++) {
      markdown += "--- | ";
    }
    markdown += "\n";

    // Find the maximum number of episodes in any season
    const maxEpisodes = getMaxEpisodes(seasons);

    // Create rows for each episode
    for (let episodeIndex = 0; episodeIndex < maxEpisodes; episodeIndex++) {
      markdown += `| E${episodeIndex + 1} | `;

      for (const season of seasons) {
        const episode = season.episodes[episodeIndex];
        if (episode) {
          markdown += `${episode.imdbRating} ${getRatingEmoji(episode.imdbRating)} | `;
        } else {
          markdown += "  | ";
        }
      }

      markdown += "\n";
    }

    return markdown;
  };

  const generateShareableText = () => {
    if (seasons.length === 0) {
      return "No ratings data available";
    }

    let text = `${media.Title} Ratings\n\n`;

    // Add season numbers at the top
    text += "    "; // Space for episode numbers column
    for (let i = 0; i < seasons.length; i++) {
      text += `S${i + 1} `;
    }
    text += "\n";

    // Find the maximum number of episodes in any season
    const maxEpisodes = getMaxEpisodes(seasons);

    // Create rows for each episode with ratings
    for (let episodeIndex = 0; episodeIndex < maxEpisodes; episodeIndex++) {
      text += episodeIndex >= 9 ? `E${episodeIndex + 1} ` : `E${episodeIndex + 1}  `;

      for (const season of seasons) {
        const episode = season.episodes[episodeIndex];
        if (episode) {
          text += getRatingEmoji(episode.imdbRating);
        } else {
          text += "⬛";
        }
      }

      text += "\n";
    }

    return text;
  };

  return (
    <Detail
      markdown={generateMarkdownTable()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Shareable Ratings"
            content={generateShareableText()}
            icon={Icon.CopyClipboard}
          />
          <Action.OpenInBrowser
            title="View on Imdb"
            url={`https://www.imdb.com/title/${media.imdbID}/`}
            icon={{ source: "imdb.png" }}
          />
        </ActionPanel>
      }
    />
  );
}
