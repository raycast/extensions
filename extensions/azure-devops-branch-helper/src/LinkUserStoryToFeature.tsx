import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAz } from "./az-cli";

interface Preferences {
  azureOrganization?: string;
  azureProject?: string;
}

interface FeatureItem {
  id: number;
  title: string;
  state: string;
}

export default function LinkUserStoryToFeature({
  workItemId,
  onLinked,
}: {
  workItemId: number;
  onLinked?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const { pop } = useNavigation();

  async function loadFeatures() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.azureOrganization || !preferences.azureProject) {
        throw new Error("Azure DevOps organization and project are required");
      }

      const wiql = `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.TeamProject] = '${preferences.azureProject}' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' ORDER BY [System.Title] ASC`;
      const { stdout } = await runAz([
        "boards",
        "query",
        "--wiql",
        wiql,
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization,
        "--project",
        preferences.azureProject,
      ]);

      const arr = JSON.parse(stdout) as Array<{
        id: number;
        fields?: { [key: string]: string };
      }>;
      const items: FeatureItem[] = Array.isArray(arr)
        ? arr.map((it) => ({
            id: it.id,
            title: it.fields?.["System.Title"] ?? "Untitled Feature",
            state: it.fields?.["System.State"] ?? "",
          }))
        : [];
      setFeatures(items);
    } catch (e) {
      console.error("Failed to load features for linking", e);
      await showToast(Toast.Style.Failure, "Failed to load features");
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function linkAsParent(featureId: number) {
    try {
      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.azureOrganization) {
        throw new Error("Azure DevOps organization is required");
      }
      await runAz([
        "boards",
        "work-item",
        "relation",
        "add",
        "--id",
        String(workItemId),
        "--relation-type",
        "parent",
        "--target-id",
        String(featureId),
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization,
      ]);
      await showToast(
        Toast.Style.Success,
        "Linked to feature",
        `#${featureId}`,
      );
      if (onLinked) onLinked();
      pop();
    } catch (e) {
      console.error("Failed to link feature", e);
      await showToast(
        Toast.Style.Failure,
        "Failed to link",
        "Item may already have a parent or access denied",
      );
    }
  }

  useEffect(() => {
    loadFeatures();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search features…">
      <List.Section title="Features">
        {features.map((f) => (
          <List.Item
            key={f.id}
            icon={Icon.Star}
            title={`#${f.id}: ${f.title}`}
            accessories={f.state ? [{ text: f.state }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Link as Parent Feature"
                  icon={Icon.Link}
                  onAction={() => linkAsParent(f.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
