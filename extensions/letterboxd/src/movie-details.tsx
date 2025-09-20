import React from "react";
import { useCachedPromise } from "@raycast/utils";
import { AsyncStatus, fetchMovieDetails } from "./letterboxd-api";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { STRINGS } from "./strings";
import type { MovieDetails, Review } from "./types";
import { ErrorScreen } from "./components/error-screen";
import { convertHtmlToCommonMark, humanizeInteger } from "./utils";
import { getFullURL } from "./letterboxd-api";

interface MovieDetailsProps {
  movieTitle: string;
  qualifier: string;
}

export default function MovieDetails(props: MovieDetailsProps) {
  const { movieTitle, qualifier } = props;
  const { data, isLoading, revalidate } = useCachedPromise(
    fetchMovieDetails,
    [qualifier],
    { keepPreviousData: true },
  );

  const status = data?.status;
  if (status === AsyncStatus.Error && !isLoading) {
    return <ErrorScreen retry={revalidate} />;
  }

  const details = data?.data;
  const markdown = isLoading || !details ? "" : getMarkdown(details);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={movieTitle}
      markdown={markdown}
      metadata={<Metadata show={true} movie={details} />}
      actions={
        <ActionPanel>
          {details?.url && <Action.OpenInBrowser url={details.url} />}
        </ActionPanel>
      }
    />
  );
}

const getMarkdown = (data: MovieDetails): string => {
  return `
  # ${data.title}
  by ${data.director}
  ${data.ratingHistogram?.rating ? `\n\`${data.ratingHistogram?.rating?.average} stars\` based on \`${humanizeInteger(data.ratingHistogram?.rating?.count)}\` reviews ` : ""}
  ${data.ratingHistogram?.fans ? `\n\`${humanizeInteger(data.ratingHistogram.fans)}\` fans` : ""}

  <img src="${data.posterUrl}" alt="Image" height="230"/>

  ${convertHtmlToCommonMark(data.description)}

  ##

  ${getRatingsHistogramMarkdown(data)}  

  ##
  ---
  ##

  ${data.reviews?.map((review) => getReviewsMarkdown(review)).join("")}
  `;
};

const getRatingsHistogramMarkdown = (data: MovieDetails): string => {
  if (!data.ratingHistogram) {
    return "";
  }
  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  return data.ratingHistogram.histogram.reduce((markdown, histogram) => {
    markdown += `${getHistogramBar(histogram.percentage)} &emsp; ${numberWithCommas(histogram.count)} (${
      histogram.percentage
    }%) **${histogram.description}**\n\n`;
    return markdown;
  }, "");
};

const HISTOGRAM_BAR_WIDTH = 18;

const getHistogramBar = (count: number): string => {
  const fillCount = Math.ceil((count * HISTOGRAM_BAR_WIDTH) / 100);
  const emptyCount = HISTOGRAM_BAR_WIDTH - fillCount;

  return "█".repeat(fillCount) + "—".repeat(emptyCount);
};

const getReviewsMarkdown = (review: Review): string => {
  let reviewMarkdown = `### ${review.reviewerName}`;
  if (review.rating) {
    reviewMarkdown += " &nbsp; &nbsp; ";
    reviewMarkdown += review.rating.replaceAll("★", "⭐️");
    if (review.commentCount) {
      reviewMarkdown += " &nbsp; &nbsp; ";
      reviewMarkdown += `💬 ${review.commentCount}`;
    }
    //reviewMarkdown += review.reviewDate;
  } else {
    //reviewMarkdown += review.reviewDate;
  }

  reviewMarkdown += `

  ${review.reviewBody ? Array.from(review.reviewBody).slice(0, 400).join("") : ""} ${review.reviewUrl ? `[...more](${getFullURL(review.reviewUrl)})` : ""}
  
  ##
  ---
  ##
  `;

  return reviewMarkdown;
};

interface MetadataProps {
  show: boolean;
  movie?: MovieDetails;
}

function Metadata(props: MetadataProps) {
  const { show, movie } = props;
  if (!show || !movie) {
    return null;
  }

  return (
    <Detail.Metadata>
      <Detail.Metadata.Link
        title={STRINGS.directorLabel}
        text={movie.director}
        target={movie.directorDetailsPageUrl}
      />
      <Detail.Metadata.Label
        title={STRINGS.releasedLabel}
        text={movie.released}
      />

      {movie.runtime ? (
        <Detail.Metadata.Label
          title={STRINGS.runtimeLabel}
          text={`${movie.runtime} ${STRINGS.runtimeUnit}`}
        />
      ) : null}

      {movie.stats ? (
        <Detail.Metadata.Link
          title={STRINGS.stats}
          text={`👁️ ${humanizeInteger(movie.stats.watches ?? 0)} 🗒️ ${humanizeInteger(movie.stats.lists ?? 0)} ❤️ ${humanizeInteger(movie.stats.likes ?? 0)}`}
          target={getFullURL(`/film/${movie.id}/members`)}
        />
      ) : null}

      <Detail.Metadata.Separator />
      {movie.releases.map((release) =>
        release.releases?.map((r) => (
          <Detail.Metadata.TagList
            key={`${release.type} ${r.dateString}`}
            title={`${release.type} ${r.dateString}`}
          >
            {r.countries?.map((country) => (
              <Detail.Metadata.TagList.Item
                key={country.name}
                text={country.name}
                icon={country.flagImg ?? ""}
              />
            ))}
          </Detail.Metadata.TagList>
        )),
      )}
      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title={STRINGS.genresLabel}>
        {movie?.genres?.map((genre) => (
          <Detail.Metadata.TagList.Item
            key={genre}
            text={genre}
            color={"#ecf0f1"}
          />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
