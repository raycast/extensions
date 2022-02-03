import { List } from "@raycast/api";

import FileListItem from "./components/FileListItem";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { useProjectFiles } from "./hooks/useProjectFiles";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles } = useProjectFiles();

  const { files: visitedFiles, visitFile, isLoading: isLoadingVisitedFiles } = useVisitedFiles();

  const isLoading = isLoadingProjectFiles || isLoadingVisitedFiles;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter files by name...">
      <List.Section key="recent-files" title="Recent Files">
        {visitedFiles?.map((file) => (
          <FileListItem
            key={file.key + "-recent-file"}
            file={file}
            extraKey={file.key + "-recent-file-item"}
            onVisit={visitFile}
          />
        ))}
      </List.Section>

      {/* Note: Wait until visited files are loaded to avoid flickering */}
      {!isLoadingVisitedFiles &&
        projectFiles?.map((project) => (
          <List.Section key={project.name + "-project"} title={project.name}>
            {project.files
              .filter((file) => visitedFiles?.find((visitedFile) => file.key === visitedFile.key) === undefined)
              .map((file) => (
                <FileListItem key={file.key + "-file"} file={file} onVisit={visitFile} />
              ))}
          </List.Section>
        ))}
    </List>
  );
}
