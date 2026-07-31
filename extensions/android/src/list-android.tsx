import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  isAndroidStudioInstalled,
  isValidDirectory,
  listDirectories,
  runCommand,
} from "./util/utils";
import { quoteArg } from "./util/shell";

export default function Command() {
  const [items, setItems] = useState<string[]>(() => []);
  const [loading, setLoading] = useState(true);

  const projectsDirectory = getPreferenceValues().androidProjectsDirectory;

  useEffect(() => {
    async function listDir() {
      if (await !isAndroidStudioInstalled()) {
        showToast(Toast.Style.Failure, "Android studio is not installed");
        setLoading(false);
        return;
      }

      if (!isValidDirectory(projectsDirectory)) {
        showToast(Toast.Style.Failure, "Invalid Projects directory");
        setLoading(false);
        return;
      }

      await listDirectories(projectsDirectory)
        .then((value) => {
          const items = value
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          setItems(items);
          showToast(Toast.Style.Success, "Loaded");
        })
        .catch((err) => {
          showToast(
            Toast.Style.Failure,
            "Error occured while reading directory!",
            err
          );
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    listDir();
  }, []);

  return (
    <List isLoading={loading}>
      {items?.map((project: string, index) => (
        <List.Item
          icon={{ source: "android-os.png" }} //TODO: load app icon
          key={index}
          title={project}
          accessories={[{ icon: Icon.Folder }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Project"
                onAction={() => openProject(`${projectsDirectory}/${project}`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * Open an Android project in Android Studio. The path is POSIX single-quoted so
 * project directories containing spaces (the verbatim app names produced by the
 * Create Project command) open correctly. Shared with `create-project`.
 */
export function openProject(projectPath: string): void {
  const command = `open -na 'Android Studio.app' --args ${quoteArg(
    projectPath
  )}`;

  runCommand(
    command,
    (out) => {
      console.log(out);
    },
    (err) => {
      console.log(err);
    }
  );
}
