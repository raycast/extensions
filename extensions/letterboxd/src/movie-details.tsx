import React from "react";
import { useCachedPromise } from "@raycast/utils";
import { fetchMovieDetails } from "./letterboxd-api";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { STRINGS } from "./strings";
import type { Movie, MovieDetails, NamedLink, Review } from "./types";
import { ErrorScreen } from "./components/error-screen";
import { convertHtmlToCommonMark, humanizeInteger } from "./utils";
import { getFullURL } from "./letterboxd-api";

interface MovieDetailsProps {
  movie: Movie;
}

const HTML_ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtmlAttribute = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ATTRIBUTE_ESCAPES[character]);

export default function MovieDetails(props: MovieDetailsProps) {
  const { movie } = props;
  const {
    data: details,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchMovieDetails, [movie.detailsPage], {
    keepPreviousData: true,
  });

  if (error && !isLoading) {
    return <ErrorScreen retry={revalidate} />;
  }

  const markdown = isLoading || !details ? "" : getMarkdown(details);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={movie.title}
      markdown={markdown}
      metadata={<Metadata show={true} movie={details} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open in Letterboxd"
            url={movie.links.letterboxd}
          />
          {movie.links.imdb ? (
            <Action.OpenInBrowser title="Open in IMDb" url={movie.links.imdb} />
          ) : null}
          {movie.links.tmdb ? (
            <Action.OpenInBrowser title="Open in TMDB" url={movie.links.tmdb} />
          ) : null}
          <Action.CopyToClipboard
            title={STRINGS.copyMarkdownLink}
            content={getMarkdownLink(movie)}
          />
        </ActionPanel>
      }
    />
  );
}

const getMarkdown = (data: MovieDetails): string => {
  const ratingHistogramMarkdown = getRatingsHistogramMarkdown(data);

  return `
  # ${data.title}
  by ${data.director}
  ${data.ratingHistogram?.rating ? `\n\`${data.ratingHistogram.rating.average} stars\` based on \`${humanizeInteger(data.ratingHistogram.rating.count)}\` ratings ` : ""}
  ${data.ratingHistogram?.fans ? `\n\`${humanizeInteger(data.ratingHistogram.fans)}\` fans` : ""}

  ${data.posterUrl ? `<img src="${escapeHtmlAttribute(data.posterUrl)}" alt="${escapeHtmlAttribute(data.title)}" height="230"/>` : ""}

  ${convertHtmlToCommonMark(data.description)}

  ${getNamedLinksMarkdown(STRINGS.castLabel, data.cast, 10)}

  ${getNamedLinksMarkdown(STRINGS.productionCompaniesLabel, data.productionCompanies)}

  ${ratingHistogramMarkdown ? `##\n\n${ratingHistogramMarkdown}\n\n##\n---\n##` : ""}

  ${data.reviews?.map((review) => getReviewsMarkdown(review)).join("")}
  `;
};

const getMarkdownLink = (movie: Movie): string => {
  const year = movie.released ? ` (${movie.released})` : "";
  return `[${movie.title}${year}](${movie.links.letterboxd})`;
};

const getNamedLinksMarkdown = (
  title: string,
  values?: NamedLink[],
  limit = values?.length ?? 0,
): string => {
  if (!values?.length) return "";
  const links = values
    .slice(0, limit)
    .map(({ name, url }) => (url ? `[${name}](${url})` : name))
    .join(", ");
  return `## ${title}\n\n${links}`;
};

const getRatingsHistogramMarkdown = (data: MovieDetails): string => {
  if (!data.ratingHistogram?.histogram.length) {
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
  let reviewMarkdown = `### ${review.reviewerName ?? "Letterboxd Member"}`;
  if (review.rating) {
    reviewMarkdown += " &nbsp; &nbsp; ";
    reviewMarkdown += review.rating.replaceAll("★", "⭐️");
    if (review.commentCount !== undefined) {
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
      {movie.directorDetailsPageUrl ? (
        <Detail.Metadata.Link
          title={STRINGS.directorLabel}
          text={movie.director}
          target={movie.directorDetailsPageUrl}
        />
      ) : (
        <Detail.Metadata.Label
          title={STRINGS.directorLabel}
          text={movie.director}
        />
      )}
      <Detail.Metadata.Label
        title={STRINGS.releasedLabel}
        text={movie.releaseDate ?? movie.released}
      />

      {movie.runtime ? (
        <Detail.Metadata.Label
          title={STRINGS.runtimeLabel}
          text={`${movie.runtime} ${STRINGS.runtimeUnit}`}
        />
      ) : null}

      {movie.languages?.length ? (
        <Detail.Metadata.Label
          title={STRINGS.languageLabel}
          text={movie.languages.join(", ")}
        />
      ) : null}

      {movie.countries?.length ? (
        <Detail.Metadata.Label
          title={STRINGS.countriesLabel}
          text={movie.countries.join(", ")}
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
            color={Color.SecondaryText}
          />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
