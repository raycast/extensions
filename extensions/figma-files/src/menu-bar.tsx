import { Application, getApplications, MenuBarExtra, open } from "@raycast/api";
import { resolveAllFiles } from "./components/fetchFigmaData";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(
    async () => {
      const results = await resolveAllFiles();
      return results;
    },
    [],
    {
      keepPreviousData: true,
    }
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
      isLoading={isLoadingVisitedFiles || isLoading}
    >
      {error && <MenuBarExtra.Item title="Error" key="ErrorState" />}
      {visitedFiles && (
        <>
          <MenuBarExtra.Submenu key="recent-files" title="Recent">
            {visitedFiles?.map((file) => (
              <MenuBarExtra.Item
                key={file.key + "-recent-file"}
                title={file.name}
                onAction={async () => {
                  open(url + file.key);
                  await visitFile(file);
                }}
              />
            ))}
          </MenuBarExtra.Submenu>
          <MenuBarExtra.Separator key="Separator" />
        </>
      )}
      {data &&
        data?.map((team) => (
          <MenuBarExtra.Section title={team.name} key={team.name + "-team"}>
            {team.files.map((project) => (
              <MenuBarExtra.Submenu
                key={team.name + project.name + "-project"}
                title={project.name}
                children={
                  project.files?.length != 0 ? (
                    project.files?.map((file) => (
                      <MenuBarExtra.Item
                        key={team.name + project.name + file.key + "-file"}
                        title={file.name}
                        onAction={async () => {
                          open(url + file.key);
                          await visitFile(file);
                        }}
                      />
                    ))
                  ) : (
                    <MenuBarExtra.Item key={team.name + project.name + "-nofile"} title="Empty project" />
                  )
                }
              />
            ))}
          </MenuBarExtra.Section>
        ))}
      {(isLoading || isLoadingVisitedFiles) && !data && <MenuBarExtra.Item title="Loading..." key="loadingState" />}
      {!isLoading && !data && <MenuBarExtra.Item title="No projects found" key="noProjectsFoundState" />}
    </MenuBarExtra>
  );
}
