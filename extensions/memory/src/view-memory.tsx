import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { exec } from "child_process";
import path from "node:path";
import { knowledgeGraphManager } from "./knowledge-graph-manager";
import { environment } from "@raycast/api";

interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Re-create the memory file path as defined in the manager.
const MEMORY_FILE_PATH = path.join(environment.supportPath, "memory.json");

export default function ViewMemoryCommand() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const loadedGraph = await knowledgeGraphManager.readGraph();
        setGraph(loadedGraph);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to load memory", String(error));
      } finally {
        setIsLoading(false);
      }
    }
    fetchGraph();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!(graph && graph.entities.length === 0)}
      searchBarPlaceholder="Filter Entities"
    >
      {graph && graph.entities.length === 0 && (
        <List.EmptyView icon={Icon.Bookmark} title="Memory is Empty" description="Talk to Raycast AI to get started" />
      )}
      {graph &&
        graph.entities.map((entity) => {
          // Find outgoing and incoming relations.
          const outgoing = graph.relations.filter((r) => r.from === entity.name);
          const incoming = graph.relations.filter((r) => r.to === entity.name);

          let markdown = `# ${entity.name} (${entity.entityType})\n\n`;

          // Observations section.
          markdown += `## Observations\n`;
          if (entity.observations.length === 0) {
            markdown += "None\n";
          } else {
            entity.observations.forEach((obs) => {
              markdown += `- ${obs}\n`;
            });
          }

          // Relations section.
          markdown += `\n## Relations\n`;
          if (outgoing.length === 0 && incoming.length === 0) {
            markdown += "None\n";
          } else {
            outgoing.forEach((rel) => {
              markdown += `- Outgoing: [${rel.relationType}] → ${rel.to}\n`;
            });
            incoming.forEach((rel) => {
              markdown += `- Incoming: [${rel.relationType}] ← ${rel.from}\n`;
            });
          }

          return (
            <List.Item
              key={entity.name}
              title={entity.name}
              subtitle={entity.entityType}
              accessories={[{ text: `${entity.observations.length} obs` }]}
              detail={<List.Item.Detail markdown={markdown} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Reveal Memory File in Finder"
                      icon={Icon.Finder}
                      onAction={() => {
                        exec(`open -R "${MEMORY_FILE_PATH}"`, (error) => {
                          if (error) {
                            showToast(Toast.Style.Failure, "Failed to reveal file", error.message);
                          }
                        });
                      }}
                    />
                    <Action
                      title="Refresh Graph"
                      icon={Icon.Repeat}
                      onAction={async () => {
                        setIsLoading(true);
                        try {
                          const refreshed = await knowledgeGraphManager.readGraph();
                          setGraph(refreshed);
                        } catch (error) {
                          showToast(Toast.Style.Failure, "Error refreshing graph", String(error));
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    />
                    <Action
                      title="Delete Entity"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await confirmAlert({
                          title: "Are you sure?",
                          message:
                            "Deleting this entity will permanently remove it along with its observations and relations.",
                          icon: Icon.Trash,
                          primaryAction: {
                            title: "Delete Entity",
                            style: Alert.ActionStyle.Destructive,
                            onAction: async () => {
                              try {
                                await knowledgeGraphManager.deleteEntities([entity.name]);
                                setGraph((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    entities: prev.entities.filter((e) => e.name !== entity.name),
                                    relations: prev.relations.filter(
                                      (r) => r.from !== entity.name && r.to !== entity.name,
                                    ),
                                  };
                                });
                                showToast(Toast.Style.Success, "Entity deleted");
                              } catch (error) {
                                showToast(Toast.Style.Failure, "Failed to delete entity", String(error));
                              }
                            },
                          },
                        });
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
