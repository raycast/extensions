import {Action, ActionPanel, getPreferenceValues, List} from "@raycast/api";
import {SearchResult} from "../hooks/useSearch";
import {Preferences} from "../types/Preferences";

const SearchResultItem = ({result}: { result: SearchResult }) => (
  <List.Item
    title={result.name}
    icon={{fileIcon: result.path}}
    actions={
      <ActionPanel>
        <Action.Open title="Open in DEVONthink" target={`x-devonthink-item://${result.uuid}`}/>
        <Action.Open title="Open in the default app" target={result.path}/>
        <Action.Open title="Reveal in DEVONthink" target={`x-devonthink-item://${result.uuid}?reveal=1`}/>
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

const searchResultMetadataItems = (result: SearchResult) => {
  return [
    <MyLabel key="uuid" title="UUID" text={result.uuid}/>,
    <MyLabel key="name" title="Name" text={result.name}/>,
    <MyLabel key="path" title="Path" text={result.path}/>,
    <TagList key="tags" title="Tags">{result.tags.map((tag) => <Tag key={tag} text={tag}/>)}</TagList>,
    <MyLabel key="geolocation" title="Geolocation" text={result.geolocation}/>,
    <MyLabel key="date" title="Date" text={result.date}/>,
    <MyLabel key="additionDate" title="Addition Date" text={result.additionDate}/>,
    <MyLabel key="modificationDate" title="Modification Date" text={result.modificationDate}/>,
    <MyLink key="url" title="URL" text={result.url} target={result.url}/>,
    <MyLabel key="type" title="Type" text={result.type}/>,
    <MyLabel key="contentHash" title="Content Hash" text={result.contentHash}/>,
    <MyLabel key="location" title="Location" text={result.location}/>,
    <MyLabel key="filename" title="Filename" text={result.filename}/>,
    <MyLabel key="aliases" title="Aliases" text={result.aliases}/>,
    <MyLink key="referenceURL" title="Reference URL" text="URL" target={result.referenceURL}/>,
    <MyLabel key="comment" title="Comment" text={result.comment}/>,
    <MyLabel key="tagType" title="Tag Type" text={result.tagType}/>,
    <MyLabel key="locationGroup" title="Location Group" text={result.locationGroup}/>,
    <MyLabel key="kind" title="Kind" text={result.kind}/>,
    <MyLabel key="mimeType" title="MIME Type" text={result.mimeType}/>,
    <MyLabel key="openingDate" title="Opening Date" text={result.openingDate}/>,
    <MyLabel key="attachedScript" title="Attached Script" text={result.attachedScript}/>,
    <MyLabel key="creationDate" title="Creation Date" text={result.creationDate}/>,
    <MyLabel key="class" title="Class" text={result.class}/>,

    <MyLabel key="id" title="ID" text={"" + result.id}/>,
    <MyLabel key="score" title="Score" text={"" + result.score}/>,
    <MyLabel key="numberOfHits" title="Number of Hits" text={"" + result.numberOfHits}/>,
    <MyLabel key="altitude" title="Altitude" text={"" + result.altitude}/>,
    <MyLabel key="latitude" title="Latitude" text={"" + result.latitude}/>,
    <MyLabel key="longitude" title="Longitude" text={"" + result.longitude}/>,
    <MyLabel key="interval" title="Interval" text={"" + result.interval}/>,
    <MyLabel key="numberOfReplicants" title="Number of Replicants" text={"" + result.numberOfReplicants}/>,
    <MyLabel key="batesNumber" title="Bates Number" text={"" + result.batesNumber}/>,
    <MyLabel key="annotationCount" title="Annotation Count" text={"" + result.annotationCount}/>,
    <MyLabel key="characterCount" title="Character Count" text={"" + result.characterCount}/>,
    <MyLabel key="rating" title="Rating" text={"" + result.rating}/>,
    <MyLabel key="pageCount" title="Page Count" text={"" + result.pageCount}/>,
    <MyLabel key="wordCount" title="Word Count" text={"" + result.wordCount}/>,
    <MyLabel key="size" title="Size" text={"" + result.size}/>,
    <MyLabel key="attachmentCount" title="Attachment Count" text={"" + result.attachmentCount}/>,
    <MyLabel key="numberOfDuplicates" title="Number of Duplicates" text={"" + result.numberOfDuplicates}/>,
    <MyLabel key="height" title="Height" text={"" + result.height}/>,
    <MyLabel key="duration" title="Duration" text={"" + result.duration}/>,
    <MyLabel key="dpi" title="DPI" text={"" + result.dpi}/>,
    <MyLabel key="width" title="Width" text={"" + result.width}/>,
    <MyLabel key="label" title="Label" text={"" + result.label}/>,

    <MyLabel key="state" title="State" text={result.state ? "yes" : "no"}/>,
    <MyLabel key="excludeFromTagging" title="Exclude from Tagging" text={result.excludeFromTagging ? "yes" : "no"}/>,
    <MyLabel key="stateVisibility" title="State Visibility" text={result.stateVisibility ? "yes" : "no"}/>,
    <MyLabel key="excludeFromWikiLinking" title="Exclude from Wiki Linking"
             text={result.excludeFromWikiLinking ? "yes" : "no"}/>,
    <MyLabel key="excludeFromClassification" title="Exclude from Classification"
             text={result.excludeFromClassification ? "yes" : "no"}/>,
    <MyLabel key="locking" title="Locking" text={result.locking ? "yes" : "no"}/>,
    <MyLabel key="unread" title="Unread" text={result.unread ? "yes" : "no"}/>,
    <MyLabel key="indexed" title="Indexed" text={result.indexed ? "yes" : "no"}/>,
    <MyLabel key="excludeFromSeeAlso" title="Exclude from See Also" text={result.excludeFromSeeAlso ? "yes" : "no"}/>,
    <MyLabel key="excludeFromSearch" title="Exclude from Search" text={result.excludeFromSearch ? "yes" : "no"}/>,
  ];
}

const Label = List.Item.Detail.Metadata.Label;
const TagList = List.Item.Detail.Metadata.TagList;
const Tag = TagList.Item;
const Link = List.Item.Detail.Metadata.Link;

const preferences: Preferences = getPreferenceValues();

const MyLabel = ({title, text}: { title: string, text?: string }) => (
  preferences.hideEmptySearchResultItemProperties && !text
    ? null
    : <Label title={title} text={text}/>
)

const MyLink = ({title, text, target}: { title: string, text: string, target?: string }) => {
  if (!preferences.hideEmptySearchResultItemProperties) {
    return target
      ? <Link title={title} text={text} target={target}/>
      : <MyLabel title={title} text="No URL" />;
  }

  if (!target) {
    return null;
  }

  return <Link title={title} text={text} target={target}/>;
}
