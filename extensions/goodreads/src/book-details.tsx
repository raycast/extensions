import { useCachedState } from "@raycast/utils";
import { AsyncStatus } from "./goodreads-api";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { STRINGS } from "./strings";
import type { BookDetails, Review } from "./types";
import { ErrorScreen } from "./components/error-screen";
import { convertHtmlToCommonMark } from "./utils";
import { useBookDetails } from "./useBookDetails";

interface BookDetailsProps {
  bookTitle: string;
  qualifier: string;
}

export default function BookDetails(props: BookDetailsProps) {
  const { bookTitle, qualifier } = props;
  const { data, status, isLoading, revalidate } = useBookDetails(qualifier);
  const [showMetadata, setShowMetadata] = useCachedState("metaDataVisibility", true);

  if (status === AsyncStatus.Error && !isLoading) {
    return <ErrorScreen retry={revalidate} />;
  }

  const details = data;
  const markdown = isLoading || !details ? "" : getMarkdown(details);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={bookTitle}
      markdown={markdown}
      metadata={<Metadata show={showMetadata} book={details} />}
      actions={
        <ActionPanel>
          {details?.url && <Action.OpenInBrowser url={details.url} />}
          <Action
            icon={Icon.AppWindowSidebarRight}
            title={STRINGS.toggleMetadata}
            onAction={() => setShowMetadata(!showMetadata)}
          />
        </ActionPanel>
      }
    />
  );
}

const getMarkdown = (data: BookDetails): string => {
  return `
  # ${data.title}
  by ${data.author} &nbsp; **\`${data.rating} stars\`**

   ${data.cover?.source ? `<img src="${data.cover.source}" alt="Image" height="230">` : ""}

  ${convertHtmlToCommonMark(data.description)}

  ${getCommunityReviewSummaryMarkdown(data)}

  ##

  ${getRatingsHistogramMarkdown(data)}  

  ##
  ---
  ##

  ${data.reviews?.map((review) => getReviewsMarkdown(review)).join("")}
  `;
};

const getCommunityReviewSummaryMarkdown = (data: BookDetails): string => {
  return `
  ## Community Reviews

  ${data.ratingStatistics}
  `;
};

const getRatingsHistogramMarkdown = (data: BookDetails): string => {
  if (!data.ratingHistogram) {
    return "";
  }

  return data.ratingHistogram.reduce((markdown, histogram, index) => {
    const starRating = 5 - index;
    markdown += `**${starRating} stars** &emsp; ${getHistogramBar(histogram.percentage)} &emsp; ${histogram.count} (${
      histogram.percentage
    }%) \n\n`;

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
  let reviewMarkdown = `### ${review.reviewerName} \n\n`;

  if (review.rating) {
    reviewMarkdown += "⭐️".repeat(review.rating);
    reviewMarkdown += "&nbsp; &nbsp; · &nbsp; &nbsp;";
    reviewMarkdown += review.reviewDate;
  } else {
    reviewMarkdown += review.reviewDate;
  }

  reviewMarkdown += `

  ${review.reviewBody.substring(0, 400)} ${review.reviewUrl ? `[...more](${review.reviewUrl})` : ""}
  
  ##
  ---
  ##
  `;

  return reviewMarkdown;
};

interface MetadataProps {
  show: boolean;
  book?: BookDetails;
}

function Metadata(props: MetadataProps) {
  const { show, book } = props;
  if (!show || !book) {
    return null;
  }

  return (
    <Detail.Metadata>
      <Detail.Metadata.Link title={STRINGS.authorLabel} text={book.author} target={book.authorDetailsPageUrl} />
      <Detail.Metadata.Label title={STRINGS.formatLabel} text={book.format} />
      <Detail.Metadata.Label title={STRINGS.publishedLabel} text={book.published} />

      {book.communityReviewUrl ? (
        <Detail.Metadata.Link
          title={STRINGS.communityReviews}
          text={book.ratingStatistics}
          target={book.communityReviewUrl}
        />
      ) : (
        <Detail.Metadata.Label title={STRINGS.communityReviews} text={book.ratingStatistics} />
      )}

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title={STRINGS.genresLabel}>
        {book?.genres?.map((genre) => (
          <Detail.Metadata.TagList.Item key={genre} text={genre} color={"#ecf0f1"} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
