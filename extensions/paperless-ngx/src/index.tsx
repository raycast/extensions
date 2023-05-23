import { getPreferenceValues, Grid, List } from "@raycast/api";
import { useState } from "react";
import {
  documentsResponse,
  tagsResponse,
  typesResponse,
  correspondentsResponse,
  Document,
} from "./models/paperlessResponse.model";
import { fetchDocuments } from "./utils/fetchDocuments";
import { DocListItem } from "./components/DocListItem";
import { fetchDocumentTags } from "./utils/fetchDocumentTags";
import { fetchDocumentTypes } from "./utils/fetchDocumentTypes";
import { fetchCorrespondents } from "./utils/fetchCorrespondents";
import { Preferences } from "./models/preferences.model";
import { DocGridItem } from "./components/DocGridItem";

export default function DocumentList() {
  const { gridMode }: Preferences = getPreferenceValues();

  const [results, setResults] = useState<documentsResponse>();
  const [tags, setTags] = useState<tagsResponse>();
  const [types, setTypes] = useState<typesResponse>();
  const [correspondents, setCorrespondents] = useState<correspondentsResponse>();
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const response = await fetchDocuments(text.replace(/\s/g, "+"));
    setResults(response);
    const documentResponse = await fetchDocuments(text.replace(/\s/g, "+"));
    setResults(documentResponse);
    const documentTagsResponse = await fetchDocumentTags();
    setTags(documentTagsResponse);
    const documentTypesResponse = await fetchDocumentTypes();
    setTypes(documentTypesResponse);
    const correspondentsResponse = await fetchCorrespondents();
    setCorrespondents(correspondentsResponse);
    setLoading(false);
  };

  const getCorrespondent = (doc: Document) => {
    if (!correspondents) {
      return "";
    }
    const correspondent = correspondents.results.find((correspondent) => correspondent.id === doc.correspondent);
    return correspondent?.name;
  };

  const getDocumentType = (doc: Document) => {
    if (!types) {
      return "";
    }
    const type = types.results.find((type) => type.id === doc.document_type);
    return type?.name;
  };

  const stringifyTags = (doc: Document) => {
    // Returns a string of all tags for a document
    if (tags) {
      const tagNames = doc.tags.map((tag) => {
        const tagName = tags.results.find((tagResult) => tagResult.id === tag);
        return tagName?.name;
      });

      // Remove undefined tags (it seems that Paperless inbox associated tag is not returned by the API in the /tags path)
      const definedTags = tagNames.filter((tag) => tag);

      return definedTags?.join(", ");
    }
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
