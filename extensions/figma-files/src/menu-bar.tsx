import { MenuBarExtra, open } from "@raycast/api";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { useFigmaApp } from "./hooks/useFigmaApp";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles, hasError } = useProjectFiles();
  const desktopApp = useFigmaApp();

  let url = "figma://file/";
  if (!desktopApp) {
    url = "https://figma.com/file/";
  }

  return (
    <MenuBarExtra icon="figma-menubar-icon.png" tooltip="Your Design Files">
      {hasError && <MenuBarExtra.Item title="Error" />}
      {!hasError &&
        projectFiles &&
        projectFiles?.map((project) => (
          <MenuBarExtra.Submenu
            key={project.name}
            title={project.name}
            children={project.files?.map((file) => (
              <MenuBarExtra.Item key={file.key} title={file.name} onAction={() => open(url + file.key)} />
            ))}
          />
        ))}
      {isLoadingProjectFiles && !projectFiles && <MenuBarExtra.Item title="Loading..." />}
    </MenuBarExtra>
  );
}
