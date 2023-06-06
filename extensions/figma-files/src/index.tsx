import { Application, getApplications, Grid } from "@raycast/api";
import FileGridItem from "./components/FileGridItem";
import { ErrorView } from "./components/ErrorView";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { resolveAllFiles } from "./components/fetchFigmaData";
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
  const isLoadingBlock = isLoading || isLoadingVisitedFiles;
  const [filteredFiles, setFilteredFiles] = useState(data);
  const [isFiltered, setIsFiltered] = useState(false);
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  useEffect(() => {
    setFilteredFiles(data);
  }, [data]);

  if (error) {
    return <ErrorView />;
  }

  function handleDropdownChange(value: string) {
    if (data && !isLoading) {
      if (value === "All") {
        setFilteredFiles(data);
        setIsFiltered(false);
      } else {
        setFilteredFiles(data.filter((team) => team.name === value));
        setIsFiltered(true);
      }
    }
  }

  const filterDropdown = () => (
    <Grid.Dropdown tooltip="Projects" defaultValue="All" onChange={handleDropdownChange} storeValue>
      <Grid.Dropdown.Item key="all" title="All" value="All" />
      {data?.map((team) => (
        <Grid.Dropdown.Item key={team.name} title={team.name} value={team.name} />
      ))}
    </Grid.Dropdown>
  );

  return (
    <Grid
      isLoading={isLoadingBlock}
      searchBarPlaceholder="Filter files by name..."
      searchBarAccessory={filterDropdown()}
    >
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

      {filteredFiles?.map((team) =>
        team.files.map((project) => (
          <Grid.Section key={team.name + project.name + "-project"} title={team.name + " - " + project.name}>
            {(project.files || []).map((file) => (
              <FileGridItem key={file.key + "-file"} file={file} desktopApp={desktopApp} onVisit={visitFile} />
            ))}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
}
