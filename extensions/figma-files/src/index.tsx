import { Grid, type LaunchProps, getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ErrorView } from "./components/ErrorView";
import FileGridItem from "./components/FileGridItem";
import { useFigmaData } from "./hooks/useFigmaData";
import { figma } from "./oauth";
import {
  FILTER_TYPES,
  parseFilterValue,
  filterTeamsByName,
  filterToSpecificProject,
  createTeamFilter,
  createProjectFilter,
} from "./lib/filterUtils";
import type { TeamFiles } from "./types";

function Command({ launchContext }: Readonly<LaunchProps<{ launchContext: { query: string } }>>) {
  const {
    allFiles,
    starredFiles,
    visitedFiles,
    isLoading,
    error,
    revalidateAllFiles,
    revalidateStarredFiles,
    revalidateVisitedFiles,
    visitFile,
    desktopApp,
  } = useFigmaData();

  const [filteredFiles, setFilteredFiles] = useState(allFiles);
  const [isFiltered, setIsFiltered] = useState(false);
  const [searchText, setSearchText] = useState<string>(launchContext?.query ?? "");

  useEffect(() => {
    setFilteredFiles(allFiles);
  }, [allFiles]);

  if (error) {
    return <ErrorView />;
  }

  function handleDropdownChange(value: string) {
    if (allFiles && !isLoading) {
      const filter = parseFilterValue(value);

      switch (filter.type) {
        case "all":
          setFilteredFiles(allFiles);
          setIsFiltered(false);
          break;

        case "team":
          setFilteredFiles(filterTeamsByName(allFiles, filter.teamName!));
          setIsFiltered(true);
          break;

        case "project":
          setFilteredFiles(filterToSpecificProject(allFiles, filter.teamName!, filter.projectName!));
          setIsFiltered(true);
          break;
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
      <Grid.Dropdown.Item key="all" title={teamID.length > 1 ? "All teams" : "All projects"} value={FILTER_TYPES.ALL} />
      {teamID.length > 1 &&
        allFiles?.map((team: TeamFiles) => (
          <Grid.Dropdown.Item key={team.name} title={team.name} value={createTeamFilter(team.name)} icon="team.svg" />
        ))}

      {allFiles?.map((team: TeamFiles) => (
        <Grid.Dropdown.Section title={team.name} key={team.name}>
          {team.files.map((project) => (
            <Grid.Dropdown.Item
              key={project.name}
              title={project.name}
              value={createProjectFilter(team.name, project.name)}
              icon="project.svg"
            />
          ))}
        </Grid.Dropdown.Section>
      ))}
    </Grid.Dropdown>
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Filter files by name..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
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
              revalidateStarredFiles={revalidateStarredFiles}
              revalidateVisitedFiles={revalidateVisitedFiles}
              revalidateAllFiles={revalidateAllFiles}
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
              revalidateStarredFiles={revalidateStarredFiles}
              revalidateVisitedFiles={revalidateVisitedFiles}
              revalidateAllFiles={revalidateAllFiles}
              onVisit={visitFile}
              starredFiles={starredFiles ?? []}
              starredFilesCount={starredFiles?.length ?? 0}
            />
          ))}
        </Grid.Section>
      )}

      {filteredFiles?.map((team: TeamFiles) =>
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
                  revalidateStarredFiles={revalidateStarredFiles}
                  revalidateVisitedFiles={revalidateVisitedFiles}
                  revalidateAllFiles={revalidateAllFiles}
                  file={file}
                  desktopApp={desktopApp}
                  onVisit={visitFile}
                  starredFiles={starredFiles ?? []}
                  starredFilesCount={starredFiles?.length ?? 0}
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

export default withAccessToken(figma)(Command);
