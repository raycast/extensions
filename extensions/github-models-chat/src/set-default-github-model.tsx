import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

export default function Command() {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await LocalStorage.getItem<string>("github_models_catalog");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { id: string }[];
          setModels(parsed.map((m) => m.id));
        } catch (e) {
          // ignore
        }
      }
      setLoading(false);
    })();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search models">
      {models.map((id) => (
        <List.Item
          key={id}
          title={id}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default"
                icon={Icon.Check}
                onAction={async () => {
                  await LocalStorage.setItem("github_default_model", id);
                  await showToast({ style: Toast.Style.Success, title: `Default model set: ${id}` });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!loading && models.length === 0 && (
        <List.EmptyView icon={Icon.Xmark} title="No cached models" description="Run Sync GitHub Models first" />
      )}
    </List>
  );
}
