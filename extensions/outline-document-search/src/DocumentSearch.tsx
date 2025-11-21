import { useState } from "react";
import { useAsync } from "react-use";
import { List, showToast, Toast } from "@raycast/api";
import { Instance } from "./queryInstances";
import Document from "./Document";
import { OutlineApi, OutlineDocument } from "./api/OutlineApi";
import EmptyList from "./EmptyList";

const DocumentSearch = ({ instances }: { instances: Instance[] }) => {
  const searchEverywhere = instances.length > 1;
  const placeholder = searchEverywhere ? "Search documents everywhere" : `Search documents in ${instances[0].name}`;

  const [matchedDocumentsPerInstance, setMatchedDocumentsPerInstance] = useState<
    { instance: Instance; docs: OutlineDocument[] }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Search as user types (original behavior)
  useAsync(async () => {
    if (instances.length === 0 || query.length === 0) {
      setMatchedDocumentsPerInstance([]);
      return;
    }

    setIsLoading(true);

    try {
      const results = await Promise.all(
        instances.map(async (instance) => {
          try {
            const api = new OutlineApi(instance);
            const docs = await api.searchDocuments(query);
            return { instance, docs };
          } catch (error) {
            console.error(`Failed to search documents in ${instance.name}:`, error);
            await showToast({
              style: Toast.Style.Failure,
              title: `Failed to search in ${instance.name}`,
            });
            return { instance, docs: [] };
          }
        }),
      );

      const filteredResults = results.filter(({ docs }) => docs.length > 0);
      setMatchedDocumentsPerInstance(filteredResults);

      if (filteredResults.length === 0) {
        await showToast(Toast.Style.Failure, "Found no matching documents!");
      } else {
        const totalDocs = filteredResults.reduce((sum, { docs }) => sum + docs.length, 0);
        await showToast(Toast.Style.Success, `Found ${totalDocs} matching documents!`);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [instances, query]);

  async function handleRefresh() {
    // Re-run search with current query
    if (query.length > 0) {
      setQuery(query + " "); // Trigger re-search
      setTimeout(() => setQuery(query.trim()), 100);
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={matchedDocumentsPerInstance.length >= 1}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={placeholder}
      throttle
    >
      {matchedDocumentsPerInstance.length === 0 && !isLoading && query.length > 0 && (
        <List.EmptyView title="No matching documents" description="Try a different search term" />
      )}
      {matchedDocumentsPerInstance.length === 0 && query.length === 0 && <EmptyList />}
      {searchEverywhere &&
        matchedDocumentsPerInstance.map(({ instance, docs }) => (
          <List.Section key={instance.name} subtitle={docs.length.toString()} title={instance.name}>
            {docs.map((document) => (
              <Document document={document} instance={instance} key={document.id} onRefresh={handleRefresh} />
            ))}
          </List.Section>
        ))}
      {!searchEverywhere &&
        matchedDocumentsPerInstance[0]?.docs.map((document) => (
          <Document document={document} instance={instances[0]} key={document.id} onRefresh={handleRefresh} />
        ))}
    </List>
  );
};

export default DocumentSearch;
