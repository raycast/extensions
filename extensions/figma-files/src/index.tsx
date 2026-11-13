import { ActionPanel, Grid, type LaunchProps, getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useMemo, useState } from "react";
import AdvancedActionSection from "./components/AdvancedActionSection";
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

  // Kept as the raw dropdown value and applied on every render, so a folder picked during a long load stays selected
  const [filterValue, setFilterValue] = useState<string>(FILTER_TYPES.ALL);
  const [searchText, setSearchText] = useState<string>(launchContext?.query ?? "");

  const filter = parseFilterValue(filterValue);
  const isFiltered = filter.type !== "all";
  const filteredFiles = useMemo(() => {
    if (!allFiles) return allFiles;
    switch (filter.type) {
      case "team":
        return filterTeamsByName(allFiles, filter.teamName!);
      case "project":
        return filterToSpecificProject(allFiles, filter.teamName!, filter.folderId!);
      default:
        return allFiles;
    }
  }, [allFiles, filterValue]);

  if (error) {
    return <ErrorView />;
  }

  const { TEAM_ID } = getPreferenceValues();
  const teamID: string[] = TEAM_ID.split(",").map((team: string) => team.toString().trim());
  const filterDropdown = () => (
    <Grid.Dropdown tooltip={teamID.length > 1 ? "Teams" : "Folders"} defaultValue="All" onChange={setFilterValue}>
      <Grid.Dropdown.Item key="all" title={teamID.length > 1 ? "All teams" : "All folders"} value={FILTER_TYPES.ALL} />
      {teamID.length > 1 &&
        allFiles?.map((team: TeamFiles) => (
          <Grid.Dropdown.Item key={team.name} title={team.name} value={createTeamFilter(team.name)} icon="team.svg" />
        ))}

      {allFiles?.map((team: TeamFiles) => (
        <Grid.Dropdown.Section title={team.name} key={team.name}>
          {team.folders.map((folder) => (
            <Grid.Dropdown.Item
              key={folder.id}
              title={folder.path}
              value={createProjectFilter(team.name, folder.id)}
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
      <Grid.EmptyView
        icon="emptyProject.svg"
        title={isLoading ? "Loading files from Figma…" : "No files found"}
        description={
          isLoading
            ? "Folders appear as they load. The first load can take a few minutes for teams with many folders."
            : undefined
        }
        actions={
          <ActionPanel>
            <AdvancedActionSection
              revalidateVisitedFiles={revalidateVisitedFiles}
              revalidateAllFiles={revalidateAllFiles}
            />
          </ActionPanel>
        }
      />
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
        team.folders.map((folder) =>
          folder.files.length > 0 ? (
            <Grid.Section
              key={team.id + folder.id + "-folder"}
              title={`${folder.path} (${folder.files.length} File${folder.files.length === 1 ? "" : "s"})`}
              subtitle={team.name}
            >
              {folder.files.map((file) => (
                <FileGridItem
                  key={file.key + "-file"}
                  searchKeywords={[...folder.path.split(" / "), team.name]}
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
            // Folders that only hold subfolders are not worth an "Empty folder" placeholder
            !team.folders.some((other) => other.parentId === folder.id) && (
              <Grid.Section
                key={team.id + folder.id + "-folder"}
                title={folder.path}
                subtitle={team.name}
                aspectRatio="16/9"
              >
                <Grid.Item key={folder.id + "-file-empty"} content="emptyProject.svg" title="Empty folder" />
              </Grid.Section>
            )
          ),
        ),
      )}
    </Grid>
  );
}

export default withAccessToken(figma)(Command);
