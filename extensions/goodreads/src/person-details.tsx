import React from "react";
import type { PersonDetails } from "./types";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { STRINGS } from "./strings";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { AsyncStatus, fetchPersonDetails } from "./goodreads-api";
import { ErrorScreen } from "./components/error-screen";
import { convertHtmlToCommonMark } from "./utils";

interface PersonDetailsProps {
  name: string;
  qualifier: string;
}

export default function PersonDetails(props: PersonDetailsProps) {
  const { name, qualifier } = props;
  const { data, isLoading, revalidate } = useCachedPromise(fetchPersonDetails, [qualifier], { keepPreviousData: true });
  const [showMetadata, setShowMetadata] = useCachedState("personMetaDataVisibility", true);

  const status = data?.status;
  if (status === AsyncStatus.Error && !isLoading) {
    return <ErrorScreen retry={revalidate} />;
  }

  const details = data?.data;
  const markdown = isLoading || !details ? "" : getMarkdown(details);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      metadata={<Metadata show={showMetadata} person={details} />}
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

const getMarkdown = (data: PersonDetails): string => {
  return `
# ${data.name}
 ${data.avatar ? `<img src="${data.avatar}" alt="Image" height="225">` : ""}

${data.description ? `${convertHtmlToCommonMark(data.description)} [...more](${data.url})` : ""}

${data.rating ? getBibliographyMarkdown(data) : ""}
  `;
};

const getBibliographyMarkdown = (data: PersonDetails): string => {
  return `
  ### ${data.name}'s Books
  ---

  > Average rating ${data.rating} · ${data.ratingCount} ratings · ${data.reviewCount} reviews
  `;
};

interface MetadataProps {
  show: boolean;
  person?: PersonDetails;
}

function Metadata(props: MetadataProps) {
  const { show, person } = props;

  if (!show) {
    return null;
  }

  return (
    <Detail.Metadata>
      {person?.website && (
        <Detail.Metadata.Link title={STRINGS.website} text={person.website} target={person.website} />
      )}

      {person?.twitter?.url && (
        <Detail.Metadata.Link title={STRINGS.twitter} text={person.twitter?.handle} target={person.twitter.url} />
      )}

      {person?.genres &&
        person.genres.map((genre) => (
          <Detail.Metadata.Link key={genre.name} title={STRINGS.genresLabel} text={genre?.name} target={genre?.link} />
        ))}
      <Detail.Metadata.Separator />

      {person?.rating && <Detail.Metadata.Label title={STRINGS.rating} text={person.rating} />}

      {person?.ratingCount && (
        <Detail.Metadata.Label
          title={STRINGS.communityReviews}
          text={`${person?.ratingCount} ratings · ${person?.reviewCount} reviews`}
        />
      )}
    </Detail.Metadata>
  );
}
