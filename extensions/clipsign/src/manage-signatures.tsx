import {
  List,
  ActionPanel,
  Action,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getSignatures,
  deleteSignature,
  copySignatureToClipboard,
} from "./utils/storage";
import { Signature } from "./types";
import CreateSignature from "./create-signatures";
import { showFailureToast } from "@raycast/utils";

export default function ManageSignatures() {
  const [sigs, setSigs] = useState<Signature[]>([]);
  const [isLoading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const all = await getSignatures();
    setSigs(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (sig: Signature) => {
    const ok = await confirmAlert({
      title: "Delete Signature",
      message: `Are you sure you want to delete "${sig.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (ok) {
      await deleteSignature(sig.id);
      showToast(Toast.Style.Success, "Signature deleted");
      await load();
    }
  };

  const handleCopy = async (sig: Signature) => {
    try {
      await copySignatureToClipboard(sig);
      showToast(Toast.Style.Success, `Copied "${sig.name}" to clipboard`);
    } catch (error) {
      showFailureToast(error, { title: `Failed to copy "${sig.name}"` });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Manage signatures…">
      {sigs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No signatures found"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Signature"
                target={<CreateSignature onSignatureCreated={load} />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : (
        sigs.map((sig) => {
          const isTextBased = Boolean(sig.content);
          const subtitle = isTextBased
            ? `From text (font: ${sig.font})`
            : "Uploaded image";
          const iconSource = sig.imagePath
            ? { source: sig.imagePath }
            : Icon.Image;

          return (
            <List.Item
              key={sig.id}
              title={sig.name}
              subtitle={subtitle}
              icon={iconSource}
              accessories={[
                {
                  date: new Date(sig.createdAt),
                  tooltip: `Created on ${new Date(sig.createdAt).toLocaleDateString()}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy to Clipboard"
                    icon={iconSource}
                    onAction={() => handleCopy(sig)}
                  />
                  <Action.Push
                    title="Edit Signature"
                    target={
                      <CreateSignature
                        onSignatureCreated={load}
                        signature={sig}
                      />
                    }
                    icon={Icon.Pencil}
                  />
                  <Action
                    title="Delete Signature"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(sig)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
