import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteProject, getProjects } from "./storage";
import { ProjectItem } from "./types";
import { useEffect, useState } from "react";
import { getAndroidStudioApp, getFinderApp, showAndroidStudioAppNotInstalled } from "./common/util";

export default function Main() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [androidStudioIcon, setAndroidStudioIcon] = useState<Image.ImageLike | undefined | null>(undefined);
  const [finderIcon, setFinderIcon] = useState<Image.ImageLike | undefined | null>(undefined);

  async function getSavedProjects() {
    try {
      const projects = await getProjects();
      setProjects(projects);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't get saved projects.",
      });
    }
  }

  useEffect(() => {
    (async () => {
      const asApp = await getAndroidStudioApp();
      if (asApp) {
        setAndroidStudioIcon({ fileIcon: asApp.path });
      }

      const finderApp = await getFinderApp();
      if (finderApp) {
        setFinderIcon({ fileIcon: finderApp.path });
      }

      await getSavedProjects();
    })();
  }, []);

  async function openInAndroidStudio(project: ProjectItem) {
    const androidStudioApp = await getAndroidStudioApp();
    if (!androidStudioApp) {
      showAndroidStudioAppNotInstalled();
      return;
    }

    try {
      await open(project.path, androidStudioApp);
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open.",
      });
    }
  }
  async function openInFinder(project: ProjectItem) {
    try {
      const finderApp = await getFinderApp();
      await open(project.path, finderApp);
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open.",
      });
    }
  }

  async function remove(project: ProjectItem) {
    try {
      const options: Alert.Options = {
        title: "Remove Project",
        message: "Are you sure you want to remove this project from projects list?",
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Remove",
        },
      };

      if (await confirmAlert(options)) {
        await deleteProject(project);
        setProjects(projects.filter((item) => item !== project));
        await showHUD("Project Removed ✅");
      }
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Deleting.",
      });
    }
  }

  function getQuickLinkForPath(path: string): string {
    const context = `{"defaultValue":"${path}"}`;
    const encodedContext = encodeURIComponent(context);
    return `raycast://extensions/3llomi/open-in-android-studio/index?context=${encodedContext}`;
  }

  return (
    <List isLoading={isLoading}>
      {projects.map((item) => {
        return (
          <List.Item
            actions={
              <>
                <ActionPanel>
                  <Action
                    icon={androidStudioIcon}
                    title="Open in Android Studio"
                    onAction={async () => {
                      await openInAndroidStudio(item);
                    }}
                  />

                  <Action
                    icon={finderIcon}
                    title="Open in Finder"
                    onAction={async () => {
                      await openInFinder(item);
                    }}
                  />

                  <Action.CreateQuicklink
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    quicklink={{ link: getQuickLinkForPath(item.path) }}
                  />

                  <Action
                    icon={Icon.Trash}
                    title="Remove"
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      await remove(item);
                    }}
                  />
                </ActionPanel>
              </>
            }
            id={item.path}
            key={item.path}
            title={item.name}
            subtitle={item.path}
          />
        );
      })}
    </List>
  );
}
