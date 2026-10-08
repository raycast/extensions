import { useCallback, useState } from "react";
import { DeleteMode, VaultListEntry } from "../interfaces";
import {
  addToFavorites,
  callDelete,
  callTree,
  ConfigurationError,
  deleteEnabled,
  getTechnicalPaths,
  getVaultNamespace,
  removeFromFavorites,
} from "../utils";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { Back, Configuration, CopyToken, OpenVault, Reload, Root } from "./actions";
import { VaultDisplay } from "./display";
import { useCachedState, usePromise } from "@raycast/utils";

export function VaultTree(props: { path: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTechnical, setShowTechnical] = useCachedState("show-technical", false, { cacheNamespace: "tree" });
  const [keys, setKeys] = useState<VaultListEntry[]>([]);
  const [error, setError] = useState<Error | unknown | null>(null);

  const { isLoading: isLoadingTree, revalidate } = usePromise(async () => {
    setError(null);
    try {
      setKeys(await callTree(props.path));
    } catch (e: unknown) {
      if (e instanceof ConfigurationError) {
        console.error(e);
        await showHUD(e.message);
        await openCommandPreferences();
        return;
      }
      setError(e);
      throw e;
    }
  });

  const deleteInFolder = useCallback(async (path: string): Promise<number> => {
    const tree = await callTree(path);
    let deleted = 0;
    for (const entry of tree) {
      if (entry.folder) {
        const deletedInFolder = await deleteInFolder(entry.key);
        deleted = deleted + deletedInFolder;
      } else {
        console.info("Deleting entry...", entry.key);
        await callDelete(entry.key, DeleteMode.destroyAllVersions);
        deleted++;
      }
    }
    return deleted;
  }, []);

  const deleteRecursively = useCallback(
    async (path: string) => {
      console.info(path);
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting secrets",
      });

      try {
        if (
          await confirmAlert({
            title: "Are you sure you want to destroy all secret versions ?",
            message:
              "All secret versions and metadata are permanently destroyed and cannot be read or recovered later.",
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
            icon: Icon.DeleteDocument,
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
          })
        ) {
          const nbDeleted = await deleteInFolder(path);

          toast.style = Toast.Style.Success;
          toast.message = nbDeleted + " secrets deleted";

          await revalidate();
        } else {
          await toast.hide();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to delete secret\nPath: " + path + "\n" + String(error);
      } finally {
        setIsLoading(false);
      }
    },
    [deleteInFolder, revalidate]
  );

  function buildError(error: Error | unknown) {
    const namespace = getVaultNamespace();
    const namespaceStr = namespace !== "" ? " for namespace " + namespace : "";
    return "Could not list vault secret tree " + namespaceStr + ":\n\n````\n\n" + error + "\n\n````";
  }

  return error != null ? (
    <Detail
      markdown={buildError(error)}
      actions={
        <ActionPanel>
          <Configuration />
        </ActionPanel>
      }
    />
  ) : (
    <List filtering={true} isLoading={isLoading || isLoadingTree} navigationTitle={props.path}>
      <List.EmptyView
        title={"No secrets found"}
        actions={
          <ActionPanel>
            <Configuration />
          </ActionPanel>
        }
      />

      {keys
        .filter((entry) => getTechnicalPaths().indexOf(entry.label) === -1 || showTechnical)
        .map((entry) => (
          <List.Item
            key={entry.key}
            title={entry.label}
            icon={
              entry.folder
                ? { source: Icon.Folder, tintColor: Color.Blue }
                : {
                    source: Icon.Document,
                    tintColor: Color.Green,
                  }
            }
            accessories={
              entry.favorite
                ? [
                    {
                      icon: {
                        source: Icon.Star,
                        tintColor: Color.Yellow,
                      },
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigation">
                  {!entry.folder && (
                    <Action.Push
                      icon={Icon.ArrowDown}
                      title="Retrieve Secret"
                      target={<VaultDisplay path={entry.key} />}
                    />
                  )}
                  {entry.folder && (
                    <Action.Push icon={Icon.ArrowDown} title="Go Inside" target={<VaultTree path={entry.key} />} />
                  )}
                  {entry.favorite ? (
                    <Action
                      icon={Icon.Star}
                      title={"Remove From Favorites"}
                      onAction={() => removeFromFavorites(entry.key, revalidate)}
                    />
                  ) : (
                    <Action
                      icon={Icon.Star}
                      title={"Add to Favorites"}
                      onAction={() => addToFavorites(entry.key, revalidate)}
                    />
                  )}
                  {props.path !== "/" && <Back path={props.path} />}
                  {props.path !== "/" && <Root />}
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">{CopyToken()}</ActionPanel.Section>
                <ActionPanel.Section title="Display">
                  <Action
                    icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
                    title={showTechnical ? "Hide Technical" : "Show Technical"}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => setShowTechnical(!showTechnical)}
                  />
                  <OpenVault path={entry.key} />
                </ActionPanel.Section>
                {deleteEnabled() && (
                  <ActionPanel.Section title="Delete">
                    {entry.folder && (
                      <Action
                        icon={Icon.Trash}
                        title="Delete All Secrets Recursively"
                        onAction={() => deleteRecursively(entry.key)}
                      />
                    )}
                  </ActionPanel.Section>
                )}
                <Configuration />
                <Reload revalidate={revalidate} />
              </ActionPanel>
            }
          ></List.Item>
        ))}
    </List>
  );
}
