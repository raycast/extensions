import { environment, getPreferenceValues, Icon, List } from "@raycast/api";
import { Preferences } from "../models/preferences.model";
import { DocActions } from "./DocActions";
import { DocItem } from "../models/docItem.model";
import moment from "moment";
const { dateFormat, showCorrespondentInSubtitle, showDateInSubtitle }: Preferences = getPreferenceValues();

const formatDateTime = (date: string): string => {
  return moment(date).format(dateFormat).toString();
};

const getSubTitle = (correspondent?: string, dateCreated?: string): string => {
  const stripTimeFormat = dateFormat.split(" ")[0];
  const date = moment(dateCreated).format(stripTimeFormat).toString();
  if (!showCorrespondentInSubtitle && !showDateInSubtitle) {
    return "";
  }
  if (showCorrespondentInSubtitle && !showDateInSubtitle) {
    return correspondent || "";
  }
  if (!showCorrespondentInSubtitle && showDateInSubtitle) {
    return date || "";
  }
  if (showCorrespondentInSubtitle && showDateInSubtitle) {
    if (correspondent && date) {
      return `${correspondent} - ${date}`;
    } else if (correspondent) {
      return correspondent;
    } else if (date) {
      return date;
    }
  }
  return "";
};

export const DocListItem = ({ document, type, tags, correspondent }: DocItem): JSX.Element => {
  return (
    <List.Item
      title={document.title}
      icon={Icon.Document}
      subtitle={getSubTitle(correspondent, document.created)}
      detail={
        <List.Item.Detail
          markdown={`![Illustration](${environment.assetsPath}/${document.id}.png)`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={type} />
              <List.Item.Detail.Metadata.Label title="Correspondent" text={correspondent} />
              <List.Item.Detail.Metadata.Label title="Tags" text={tags} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Added" text={formatDateTime(document.added)} />
              <List.Item.Detail.Metadata.Label title="Created" text={formatDateTime(document.created)} />
              <List.Item.Detail.Metadata.Label title="Modified" text={formatDateTime(document.modified)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<DocActions document={document} />}
    />
  );
};
