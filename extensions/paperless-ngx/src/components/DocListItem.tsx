import { environment, getPreferenceValues, Icon, List } from "@raycast/api";
import { Preferences } from "../models/preferences.model";
import { DocActions } from "./DocActions";
import { DocItem } from "../models/docItem.model";
import moment from "moment";
import fs from "fs";
import { useEffect } from "react";
import axios from "axios";

const { apiToken }: Preferences = getPreferenceValues();
const { paperlessURL }: Preferences = getPreferenceValues();
const { dateFormat }: Preferences = getPreferenceValues();

const formatDateTime = (date: string): string => {
  return moment(date).format(dateFormat).toString();
};

axios.interceptors.request.use(
  (config) => {
    config = {
      ...config,
      baseURL: paperlessURL,
      method: "get",
      headers: {
        Authorization: "Token " + apiToken,
      },
      responseType: "stream",
    };
    return config;
  },
  (error) => {
    Promise.reject(error).then();
  }
);

export const DocListItem = ({ document, type, tags, correspondent }: DocItem): JSX.Element => {
  const filePath = `${environment.assetsPath}/${document.id}.png`;

  useEffect(() => {
    if (fs.existsSync(filePath)) {
      return; // File already downloaded
    }
    axios.get(`/api/documents/${document.id}/thumb/`).then((response) => {
      response.data.pipe(fs.createWriteStream(filePath));
    });
  }, []);

  return (
    <List.Item
      title={document.title}
      icon={Icon.Document}
      subtitle={correspondent}
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
