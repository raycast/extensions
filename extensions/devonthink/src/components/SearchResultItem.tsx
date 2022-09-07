import {Action, ActionPanel, getPreferenceValues, List} from "@raycast/api";
import {SearchResult} from "../hooks/useSearch";
import {Preferences, PropertyKey} from "../types/Preferences";

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
    <MyLabel key="uuid" propKey="propertyUUID" title="UUID" text={result.uuid}/>,
    <MyLabel key="name" propKey="propertyName" title="Name" text={result.name}/>,
    <MyLabel key="path" propKey="propertyPath" title="Path" text={result.path}/>,
    <TagList key="tags" title="Tags">{result.tags.map((tag) => <Tag key={tag} text={tag}/>)}</TagList>,
    <MyLabel key="geolocation" propKey="propertyGeolocation" title="Geolocation" text={result.geolocation}/>,
    <MyLabel key="date" propKey="propertyDate" title="Date" text={result.date}/>,
    <MyLabel key="additionDate" propKey="propertyAdditionDate" title="Addition Date" text={result.additionDate}/>,
    <MyLabel key="modificationDate" propKey="propertyModificationDate" title="Modification Date" text={result.modificationDate}/>,
    <MyLink key="url" propKey="propertyUrl" title="URL" text={result.url} target={result.url}/>,
    <MyLabel key="type" propKey="propertyType" title="Type" text={result.type}/>,
    <MyLabel key="contentHash" propKey="propertyContentHash" title="Content Hash" text={result.contentHash}/>,
    <MyLabel key="location" propKey="propertyLocation" title="Location" text={result.location}/>,
    <MyLabel key="filename" propKey="propertyFilename" title="Filename" text={result.filename}/>,
    <MyLabel key="aliases" propKey="propertyAliases" title="Aliases" text={result.aliases}/>,
    <MyLink key="referenceURL" propKey="propertyReferenceURL" title="Reference URL" text="URL" target={result.referenceURL}/>,
    <MyLabel key="comment" propKey="propertyComment" title="Comment" text={result.comment}/>,
    <MyLabel key="tagType" propKey="propertyTagType" title="Tag Type" text={result.tagType}/>,
    <MyLabel key="locationGroup" propKey="propertyLocationGroup" title="Location Group" text={result.locationGroup}/>,
    <MyLabel key="kind" propKey="propertyKind" title="Kind" text={result.kind}/>,
    <MyLabel key="mimeType" propKey="propertyMimeType" title="MIME Type" text={result.mimeType}/>,
    <MyLabel key="openingDate" propKey="propertyOpeningDate" title="Opening Date" text={result.openingDate}/>,
    <MyLabel key="attachedScript" propKey="propertyAttachedScript" title="Attached Script" text={result.attachedScript}/>,
    <MyLabel key="creationDate" propKey="propertyCreationDate" title="Creation Date" text={result.creationDate}/>,
    <MyLabel key="class" propKey="propertyClass" title="Class" text={result.class}/>,

    <MyLabel key="id" propKey="propertyID" title="ID" text={"" + result.id}/>,
    <MyLabel key="score" propKey="propertyScore" title="Score" text={"" + result.score}/>,
    <MyLabel key="numberOfHits" propKey="propertyNumberOfHits" title="Number of Hits" text={"" + result.numberOfHits}/>,
    <MyLabel key="altitude" propKey="propertyAltitude" title="Altitude" text={"" + result.altitude}/>,
    <MyLabel key="latitude" propKey="propertyLatitude" title="Latitude" text={"" + result.latitude}/>,
    <MyLabel key="longitude" propKey="propertyLongitude" title="Longitude" text={"" + result.longitude}/>,
    <MyLabel key="interval" propKey="propertyInterval" title="Interval" text={"" + result.interval}/>,
    <MyLabel key="numberOfReplicants" propKey="propertyNumberOfReplicants" title="Number of Replicants" text={"" + result.numberOfReplicants}/>,
    <MyLabel key="batesNumber" propKey="propertyBatesNumber" title="Bates Number" text={"" + result.batesNumber}/>,
    <MyLabel key="annotationCount" propKey="propertyAnnotationCount" title="Annotation Count" text={"" + result.annotationCount}/>,
    <MyLabel key="characterCount" propKey="propertyCharacterCount" title="Character Count" text={"" + result.characterCount}/>,
    <MyLabel key="rating" propKey="propertyRating" title="Rating" text={"" + result.rating}/>,
    <MyLabel key="pageCount" propKey="propertyPageCount" title="Page Count" text={"" + result.pageCount}/>,
    <MyLabel key="wordCount" propKey="propertyWordCount" title="Word Count" text={"" + result.wordCount}/>,
    <MyLabel key="size" propKey="propertySize" title="Size" text={"" + result.size}/>,
    <MyLabel key="attachmentCount" propKey="propertyAttachmentCount" title="Attachment Count" text={"" + result.attachmentCount}/>,
    <MyLabel key="numberOfDuplicates" propKey="propertyNumberOfDuplicates" title="Number of Duplicates" text={"" + result.numberOfDuplicates}/>,
    <MyLabel key="height" propKey="propertyHeight" title="Height" text={"" + result.height}/>,
    <MyLabel key="duration" propKey="propertyDuration" title="Duration" text={"" + result.duration}/>,
    <MyLabel key="dpi" propKey="propertyDpi" title="DPI" text={"" + result.dpi}/>,
    <MyLabel key="width" propKey="propertyWidth" title="Width" text={"" + result.width}/>,
    <MyLabel key="label" propKey="propertyLabel" title="Label" text={"" + result.label}/>,

    <MyLabel key="state" propKey="propertyState" title="State" text={result.state ? "yes" : "no"}/>,
    <MyLabel key="excludeFromTagging" propKey="propertyExcludeFromTagging" title="Exclude from Tagging" text={result.excludeFromTagging ? "yes" : "no"}/>,
    <MyLabel key="stateVisibility" propKey="propertyStateVisibility" title="State Visibility" text={result.stateVisibility ? "yes" : "no"}/>,
    <MyLabel key="excludeFromWikiLinking" propKey="propertyExcludeFromWikiLinking" title="Exclude from Wiki Linking"
             text={result.excludeFromWikiLinking ? "yes" : "no"}/>,
    <MyLabel key="excludeFromClassification" propKey="propertyExcludeFromClassification" title="Exclude from Classification"
             text={result.excludeFromClassification ? "yes" : "no"}/>,
    <MyLabel key="locking" propKey="propertyLocking" title="Locking" text={result.locking ? "yes" : "no"}/>,
    <MyLabel key="unread" propKey="propertyUnread" title="Unread" text={result.unread ? "yes" : "no"}/>,
    <MyLabel key="indexed" propKey="propertyIndexed" title="Indexed" text={result.indexed ? "yes" : "no"}/>,
    <MyLabel key="excludeFromSeeAlso" propKey="propertyExcludeFromSeeAlso" title="Exclude from See Also" text={result.excludeFromSeeAlso ? "yes" : "no"}/>,
    <MyLabel key="excludeFromSearch" propKey="propertyExcludeFromSearch" title="Exclude from Search" text={result.excludeFromSearch ? "yes" : "no"}/>,
  ];
}

const Label = List.Item.Detail.Metadata.Label;
const TagList = List.Item.Detail.Metadata.TagList;
const Tag = TagList.Item;
const Link = List.Item.Detail.Metadata.Link;

const preferences: Preferences = getPreferenceValues();

const MyLabel = ({propKey, title, text}: { propKey: PropertyKey, title: string, text?: string }) => {
  if (!preferences[propKey]) {
    return null;
  }

  return (
    preferences.hideEmptySearchResultItemProperties && !text
      ? null
      : <Label title={title} text={text}/>
  );
}

const MyLink = ({propKey, title, text, target}: { propKey: PropertyKey, title: string, text: string, target?: string }) => {
  if (!preferences.hideEmptySearchResultItemProperties) {
    return target
      ? <Link title={title} text={text} target={target}/>
      : <MyLabel propKey={propKey} title={title} text="No URL" />;
  }

  if (!target) {
    return null;
  }

  return <Link title={title} text={text} target={target}/>;
}
