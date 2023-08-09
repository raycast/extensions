import { useCachedPromise, useCachedState } from "@raycast/utils";
import { AsyncStatus, fetchBookDetails } from "./goodreads-api";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { STRINGS } from "./strings";
import { BookDetails, Review } from "./types";
import { ErrorScreen } from "./components/error-screen";
import { convertHtmlToCommonMark } from "./utils";

interface BookDetailsProps {
  bookTitle: string;
  qualifier: string;
}

export default function BookDetails(props: BookDetailsProps) {
  const { bookTitle, qualifier } = props;
  const { data, isLoading, revalidate } = useCachedPromise(fetchBookDetails, [qualifier], { keepPreviousData: true });
  const [showMetadata, setShowMetadata] = useCachedState("metaDataVisibility", true);

  const status = data?.status;
  if (status === AsyncStatus.Error && !isLoading) {
    return <ErrorScreen retry={revalidate} />;
  }

  const details = data?.data;
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

  ## Community Reviews
  ---

  ${data.reviews?.map((review) => getReviewsMarkdown(review)).join("")}

  `;
};

const getReviewsMarkdown = (review: Review): string => {
  return `
### ${review.reviewerName}
*${review.reviewDate}*

${review.review.substring(0, 400)}

---
`;
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
      <Detail.Metadata.Label title={STRINGS.communityReviews} text={book.ratingStatistics} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title={STRINGS.genresLabel}>
        {book?.genres?.map((genre) => (
          <Detail.Metadata.TagList.Item key={genre} text={genre} color={"#ecf0f1"} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
