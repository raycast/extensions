import { Application, getApplications, Grid } from "@raycast/api";
import FileGridItem from "./components/FileGridItem";
import { ErrorView } from "./components/ErrorView";
import { useVisitedFiles } from "./hooks/useVisitedFiles";
import { resolveAllFiles } from "./components/fetchFigmaData";
import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import type { TeamFiles } from "./types";
import { loadStarredFiles } from "./components/starFiles";

export default function Command() {
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

  const {
    data: starredFiles,
    isLoading: isLoadingStarredFiles,
    error: starredFilesError,
    revalidate: revalidateStarredFiles,
  } = useCachedPromise(async () => {
    const results = await loadStarredFiles();
    return results;
  }, []);

  const { files: visitedFiles, visitFile, isLoading: isLoadingVisitedFiles } = useVisitedFiles();
  const isLoadingBlock = isLoading || isLoadingVisitedFiles || isLoadingStarredFiles;
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

  if (error || starredFilesError) {
    return <ErrorView />;
  }

  function handleDropdownChange(value: string) {
    if (data && !isLoading) {
      if (value === "All") {
        setFilteredFiles(data);
        setIsFiltered(false);
      } else if (value.includes("team=")) {
        setFilteredFiles(data.filter((team) => team.name === value.split("=")[1]));
        setIsFiltered(true);
      } else {
        setFilteredFiles([
          {
            name: value.split("&$%")[0],
            files: data
              .filter((team) => team.name === value.split("&$%")[0])[0]
              .files.filter((project) => project.name === value.split("&$%")[1]),
          } as TeamFiles,
        ]);
        setIsFiltered(true);
      }
    }
  }

  const { TEAM_ID } = getPreferenceValues();
  const teamID: string[] = TEAM_ID.split(",").map((team: string) => team.toString().trim());
  const filterDropdown = () => (
    <Grid.Dropdown
      tooltip={teamID.length > 1 ? "Teams" : "Projects"}
      defaultValue="All"
      onChange={handleDropdownChange}
    >
      <Grid.Dropdown.Item key="all" title={teamID.length > 1 ? "All teams" : "All projects"} value="All" />
      {teamID.length > 1 &&
        data?.map((team) => (
          <Grid.Dropdown.Item key={team.name} title={team.name} value={`team=${team.name}`} icon="team.svg" />
        ))}

      {data?.map((team) => (
        <Grid.Dropdown.Section title={team.name} key={team.name}>
          {team.files.map((project) => (
            <Grid.Dropdown.Item
              key={project.name}
              title={project.name}
              value={`${team.name}&$%${project.name}`}
              icon="project.svg"
            />
          ))}
        </Grid.Dropdown.Section>
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
        <Grid.Section key="starred-files" title="Starred Files">
          {starredFiles?.map((file) => (
            <FileGridItem
              key={file.key + "-starred-file"}
              file={file}
              desktopApp={desktopApp}
              extraKey={file.key + "-starred-file-item"}
              revalidate={revalidateStarredFiles}
              onVisit={visitFile}
              starredFiles={starredFiles || []}
              starredFilesCount={starredFiles.length || 0}
            />
          ))}
        </Grid.Section>
      )}

      {!isFiltered && (
        <Grid.Section key="recent-files" title="Recent Files">
          {visitedFiles?.map((file) => (
            <FileGridItem
              key={file.key + "-recent-file"}
              file={file}
              desktopApp={desktopApp}
              extraKey={file.key + "-recent-file-item"}
              revalidate={revalidateStarredFiles}
              onVisit={visitFile}
              starredFiles={starredFiles || []}
              starredFilesCount={starredFiles?.length || 0}
            />
          ))}
        </Grid.Section>
      )}

      {filteredFiles?.map((team) =>
        team.files.map((project) =>
          project.files?.length != 0 ? (
            <Grid.Section
              key={team.name + project.name + "-project"}
              title={`${project.name} ${
                project.files?.length != 0
                  ? `(${project.files?.length} File${project.files?.length === 1 ? "" : "s"})`
                  : ""
              }`}
              subtitle={team.name}
            >
              {project.files?.map((file) => (
                <FileGridItem
                  key={file.key + "-file"}
                  searchkeywords={project.name}
                  revalidate={revalidateStarredFiles}
                  file={file}
                  desktopApp={desktopApp}
                  onVisit={visitFile}
                  starredFiles={starredFiles || []}
                  starredFilesCount={starredFiles?.length || 0}
                />
              ))}
            </Grid.Section>
          ) : (
            <Grid.Section
              key={team.name + project.name + "-project"}
              title={project.name}
              subtitle={team.name}
              aspectRatio="16/9"
            >
              <Grid.Item key={project.name + "-file-empty"} content="emptyProject.svg" title="Empty project" />
            </Grid.Section>
          ),
        ),
      )}
    </Grid>
  );
}
