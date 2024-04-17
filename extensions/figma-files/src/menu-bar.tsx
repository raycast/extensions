import { Application, getApplications, MenuBarExtra, open, Icon } from "@raycast/api";
import { resolveAllFiles } from "./api";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { loadStarredFiles } from "./starFiles";
import { figma } from "./oauth";
import { withAccessToken } from "@raycast/utils";

function Command() {
  const { data, isLoading, error } = useCachedPromise(
    async () => {
      const results = await resolveAllFiles();
      return results;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const { data: starredFiles, isLoading: isLoadingStarredFiles } = useCachedPromise(
    async () => {
      const results = await loadStarredFiles();
      return results;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const { files: visitedFiles, visitFile, isLoading: isLoadingVisitedFiles } = useVisitedFiles();
  const [desktopApp, setDesktopApp] = useState<Application>();
  let url = "figma://file/";

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  if (!desktopApp) {
    url = "https://figma.com/file/";
  }

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "figma-menubar-icon-light.svg",
          dark: "figma-menubar-icon-dark.svg",
        },
      }}
      tooltip="Figma files"
      isLoading={isLoadingVisitedFiles || isLoading || isLoadingStarredFiles}
    >
      {error && <MenuBarExtra.Item title="Error" key="ErrorState" />}
      {starredFiles && (
        <MenuBarExtra.Submenu key="starred-files" title="Starred" icon={Icon.StarCircle}>
          {starredFiles?.map((file) => (
            <MenuBarExtra.Item
              key={file.key + "-starred-file"}
              title={file.name ?? "Untitled"}
              onAction={async () => {
                open(url + file.key);
                await visitFile(file);
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
      {visitedFiles && (
        <MenuBarExtra.Submenu key="recent-files" title="Recent" icon={Icon.Hourglass}>
          {visitedFiles?.map((file) => (
            <MenuBarExtra.Item
              key={file.key + "-recent-file"}
              title={file.name ?? "Untitled"}
              onAction={async () => {
                open(url + file.key);
                await visitFile(file);
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
      {data?.map((team) => (
        <MenuBarExtra.Section title={team.name ?? "Untitled"} key={team.name + "-team"}>
          {team.files.map((project) => (
            <MenuBarExtra.Submenu key={team.name + project.name + "-project"} title={project.name ?? "Untitled"}>
              {project.files?.length != 0 ? (
                project.files?.map((file) => (
                  <MenuBarExtra.Item
                    key={team.name + project.name + file.key + "-file"}
                    title={file.name ?? "Untitled"}
                    onAction={async () => {
                      open(url + file.key);
                      await visitFile(file);
                    }}
                  />
                ))
              ) : (
                <MenuBarExtra.Item key={team.name + project.name + "-nofile"} title="Empty project" />
              )}
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      ))}
      {(isLoading || isLoadingVisitedFiles) && !data && <MenuBarExtra.Item title="Loading..." key="loadingState" />}
      {!isLoading && !data && <MenuBarExtra.Item title="No projects found" key="noProjectsFoundState" />}
    </MenuBarExtra>
  );
}

export default withAccessToken(figma)(Command);
