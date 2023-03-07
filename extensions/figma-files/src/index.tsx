import { Application, getApplications, Grid } from "@raycast/api";
import FileGridItem from "./components/FileGridItem";
import { ErrorView } from "./components/ErrorView";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { useEffect, useState } from "react";

export default function Command() {
  const { projectFiles, isLoading: isLoadingProjectFiles, hasError } = useProjectFiles();
  const { files: visitedFiles, visitFile, isLoading: isLoadingVisitedFiles } = useVisitedFiles();
  const isLoading = isLoadingProjectFiles || isLoadingVisitedFiles;
  const [filteredFiles, setFilteredFiles] = useState(projectFiles);
  const [isFiltered, setIsFiltered] = useState(false);
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  useEffect(() => {
    setFilteredFiles(projectFiles);
  }, [projectFiles]);

  if (hasError) {
    return <ErrorView />;
  }

  function handleDropdownChange(value: string) {
    if (projectFiles && !isLoadingProjectFiles) {
      if (value === "All") {
        setFilteredFiles(projectFiles);
        setIsFiltered(false);
      } else {
        setFilteredFiles(projectFiles.filter((file) => file.name === value));
        setIsFiltered(true);
      }
    }
  }

  const filterDropdown = () => (
    <Grid.Dropdown tooltip="Projects" defaultValue="All" onChange={handleDropdownChange} storeValue>
      <Grid.Dropdown.Item key="all" title="All" value="All" />
      {projectFiles?.map((project) => (
        <Grid.Dropdown.Item key={project.name} title={project.name} value={project.name} />
      ))}
    </Grid.Dropdown>
  );

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Filter files by name..." searchBarAccessory={filterDropdown()}>
      {!isFiltered && (
        <Grid.Section key="recent-files" title="Recent Files">
          {visitedFiles?.map((file) => (
            <FileGridItem
              key={file.key + "-recent-file"}
              file={file}
              desktopApp={desktopApp}
              extraKey={file.key + "-recent-file-item"}
              onVisit={visitFile}
            />
          ))}
        </Grid.Section>
      )}

      {filteredFiles?.map((project) => (
        <Grid.Section key={project.name + "-project"} title={project.name}>
          {(project.files || []).map((file) => (
            <FileGridItem key={file.key + "-file"} file={file} desktopApp={desktopApp} onVisit={visitFile} />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
