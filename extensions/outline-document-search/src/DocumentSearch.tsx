import { useState } from "react";
import { useAsync } from "react-use";
import { List, showToast, Toast } from "@raycast/api";
import queryInstances, { Instance } from "./queryInstances";
import Document from "./Document";
import OutlineDocument from "./OutlineDocument";
import EmptyList from "./EmptyList";

const DocumentSearch = ({ instances }: { instances: Instance[] }) => {
  const searchEverywhere = instances.length > 1;
  const placeholder = searchEverywhere ? "Search documents everywhere" : `Search documents in ${instances[0].name}`;

  const [matchedDocumentsPerInstance, setMatchedDocumentsPerInstance] = useState<OutlineDocument[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  useAsync(async () => {
    if (instances.length === 0 || query.length === 0) return;

    setIsLoading(true);

    const queries = queryInstances(query, instances);
    const fetchedDocumentsPerInstance = await Promise.all(queries);
    const filteredDocumentsPerInstance = fetchedDocumentsPerInstance.filter((matches) => matches.length > 0);

    setMatchedDocumentsPerInstance(filteredDocumentsPerInstance);
    setIsLoading(false);

    if (fetchedDocumentsPerInstance.length === 0) {
      await showToast(Toast.Style.Failure, "Found no matching documents!");
    } else {
      await showToast(Toast.Style.Success, `Found ${filteredDocumentsPerInstance.flat().length} matching documents!`);
    }
  }, [instances, query]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={matchedDocumentsPerInstance.length >= 1}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={placeholder}
      throttle
    >
      {matchedDocumentsPerInstance.length === 0 && <EmptyList />}
      {matchedDocumentsPerInstance.length >= 1 &&
        searchEverywhere &&
        matchedDocumentsPerInstance.map((matches, instanceIndex) => (
          <List.Section key={instanceIndex} subtitle={matches.length.toString()} title={instances[instanceIndex].name}>
            {matches.map((document, documentIndex) => (
              <Document document={document} instance={instances[instanceIndex]} key={documentIndex} />
            ))}
          </List.Section>
        ))}
      {matchedDocumentsPerInstance.length === 1 &&
        !searchEverywhere &&
        matchedDocumentsPerInstance[0]?.map((document, documentIndex) => (
          <Document document={document} instance={instances[0]} key={documentIndex} />
        ))}
    </List>
  );
};

export default DocumentSearch;
