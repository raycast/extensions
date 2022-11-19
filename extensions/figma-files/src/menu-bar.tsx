import { Application, getApplications, MenuBarExtra, open } from "@raycast/api";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { useEffect, useState } from "react";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles, hasError } = useProjectFiles();
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
          light: "figma-menubar-icon-dark.png",
          dark: "figma-menubar-icon-light.png",
        },
      }}
      tooltip="Figma files"
      isLoading={isLoadingVisitedFiles || isLoadingProjectFiles}
    >
      {hasError && <MenuBarExtra.Item title="Error" />}
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
          <MenuBarExtra.Separator />
        </>
      )}
      {!isLoadingVisitedFiles &&
        projectFiles &&
        projectFiles?.map((project) => (
          <MenuBarExtra.Submenu
            key={project.name}
            title={project.name}
            children={project.files?.map((file) => (
              <MenuBarExtra.Item
                key={file.key}
                title={file.name}
                onAction={async () => {
                  open(url + file.key);
                  await visitFile(file);
                }}
              />
            ))}
          />
        ))}
      {(isLoadingProjectFiles || isLoadingVisitedFiles) && !projectFiles && <MenuBarExtra.Item title="Loading..." />}
      {!isLoadingProjectFiles && !projectFiles && <MenuBarExtra.Item title="No projects found" />}
    </MenuBarExtra>
  );
}
