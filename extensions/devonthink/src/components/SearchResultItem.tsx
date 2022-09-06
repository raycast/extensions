import { Action, ActionPanel, List } from "@raycast/api";
import { SearchResult } from "../hooks/useSearch";

const SearchResultItem = ({ result }: { result: SearchResult }) => (
  <List.Item
    title={result.name}
    icon={{ fileIcon: result.path }}
    actions={
      <ActionPanel>
        <Action.Open title="Open in DEVONthink" target={`x-devonthink-item://${result.uuid}`} />
        <Action.Open title="Open in the default app" target={result.path} />
        <Action.Open title="Reveal in DEVONthink" target={`x-devonthink-item://${result.uuid}?reveal=1`} />
      </ActionPanel>
    }
    detail={<List.Item.Detail
      metadata={<List.Item.Detail.Metadata>
        {searchResultMetadataItems(result)}
      </List.Item.Detail.Metadata>}
    />}
  />
);

export default SearchResultItem;

const Label = List.Item.Detail.Metadata.Label;
const TagList = List.Item.Detail.Metadata.TagList;
const Tag = TagList.Item;
const Link = List.Item.Detail.Metadata.Link;

const searchResultMetadataItems = (result: SearchResult) => {
  return [
    <Label key="uuid" title="uuid" text={result.uuid} />,
    <Label key="name" title="name" text={result.name} />,
    <Label key="path" title="path" text={result.path} />,
    <TagList key="tags" title="tags">{result.tags.map((tag) => <Tag key={tag} text={tag} />)}</TagList>,
    <Label key="geolocation" title="geolocation" text={result.geolocation} />,
    <Label key="nameWithoutExtension" title="nameWithoutExtension" text={result.nameWithoutExtension} />,
    <Label key="date" title="date" text={result.date} />,
    <Label key="additionDate" title="additionDate" text={result.additionDate} />,
    <Label key="modificationDate" title="modificationDate" text={result.modificationDate} />,
    <Label key="url" title="url" text={result.url} />,
    <Label key="type" title="type" text={result.type} />,
    <Label key="contentHash" title="contentHash" text={result.contentHash} />,
    <Label key="location" title="location" text={result.location} />,
    <Label key="filename" title="filename" text={result.filename} />,
    <Label key="aliases" title="aliases" text={result.aliases} />,
    <Label key="referenceURL" title="referenceURL" text={result.referenceURL} />,
    <Label key="comment" title="comment" text={result.comment} />,
    <Label key="tagType" title="tagType" text={result.tagType} />,
    <Label key="locationGroup" title="locationGroup" text={result.locationGroup} />,
    <Label key="kind" title="kind" text={result.kind} />,
    <Label key="mimeType" title="mimeType" text={result.mimeType} />,
    <Label key="openingDate" title="openingDate" text={result.openingDate} />,
    <Label key="attachedScript" title="attachedScript" text={result.attachedScript} />,
    <Label key="creationDate" title="creationDate" text={result.creationDate} />,
    <Label key="class" title="class" text={result.class} />,

    <Label key="id" title="id" text={""+result.id} />,
    <Label key="score" title="score" text={""+result.score} />,
    <Label key="numberOfHits" title="numberOfHits" text={""+result.numberOfHits} />,
    <Label key="altitude" title="altitude" text={""+result.altitude} />,
    <Label key="latitude" title="latitude" text={""+result.latitude} />,
    <Label key="interval" title="interval" text={""+result.interval} />,
    <Label key="numberOfReplicants" title="numberOfReplicants" text={""+result.numberOfReplicants} />,
    <Label key="batesNumber" title="batesNumber" text={""+result.batesNumber} />,
    <Label key="annotationCount" title="annotationCount" text={""+result.annotationCount} />,
    <Label key="characterCount" title="characterCount" text={""+result.characterCount} />,
    <Label key="rating" title="rating" text={""+result.rating} />,
    <Label key="longitude" title="longitude" text={""+result.longitude} />,
    <Label key="pageCount" title="pageCount" text={""+result.pageCount} />,
    <Label key="wordCount" title="wordCount" text={""+result.wordCount} />,
    <Label key="size" title="size" text={""+result.size} />,
    <Label key="attachmentCount" title="attachmentCount" text={""+result.attachmentCount} />,
    <Label key="numberOfDuplicates" title="numberOfDuplicates" text={""+result.numberOfDuplicates} />,
    <Label key="height" title="height" text={""+result.height} />,
    <Label key="duration" title="duration" text={""+result.duration} />,
    <Label key="dpi" title="dpi" text={""+result.dpi} />,
    <Label key="width" title="width" text={""+result.width} />,
    <Label key="label" title="label" text={""+result.label} />,

    <Label key="state" title="state" text={result.state ? "yes" : "no"} />,
    <Label key="excludeFromTagging" title="excludeFromTagging" text={result.excludeFromTagging ? "yes" : "no"} />,
    <Label key="stateVisibility" title="stateVisibility" text={result.stateVisibility ? "yes" : "no"} />,
    <Label key="excludeFromWikiLinking" title="excludeFromWikiLinking" text={result.excludeFromWikiLinking ? "yes" : "no"} />,
    <Label key="excludeFromClassification" title="excludeFromClassification" text={result.excludeFromClassification ? "yes" : "no"} />,
    <Label key="locking" title="locking" text={result.locking ? "yes" : "no"} />,
    <Label key="unread" title="unread" text={result.unread ? "yes" : "no"} />,
    <Label key="indexed" title="indexed" text={result.indexed ? "yes" : "no"} />,
    <Label key="excludeFromSeeAlso" title="excludeFromSeeAlso" text={result.excludeFromSeeAlso ? "yes" : "no"} />,
    <Label key="excludeFromSearch" title="excludeFromSearch" text={result.excludeFromSearch ? "yes" : "no"} />,
  ];
}






















