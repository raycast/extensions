import { environment, getPreferenceValues, Grid } from "@raycast/api";
import { DocActions } from "./DocActions";
import axios from "axios";
import { useEffect } from "react";
import fs from "fs";
import { Preferences } from "../models/preferences.model";
import { DocItem } from "../models/docItem.model";

const { apiToken }: Preferences = getPreferenceValues();
const { paperlessURL }: Preferences = getPreferenceValues();

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

export const DocGridItem = ({ document, type }: DocItem): JSX.Element => {
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
    <Grid.Item
      key={document.id}
      title={document.title}
      subtitle={type}
      content={`${environment.assetsPath}/${document.id}.png`}
      actions={<DocActions key={document.id} document={document} />}
    />
  );
};
