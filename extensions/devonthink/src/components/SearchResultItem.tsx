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
    <Label key="uuid" title="UUID" text={result.uuid} />,
    <Label key="name" title="Name" text={result.name} />,
    <Label key="path" title="Path" text={result.path} />,
    <TagList key="tags" title="Tags">{result.tags.map((tag) => <Tag key={tag} text={tag} />)}</TagList>,
    <Label key="geolocation" title="Geolocation" text={result.geolocation} />,
    <Label key="date" title="Date" text={result.date} />,
    <Label key="additionDate" title="Addition Date" text={result.additionDate} />,
    <Label key="modificationDate" title="Modification Date" text={result.modificationDate} />,
    result.url
    ? <Link key="url" title="URL" text={result.url} target={result.url} />
    : <Label key="url" title="URL" />,
    <Label key="type" title="Type" text={result.type} />,
    <Label key="contentHash" title="Content Hash" text={result.contentHash} />,
    <Label key="location" title="Location" text={result.location} />,
    <Label key="filename" title="Filename" text={result.filename} />,
    <Label key="aliases" title="Aliases" text={result.aliases} />,
    result.referenceURL
    ? <Link key="referenceURL" title="Reference URL" text="URL" target={result.referenceURL} />
    : <Label key="referenceURL" title="Reference URL" text="No reference URL" />,
    <Label key="comment" title="Comment" text={result.comment} />,
    <Label key="tagType" title="Tag Type" text={result.tagType} />,
    <Label key="locationGroup" title="Location Group" text={result.locationGroup} />,
    <Label key="kind" title="Kind" text={result.kind} />,
    <Label key="mimeType" title="MIME Type" text={result.mimeType} />,
    <Label key="openingDate" title="Opening Date" text={result.openingDate} />,
    <Label key="attachedScript" title="Attached Script" text={result.attachedScript} />,
    <Label key="creationDate" title="Creation Date" text={result.creationDate} />,
    <Label key="class" title="Class" text={result.class} />,

    <Label key="id" title="ID" text={""+result.id} />,
    <Label key="score" title="Score" text={""+result.score} />,
    <Label key="numberOfHits" title="Number of Hits" text={""+result.numberOfHits} />,
    <Label key="altitude" title="Altitude" text={""+result.altitude} />,
    <Label key="latitude" title="Latitude" text={""+result.latitude} />,
    <Label key="longitude" title="Longitude" text={""+result.longitude} />,
    <Label key="interval" title="Interval" text={""+result.interval} />,
    <Label key="numberOfReplicants" title="Number of Replicants" text={""+result.numberOfReplicants} />,
    <Label key="batesNumber" title="Bates Number" text={""+result.batesNumber} />,
    <Label key="annotationCount" title="Annotation Count" text={""+result.annotationCount} />,
    <Label key="characterCount" title="Character Count" text={""+result.characterCount} />,
    <Label key="rating" title="Rating" text={""+result.rating} />,
    <Label key="pageCount" title="Page Count" text={""+result.pageCount} />,
    <Label key="wordCount" title="Word Count" text={""+result.wordCount} />,
    <Label key="size" title="Size" text={""+result.size} />,
    <Label key="attachmentCount" title="Attachment Count" text={""+result.attachmentCount} />,
    <Label key="numberOfDuplicates" title="Number of Duplicates" text={""+result.numberOfDuplicates} />,
    <Label key="height" title="Height" text={""+result.height} />,
    <Label key="duration" title="Duration" text={""+result.duration} />,
    <Label key="dpi" title="DPI" text={""+result.dpi} />,
    <Label key="width" title="Width" text={""+result.width} />,
    <Label key="label" title="Label" text={""+result.label} />,

    <Label key="state" title="State" text={result.state ? "yes" : "no"} />,
    <Label key="excludeFromTagging" title="Exclude from Tagging" text={result.excludeFromTagging ? "yes" : "no"} />,
    <Label key="stateVisibility" title="State Visibility" text={result.stateVisibility ? "yes" : "no"} />,
    <Label key="excludeFromWikiLinking" title="Exclude from Wiki Linking" text={result.excludeFromWikiLinking ? "yes" : "no"} />,
    <Label key="excludeFromClassification" title="Exclude from Classification" text={result.excludeFromClassification ? "yes" : "no"} />,
    <Label key="locking" title="Locking" text={result.locking ? "yes" : "no"} />,
    <Label key="unread" title="Unread" text={result.unread ? "yes" : "no"} />,
    <Label key="indexed" title="Indexed" text={result.indexed ? "yes" : "no"} />,
    <Label key="excludeFromSeeAlso" title="Exclude from See Also" text={result.excludeFromSeeAlso ? "yes" : "no"} />,
    <Label key="excludeFromSearch" title="Exclude from Search" text={result.excludeFromSearch ? "yes" : "no"} />,
  ];
}






















