import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AppItem, Folder } from "../types";
import { scanInstalledApps } from "../utils/apps";
import { t } from "../utils/i18n";
import {
  getHighResAppIcon,
  getHighResAppIconSync,
} from "../utils/iconExtractor";
import { addAppToFolder, removeAppFromFolder } from "../utils/storage";

interface AddAppViewProps {
  folder: Folder;
  onAppAdded: () => void | Promise<void>;
}

/**
 * View for searching installed apps and toggling them into/out of a folder.
 * - Enter: Toggle add/remove without closing the view
 * - ⌘ + Enter: Add app and immediately return to folder
 */
export function AddAppView({ folder, onAppAdded }: AddAppViewProps) {
  const { pop } = useNavigation();
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addedPaths, setAddedPaths] = useState<Set<string>>(
    () => new Set(folder.apps.map((a) => a.path)),
  );

  useEffect(() => {
    async function fetchApps() {
      try {
        const apps = await scanInstalledApps();
        setAllApps(apps);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: t.errorTitle,
          message: t.scanAppsError,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchApps();
  }, []);

  async function handleToggleApp(app: AppItem, closeAfter = false) {
    const isAlreadyInFolder = addedPaths.has(app.path);

    if (isAlreadyInFolder && !closeAfter) {
      await removeAppFromFolder(folder.id, app.path);
      setAddedPaths((prev) => {
        const next = new Set(prev);
        next.delete(app.path);
        return next;
      });
      await onAppAdded();
      await showToast({
        style: Toast.Style.Success,
        title: t.appRemovedTitle,
        message: t.appRemovedMessage(app.name),
      });
      return;
    }

    if (!isAlreadyInFolder) {
      // Cache high-res icon immediately to prevent flicker on return
      getHighResAppIconSync(app.path);
      getHighResAppIcon(app.path);

      await addAppToFolder(folder.id, app);
      setAddedPaths((prev) => {
        const next = new Set(prev);
        next.add(app.path);
        return next;
      });
      await onAppAdded();
      await showToast({
        style: Toast.Style.Success,
        title: t.appAddedTitle,
        message: t.appAddedMessage(app.name, folder.name),
      });
    }

    if (closeAfter) {
      pop();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t.addAppSearchPlaceholder}
    >
      <List.Section
        title={t.addAppSectionTitle(folder.name)}
        subtitle={t.appsCount(addedPaths.size)}
      >
        {allApps.map((app) => {
          const isAlreadyInFolder = addedPaths.has(app.path);

          return (
            <List.Item
              key={app.id}
              title={app.name}
              subtitle={app.path}
              keywords={app.keywords}
              icon={{ fileIcon: app.path }}
              accessories={[
                isAlreadyInFolder
                  ? {
                      tag: {
                        value: t.alreadyAdded,
                        color: Color.Green,
                      },
                      icon: {
                        source: Icon.CheckCircle,
                        tintColor: Color.Green,
                      },
                    }
                  : {
                      text: t.canAdd,
                      icon: Icon.PlusCircle,
                    },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      isAlreadyInFolder ? t.removeFromFolder : t.addToFolder
                    }
                    icon={
                      isAlreadyInFolder ? Icon.MinusCircle : Icon.PlusCircle
                    }
                    onAction={() => handleToggleApp(app, false)}
                  />
                  <Action
                    title={
                      isAlreadyInFolder ? t.doneReturnToFolder : t.addAndReturn
                    }
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => handleToggleApp(app, true)}
                  />
                  <Action
                    title={t.doneReturnToFolder}
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={pop}
                  />
                  <Action.ShowInFinder path={app.path} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
