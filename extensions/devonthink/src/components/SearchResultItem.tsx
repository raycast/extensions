import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { Preferences, PropertyKey } from "../types/Preferences";
import { SearchResult } from "../types/SearchResult";

const SearchResultItem = ({ result }: { result: SearchResult }) => (
  <List.Item
    title={result.name}
    icon={{ fileIcon: result.path }}
    actions={
      <ActionPanel>
        <Action.Open title="Open in DEVONthink" target={`x-devonthink-item://${result.uuid}`} />
        <Action.Open title="Open in the default app" target={result.path} />
        <Action.CopyToClipboard title="Copy Item Link" content={`x-devonthink-item://${result.uuid}`} />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${result.name}](x-devonthink-item://${result.uuid})`}
        />
        <Action.Open title="Reveal in DEVONthink" target={`x-devonthink-item://${result.uuid}?reveal=1`} />
      </ActionPanel>
    }
    detail={
      <List.Item.Detail
        metadata={<List.Item.Detail.Metadata>{searchResultMetadataItems(result)}</List.Item.Detail.Metadata>}
      />
    }
  />
);

export default SearchResultItem;

const preferences: Preferences = getPreferenceValues();

const searchResultMetadataItems = (result: SearchResult) => {
  const items = [
    <MyLabel key="name" propKey="propertyName" title="Name" text={result.name} />,
    <TagList key="tags" title="Tags">
      {result.tags.map((tag) => (
        <Tag key={tag} text={tag} />
      ))}
    </TagList>,
    <MyLink key="url" propKey="propertyUrl" title="URL" text={getDomain(result.url)} target={result.url} />,
    <MyLabel
      key="creationDate"
      propKey="propertyCreationDate"
      title="Creation Date"
      text={prettyDate(result.creationDate)}
    />,
    <MyLabel
      key="modificationDate"
      propKey="propertyModificationDate"
      title="Modification Date"
      text={prettyDate(result.modificationDate)}
    />,
    <MyLabel
      key="openingDate"
      propKey="propertyOpeningDate"
      title="Opening Date"
      text={prettyDate(result.openingDate)}
    />,
    <MyLabel
      key="additionDate"
      propKey="propertyAdditionDate"
      title="Addition Date"
      text={prettyDate(result.additionDate)}
    />,
    <MyLabel key="date" propKey="propertyDate" title="Date" text={prettyDate(result.date)} />,
    <MyLabel key="location" propKey="propertyLocation" title="Location" text={result.location} />,
    <MyLabel
      key="size"
      propKey="propertySize"
      title="Size"
      text={"" + humanFileSize(result.size, preferences.useSIUnits)}
    />,
    <MyLabel key="score" propKey="propertyScore" title="Score" text={"" + result.score} />,

    <MyLabel key="type" propKey="propertyType" title="Type" text={result.type} />,
    <MyLabel key="kind" propKey="propertyKind" title="Kind" text={result.kind} />,
    <MyLink
      key="referenceURL"
      propKey="propertyReferenceURL"
      title="Reference URL"
      text={getDomain(result.referenceURL)}
      target={result.referenceURL}
    />,
    <MyLabel key="path" propKey="propertyPath" title="Path" text={result.path} />,
    <MyLabel key="filename" propKey="propertyFilename" title="Filename" text={result.filename} />,
    <MyLabel key="locationGroup" propKey="propertyLocationGroup" title="Location Group" text={result.locationGroup} />,
    <MyLabel key="mimeType" propKey="propertyMimeType" title="MIME Type" text={result.mimeType} />,
    <MyLabel key="unread" propKey="propertyUnread" title="Unread" text={result.unread ? "yes" : "no"} />,

    <MyLabel key="aliases" propKey="propertyAliases" title="Aliases" text={result.aliases} />,
    <MyLabel key="comment" propKey="propertyComment" title="Comment" text={result.comment} />,
    <MyLabel
      key="numberOfHits"
      propKey="propertyNumberOfHits"
      title="Number of Hits"
      text={"" + result.numberOfHits}
    />,
    <MyLabel
      key="annotationCount"
      propKey="propertyAnnotationCount"
      title="Annotation Count"
      text={"" + result.annotationCount}
    />,
    <MyLabel
      key="characterCount"
      propKey="propertyCharacterCount"
      title="Character Count"
      text={"" + result.characterCount}
    />,
    <MyLabel key="rating" propKey="propertyRating" title="Rating" text={"" + result.rating} />,
    <MyLabel key="pageCount" propKey="propertyPageCount" title="Page Count" text={"" + result.pageCount} />,
    <MyLabel key="wordCount" propKey="propertyWordCount" title="Word Count" text={"" + result.wordCount} />,
    <MyLabel
      key="attachmentCount"
      propKey="propertyAttachmentCount"
      title="Attachment Count"
      text={"" + result.attachmentCount}
    />,
    <MyLabel
      key="numberOfDuplicates"
      propKey="propertyNumberOfDuplicates"
      title="Number of Duplicates"
      text={"" + result.numberOfDuplicates}
    />,

    <MyLabel key="tagType" propKey="propertyTagType" title="Tag Type" text={result.tagType} />,
    <MyLabel
      key="attachedScript"
      propKey="propertyAttachedScript"
      title="Attached Script"
      text={result.attachedScript}
    />,
    <MyLabel key="class" propKey="propertyClass" title="Class" text={result.class} />,

    <MyLabel key="height" propKey="propertyHeight" title="Height" text={"" + result.height} />,
    <MyLabel key="width" propKey="propertyWidth" title="Width" text={"" + result.width} />,
    <MyLabel key="dpi" propKey="propertyDpi" title="DPI" text={"" + result.dpi} />,

    <MyLabel key="altitude" propKey="propertyAltitude" title="Altitude" text={"" + result.altitude} />,
    <MyLabel key="latitude" propKey="propertyLatitude" title="Latitude" text={"" + result.latitude} />,
    <MyLabel key="longitude" propKey="propertyLongitude" title="Longitude" text={"" + result.longitude} />,

    <MyLabel key="id" propKey="propertyID" title="ID" text={"" + result.id} />,
    <MyLabel key="uuid" propKey="propertyUUID" title="UUID" text={result.uuid} />,
    <MyLabel key="contentHash" propKey="propertyContentHash" title="Content Hash" text={result.contentHash} />,

    <MyLabel key="interval" propKey="propertyInterval" title="Interval" text={"" + result.interval} />,
    <MyLabel
      key="numberOfReplicants"
      propKey="propertyNumberOfReplicants"
      title="Number of Replicants"
      text={"" + result.numberOfReplicants}
    />,
    <MyLabel key="batesNumber" propKey="propertyBatesNumber" title="Bates Number" text={"" + result.batesNumber} />,
    <MyLabel key="duration" propKey="propertyDuration" title="Duration" text={"" + result.duration} />,
    <MyLabel key="label" propKey="propertyLabel" title="Label" text={"" + result.label} />,
    <MyLabel key="state" propKey="propertyState" title="State" text={result.state ? "yes" : "no"} />,
    <MyLabel
      key="excludeFromTagging"
      propKey="propertyExcludeFromTagging"
      title="Exclude from Tagging"
      text={result.excludeFromTagging ? "yes" : "no"}
    />,
    <MyLabel
      key="stateVisibility"
      propKey="propertyStateVisibility"
      title="State Visibility"
      text={result.stateVisibility ? "yes" : "no"}
    />,
    <MyLabel
      key="excludeFromWikiLinking"
      propKey="propertyExcludeFromWikiLinking"
      title="Exclude from Wiki Linking"
      text={result.excludeFromWikiLinking ? "yes" : "no"}
    />,
    <MyLabel
      key="excludeFromClassification"
      propKey="propertyExcludeFromClassification"
      title="Exclude from Classification"
      text={result.excludeFromClassification ? "yes" : "no"}
    />,
    <MyLabel key="locking" propKey="propertyLocking" title="Locking" text={result.locking ? "yes" : "no"} />,
    <MyLabel key="indexed" propKey="propertyIndexed" title="Indexed" text={result.indexed ? "yes" : "no"} />,
    <MyLabel
      key="excludeFromSeeAlso"
      propKey="propertyExcludeFromSeeAlso"
      title="Exclude from See Also"
      text={result.excludeFromSeeAlso ? "yes" : "no"}
    />,
    <MyLabel
      key="excludeFromSearch"
      propKey="propertyExcludeFromSearch"
      title="Exclude from Search"
      text={result.excludeFromSearch ? "yes" : "no"}
    />,
  ].concat(createMetadataLabels({ propKey: "propertyMetaData", record: result.metaData }));

  const orderKeys = preferences.orderSearchResultItemProperties.split(",").map((key) => key.trim().toLowerCase());
  const ordered = [] as JSX.Element[];

  orderKeys.forEach((key) => {
    const index = items.findIndex((item) => item.key?.toString().toLowerCase() === key);
    if (index < 0) {
      return;
    }

    ordered.push(items[index]);
    items[index] = <></>;
  });

  const leftovers = items.filter((item) => item.key !== null);

  return ordered.concat(leftovers);
};

const Label = List.Item.Detail.Metadata.Label;
const TagList = List.Item.Detail.Metadata.TagList;
const Tag = TagList.Item;
const Link = List.Item.Detail.Metadata.Link;

const MyLabel = ({ propKey, title, text }: { propKey: PropertyKey; title: string; text?: string }) => {
  if (!preferences[propKey]) {
    return null;
  }

  return preferences.hideEmptySearchResultItemProperties && !text ? null : <Label title={title} text={text} />;
};

const MyLink = ({
  propKey,
  title,
  text,
  target,
}: {
  propKey: PropertyKey;
  title: string;
  text: string;
  target?: string;
}) => {
  if (!preferences[propKey]) {
    return null;
  }

  if (!preferences.hideEmptySearchResultItemProperties) {
    return target ? (
      <Link title={title} text={text} target={target} />
    ) : (
      <MyLabel propKey={propKey} title={title} text="No URL" />
    );
  }

  if (!target) {
    return null;
  }

  return <Link title={title} text={text} target={target} />;
};

const createMetadataLabels = ({ propKey, record }: { propKey: PropertyKey; record: Record<string, unknown> }) => {
  if (!preferences[propKey]) {
    return <></>;
  }

  if (record === null) {
    return <></>;
  }

  return Object.entries(record).map(([key, value]) => {
    const text = typeof value === "string" ? value : JSON.stringify(value);

    return <Label key={key} title={key} text={text} />;
  });
};

const prettyDate = (date: string) => {
  const dateObj = new Date(date);

  return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
};

const humanFileSize = (bytes: number, si = false, decimalPlaces = 1) => {
  const thresh = si ? 1024 : 1000;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    : ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = -1;
  const r = 10 ** decimalPlaces;

  do {
    bytes /= thresh;
    ++unitIndex;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && unitIndex < units.length - 1);

  return bytes.toFixed(decimalPlaces) + " " + units[unitIndex];
};

const getDomain = (url: string) => url.replace(/^[^:]+:\/\/([^/]+).*$/, "$1");
