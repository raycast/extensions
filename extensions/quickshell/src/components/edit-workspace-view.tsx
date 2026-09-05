import { useEffect, useState } from "react";
import WorkspaceForm from "./workspace-form";
import { getQuickShellStorage } from "../lib/raycast-storage";
import type { Workspace } from "../lib/schema";
import { Form } from "@raycast/api";

type EditWorkspaceViewProps = {
  workspaceId: string;
  onSaved?: () => Promise<void> | void;
  popOnSave?: boolean;
};

export default function EditWorkspaceView({ workspaceId, onSaved, popOnSave }: EditWorkspaceViewProps) {
  const storage = getQuickShellStorage();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const workspaces = await storage.getWorkspaces();
        const found = workspaces.find((item) => item.id === workspaceId) ?? null;
        if (!cancelled) {
          setWorkspace(found);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, workspaceId]);

  if (isLoading) {
    return <Form isLoading />;
  }

  if (!workspace) {
    return (
      <Form>
        <Form.Description title="Workspace not found" text="This workspace may have been deleted." />
      </Form>
    );
  }

  return <WorkspaceForm mode="edit" initialWorkspace={workspace} onSaved={onSaved} popOnSave={popOnSave} />;
}
