import { environment, getPreferenceValues, Grid, List } from "@raycast/api";
import { useState } from "react";
import { documentsResponse } from "./models/paperlessResponse.model";
import { fetchDocuments } from "./utils/fetchDocuments";
import { DocListItem } from "./components/DocListItem";
import { DocGridItem } from "./components/DocGridItem";
import { useCorrespondents } from "./hooks/useCorrespondents";
import { useTags } from "./hooks/useTags";
import { useDocumentTypes } from "./hooks/useDocumentTypes";
import fs from "fs";
import axios from "axios";

const { apiToken }: Preferences = getPreferenceValues();
const { paperlessURL }: Preferences = getPreferenceValues();

axios.interceptors.request.use(
  (config) => {
    config.headers.set("Authorization", "Token " + apiToken);
    config = {
      ...config,
      baseURL: paperlessURL,
      method: "get",
      responseType: "stream",
    };
    return config;
  },
  (error) => {
    Promise.reject(error).then();
  }
);

export default function DocumentList() {
  const { gridMode }: Preferences = getPreferenceValues();

  const { getCorrespondent } = useCorrespondents();
  const { stringifyTags } = useTags();
  const { getDocumentType } = useDocumentTypes();

  const [results, setResults] = useState<documentsResponse>();
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const documentResponse = await fetchDocuments(text.replace(/\s/g, "+"));

    for (const document of documentResponse.results) {
      const filePath = `${environment.assetsPath}/${document.id}.png`;
      if (fs.existsSync(filePath)) {
        continue; // File already downloaded
      }
      const response = await axios.get(`/api/documents/${document.id}/thumb/`);
      await response.data.pipe(fs.createWriteStream(filePath));
    }
    setResults(documentResponse);
    setLoading(false);
  };

  if (gridMode) {
    return (
      <Grid
        aspectRatio={"2/3"}
        columns={5}
        fit={Grid.Fit.Fill}
        isLoading={loading}
        onSearchTextChange={onSearchTextChange}
        navigationTitle="Search Paperless"
        searchBarPlaceholder={`Search documents, like "Steuer"…`}
        throttle={true}
      >
        {results?.results.length
          ? results.results.map((document) => {
              return (
                <DocGridItem
                  key={document.id}
                  document={document}
                  type={getDocumentType(document)}
                  correspondent={getCorrespondent(document)}
                  tags={stringifyTags(document)}
                />
              );
            })
          : null}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={loading}
        isShowingDetail={true}
        searchBarPlaceholder={`Search documents, like "Steuer"…`}
        onSearchTextChange={onSearchTextChange}
        throttle
      >
        {results?.results.length
          ? results.results.map((document) => {
              return (
                <DocListItem
                  key={document.id}
                  document={document}
                  type={getDocumentType(document)}
                  correspondent={getCorrespondent(document)}
                  tags={stringifyTags(document)}
                />
              );
            })
          : null}
      </List>
    );
  }
}
