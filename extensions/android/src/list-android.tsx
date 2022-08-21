import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  PreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
const { exec } = require("child_process");

export default function Command() {
  const [items, setItems] = useState<string[]>(() => []);
  const [loading, setLoading] = useState(true);

  const preferences: PreferenceValues = getPreferenceValues();
  const projectsDirectory = preferences.ANDROID_DIRECTORY;

  useEffect(() => {
    async function listDir() {
      await listDirectories(projectsDirectory)
        .then((value) => {
          const items = value
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          setItems(items);
          showToast(Toast.Style.Success, "Loaded!");
        })
        .catch((err) => {
          showToast(Toast.Style.Failure, "Something wrong happend!", err);
          console.error("Error occured while reading directory!", err);
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
                onAction={() => openProject(projectsDirectory, project)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function openProject(projectsDirectory: any, project: string): void {
  return exec(
    `open -na Android\\ Studio.app --args ${projectsDirectory}/${project}`,
    (err: any, stdout: any, stderr: any) => {
      console.log(`opening ${projectsDirectory}/${project}`);
      console.log(err);
      console.log(stdout);
      console.log(stderr);
      popToRoot;
    }
  );
}

async function listDirectories(folder: string) {
  return fs.promises.readdir(folder, { withFileTypes: true });
}

export async function isAndroidStudioInstalled() {
  return (await getApplications()).find((app) => {
    console.log(app);
    (app.name === "Android studio") != undefined ? true : false;
  });
}

function delay1(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
