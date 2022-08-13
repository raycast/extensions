import { MenuBarExtra, open } from "@raycast/api";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { useFigmaApp } from "./hooks/useFigmaApp";
import { useVisitedFiles } from "./hooks/useVisitedFiles";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles, hasError } = useProjectFiles();
  const { files: visitedFiles, visitFile, isLoading: isLoadingVisitedFiles } = useVisitedFiles();

  const desktopApp = useFigmaApp();

  let url = "figma://file/";
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
    >
      {hasError && <MenuBarExtra.Item title="Error" />}
      {visitedFiles && (
        <>
          <MenuBarExtra.Submenu
            key="recent-files"
            title="Recent"
            children={visitedFiles?.map((file) => (
              <MenuBarExtra.Item
                key={file.key + "-recent-file"}
                title={file.name}
                onAction={() => (open(url + file.key), visitFile(file))}
              />
            ))}
          />
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
                onAction={() => (open(url + file.key), visitFile(file))}
              />
            ))}
          />
        ))}
      {(isLoadingProjectFiles || isLoadingVisitedFiles) && !projectFiles && <MenuBarExtra.Item title="Loading..." />}
      {!isLoadingProjectFiles && !projectFiles && <MenuBarExtra.Item title="No projects found" />}
    </MenuBarExtra>
  );
}
