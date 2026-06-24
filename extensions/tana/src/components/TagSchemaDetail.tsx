import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TanaTag } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { getTagSchema } from "../api/tanaService";
import { AddFieldToTagAction } from "./AddFieldToTagForm";
import { SetTagCheckboxAction } from "./SetTagCheckboxForm";

export function TagSchemaDetail({ tag, workspaceId }: { tag: TanaTag; workspaceId: string }) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getTagSchema(createPreferenceClient(workspaceId), tag.id);
      setMarkdown(result.markdown);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read Supertag schema",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tag.id, workspaceId]);

  return (
    <Detail
      isLoading={loading}
      markdown={markdown || `# ${tag.name}\n\nNo schema content returned.`}
      actions={
        <ActionPanel>
          <AddFieldToTagAction tag={tag} workspaceId={workspaceId} onComplete={load} />
          <SetTagCheckboxAction tag={tag} workspaceId={workspaceId} onComplete={load} />
          <Action title="Refresh Schema" icon={Icon.ArrowClockwise} onAction={load} />
        </ActionPanel>
      }
    />
  );
}
