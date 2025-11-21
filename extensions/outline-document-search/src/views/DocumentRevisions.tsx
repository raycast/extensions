import { List, ActionPanel, Action, Detail, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { OutlineApi, Revision } from "../api/OutlineApi";
import { Instance } from "../queryInstances";

interface DocumentRevisionsProps {
  documentId: string;
  documentTitle: string;
  instance: Instance;
}

export default function DocumentRevisions({ documentId, documentTitle, instance }: DocumentRevisionsProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();
  const api = new OutlineApi(instance);

  useEffect(() => {
    async function fetchRevisions() {
      setIsLoading(true);
      try {
        const data = await api.listRevisions(documentId);
        setRevisions(data);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load revisions",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevisions();
  }, [documentId]);

  async function handleViewRevision(revision: Revision) {
    push(<RevisionDetail revision={revision} />);
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Revisions - ${documentTitle}`}>
      {revisions.map((revision, index) => (
        <List.Item
          key={revision.id}
          title={revision.title}
          subtitle={`by ${revision.createdBy.name}`}
          accessories={[{ text: `v${revisions.length - index}` }, { date: new Date(revision.createdAt) }]}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="View Revision" icon={Icon.Eye} onAction={() => handleViewRevision(revision)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface RevisionDetailProps {
  revision: Revision;
}

function RevisionDetail({ revision }: RevisionDetailProps) {
  const markdown = `# ${revision.title}\n\n${revision.text || "No content"}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Revision - ${revision.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={revision.createdBy.name} />
          <Detail.Metadata.Label title="Created" text={new Date(revision.createdAt).toLocaleDateString()} />
        </Detail.Metadata>
      }
    />
  );
}
