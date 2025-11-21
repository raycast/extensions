import { Icon, List } from "@raycast/api";
import { Instance } from "./queryInstances";
import { OutlineDocument } from "./api/OutlineApi";
import { useFetch } from "@raycast/utils";
import DocumentActions from "./components/DocumentActions";

export interface Collection {
  icon: string;
  name: string;
}

export interface CollectionResponse {
  data: Collection;
}

interface DocumentProps {
  document: OutlineDocument;
  instance: Instance;
  onRefresh?: () => void;
}

const Document = ({ document, instance, onRefresh }: DocumentProps) => {
  const { data: collection } = useFetch<CollectionResponse, never, Collection>(`${instance.url}/api/collections.info`, {
    body: JSON.stringify({
      id: document.collectionId,
    }),
    headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
    method: "POST",
  });

  // Use emoji if available, otherwise use document icon
  const doc = document as OutlineDocument & { emoji?: string };
  const icon = doc.emoji || Icon.Document;

  return (
    <List.Item
      accessories={[
        {
          date: new Date(document.updatedAt),
        },
      ]}
      actions={<DocumentActions document={document} instance={instance} onRefresh={onRefresh} />}
      detail={
        <List.Item.Detail
          markdown={document.text || "No content"}
          metadata={
            <List.Item.Detail.Metadata>
              {collection && <List.Item.Detail.Metadata.Label text={collection.name} title="Collection" />}
              {(() => {
                const doc = document as OutlineDocument & { createdBy?: { name: string } };
                return doc.createdBy ? (
                  <List.Item.Detail.Metadata.Label text={doc.createdBy.name} title="Author" />
                ) : null;
              })()}
              <List.Item.Detail.Metadata.Label
                text={new Date(document.createdAt).toLocaleDateString()}
                title="Created At"
              />
              <List.Item.Detail.Metadata.Label
                text={new Date(document.updatedAt).toLocaleDateString()}
                title="Updated At"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      icon={icon}
      key={document.id}
      title={document.title}
    />
  );
};

export default Document;
