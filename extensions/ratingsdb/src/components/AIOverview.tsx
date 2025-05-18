import { AI, Detail, ActionPanel } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { AIOverviewProps } from "../types";
import { useState, useEffect } from "react";
import { useTypingEffect } from "../hooks/useTypingEffect";
import { MediaMetadata } from "./MediaMetadata";
import MediaActions from "./MediaActions";

export default function AIReviewView({ media, episode }: AIOverviewProps) {
  const [review, setReview] = useState("");
  const { data, isLoading } = useAI(
    `${
      "Type" in media && media.Type.toLowerCase() === "movie"
        ? `Show useful information for the movie "${media.Title}" (${"Year" in media ? media.Year : "Unknown"}).
      
      Include the rotten tomatoes score as well as it's audience score.
      Include 3 recommendations that are similar to the movie.

      Show the information in a markdown format similar to the following:
      ## AI Overview //Just a heading
      
      <img src="${media.Poster}" height="210"/>
      
      ### [Rotten Tomatoes Score](https://www.rottentomatoes.com/link/to/score)
      Tomatemeter:
      Audience Score:

      ### [Main Characters](https://www.imdb.com/title/${media.imdbID}/fullcredits)
      1.
      1.
      1.
      
      ### Plot

      ### Recommendations 
      1.
      1.
      1.
      
      ### Fun fact

      `
        : `Show useful information for the series "${media.Title}" episode titled "${episode?.Title}" released on ${episode?.Released ?? "Unknown"}).
    
      Include 3 recommendations that are similar to the show.

      Show the information in a markdown format similar to the following:
      # AI Overview //Just a heading
      ## [Main Characters](https://www.imdb.com/title/${media.imdbID}/fullcredits)
      1.
      1.
      1.
      
      ## Plot

      ## Recommendations 
      1.
      1.
      1.

      ## Fun fact
      `
    }`,
    { model: AI.Model["OpenAI_GPT4o-mini"] },
  );

  useEffect(() => {
    if (data) {
      setReview(data);
    }
  }, [data]);

  const displayedReview = useTypingEffect(review, 10);

  return (
    <Detail
      markdown={isLoading ? "Generating AI overview..." : displayedReview}
      metadata={<MediaMetadata media={media} />}
      actions={
        <ActionPanel>
          <MediaActions media={media} component="Overview" />
        </ActionPanel>
      }
    />
  );
}
