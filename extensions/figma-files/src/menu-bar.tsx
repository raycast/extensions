import { MenuBarExtra, open } from "@raycast/api";
import { useProjectFiles } from "./hooks/useProjectFiles";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles, hasError } = useProjectFiles();

  console.log(projectFiles)
  return (
    <MenuBarExtra icon="figma-menubar-icon.png" tooltip="Your Design Files">
      {hasError && <MenuBarExtra.Item title="Error" />}
      {!hasError && projectFiles && 
        projectFiles?.map(project => (
          <MenuBarExtra.Submenu
            key={project.name}
            title={project.name}
            children={
              project.files?.map(file => (
                <MenuBarExtra.Item key={file.key} title={file.name} onAction={() => open(`https://figma.com/file/${file.key}`)} />
              ))
            }
          />
        ))
      }
      {isLoadingProjectFiles && !projectFiles && <MenuBarExtra.Item title="Loading..." />}
    </MenuBarExtra>
  );
}
