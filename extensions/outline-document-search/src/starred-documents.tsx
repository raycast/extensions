import { List, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Instance } from "./queryInstances";
import { OutlineApi, OutlineDocument } from "./api/OutlineApi";
import DocumentActions from "./components/DocumentActions";
import EmptyList from "./EmptyList";

export default function Command() {
  const { value: instances } = useLocalStorage<Instance[]>("instances");
  const [documents, setDocuments] = useState<{ instance: Instance; docs: OutlineDocument[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStarredDocuments();
  }, [instances]);

  async function fetchStarredDocuments() {
    if (!instances || instances.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await Promise.all(
        instances.map(async (instance) => {
          try {
            const api = new OutlineApi(instance);
            const docs = await api.getStarredDocuments();
            return { instance, docs };
          } catch (error) {
            console.error(`Failed to fetch starred documents from ${instance.name}:`, error);
            return { instance, docs: [] };
          }
        }),
      );

      // Filter out instances with no starred documents
      setDocuments(results.filter((result) => result.docs.length > 0));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load starred documents",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!instances || instances.length === 0) {
    return (
      <List>
        <EmptyList />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search starred documents...">
      {documents.length === 0 && !isLoading && (
        <List.EmptyView title="No starred documents" description="Star documents to see them here" />
      )}
      {documents.map(({ instance, docs }) => (
        <List.Section key={instance.name} title={instance.name} subtitle={docs.length.toString()}>
          {docs.map((doc) => (
            <List.Item
              key={doc.id}
              title={doc.title}
              subtitle={(doc.text || "").substring(0, 50) + (doc.text && doc.text.length > 50 ? "..." : "")}
              accessories={[{ date: new Date(doc.updatedAt) }]}
              actions={<DocumentActions document={doc} instance={instance} onRefresh={fetchStarredDocuments} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
