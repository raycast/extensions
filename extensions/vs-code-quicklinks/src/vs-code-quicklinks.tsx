import { useState, useMemo, useCallback, useEffect } from "react";
import {
  launchCommand,
  ActionPanel,
  Form,
  Action,
  LaunchType,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useExec, showFailureToast } from "@raycast/utils";

export default function Command() {
  const [selectedRepositoriesFolder, setSelectedRepositoriesFolder] = useState<string>("");
  const areRepositoriesFolderSelected = !!selectedRepositoriesFolder.length;
  const [createdQuickLinks, setCreatedQuickLinks] = useState<string[]>([]);

  useEffect(() => {
    const readSelectedFolderFromStorage = async () => {
      const currentSelectedFolder = await LocalStorage.getItem<string>("selectedFolder");
      if (currentSelectedFolder) {
        setSelectedRepositoriesFolder(currentSelectedFolder);
      }
    };
    readSelectedFolderFromStorage();
  }, []);

  const { data } = useExec("ls", ["-d", "--", `${selectedRepositoriesFolder}/*`], {
    shell: true,
    execute: !!areRepositoriesFolderSelected,
  });

  const parsedRepositories: string[] = useMemo(() => {
    if (!data) {
      return [];
    }
    return data?.split("\n").toSorted((a, b) => a.localeCompare(b));
  }, [data]);

  const getRepositoryName = useCallback((folder: string) => {
    return folder.substring(folder.lastIndexOf("/") + 1);
  }, []);

  const createQuickLink = useCallback((folder: string): Promise<void> => {
    const name = getRepositoryName(folder);
    return launchCommand({
      ownerOrAuthorName: "raycast",
      extensionName: "raycast",
      name: "create-quicklink",
      type: LaunchType.Background,
      fallbackText: "The creation of the quicklink failed!",
      context: {
        name: name,
        link: folder,
        application: "com.microsoft.VSCode",
      },
    });
  }, []);

  const onClick = useCallback(
    async (folder: string) => {
      try {
        await createQuickLink(folder);
        await LocalStorage.setItem("createdQuickLinks", JSON.stringify([...createdQuickLinks, folder]));
        await showToast({
          title: `success`,
          style: Toast.Style.Success,
          message: `VS Code quicklink prepared for ${folder}`,
        });
        setCreatedQuickLinks([...createdQuickLinks, folder]);
      } catch (error) {
        console.error("Error creating quicklink:", error);
        await showFailureToast({
          title: `error`,
          style: Toast.Style.Failure,
          message: `Failed to prepare the VS Code quicklink for ${folder}`,
        });
      }
    },
    [createdQuickLinks],
  );

  return (
    <>
      {!areRepositoriesFolderSelected ? (
        <Form>
          <Form.FilePicker
            id="selectedPaths"
            title="Select Repositories Folder"
            info="Select the folder where your repositories are located"
            canChooseDirectories
            storeValue
            onChange={async ([selectedFolder]) => {
              if (!selectedFolder) {
                return;
              }
              await LocalStorage.setItem("selectedFolder", selectedFolder);
              setSelectedRepositoriesFolder(selectedFolder);
            }}
          />
        </Form>
      ) : (
        <List filtering searchBarPlaceholder="Search for a folder">
          {parsedRepositories.map((repository) => (
            <List.Item
              id={repository}
              key={repository}
              icon={{
                source: Icon.PlusCircle,
                tintColor: Color.Green,
              }}
              title={getRepositoryName(repository)}
              actions={
                <ActionPanel>
                  <Action
                    title="Create"
                    onAction={() => {
                      onClick(repository);
                    }}
                  />
                  <Action
                    title="Select Another Folder"
                    onAction={() => {
                      setSelectedRepositoriesFolder("");
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      )}
    </>
  );
}
