import { Icon, MenuBarExtra, open } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useFigmaData } from "./hooks/useFigmaData";
import { figma } from "./oauth";

function Command() {
  const { allFiles, starredFiles, visitedFiles, isLoading, error, visitFile, desktopApp } = useFigmaData();

  let url = "figma://file/";

  if (!desktopApp) {
    url = "https://figma.com/file/";
  }

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "figma-menubar-icon-light.svg",
          dark: "figma-menubar-icon-dark.svg",
        },
      }}
      tooltip="Figma files"
      isLoading={isLoading}
    >
      {error && <MenuBarExtra.Item title="Error" key="ErrorState" />}
      {starredFiles && (
        <MenuBarExtra.Submenu key="starred-files" title="Starred" icon={Icon.StarCircle}>
          {starredFiles?.map((file) => (
            <MenuBarExtra.Item
              key={file.key + "-starred-file"}
              title={file.name ?? "Untitled"}
              onAction={async () => {
                open(url + file.key);
                await visitFile(file);
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
      {visitedFiles && (
        <MenuBarExtra.Submenu key="recent-files" title="Recent" icon={Icon.Hourglass}>
          {visitedFiles?.map((file) => (
            <MenuBarExtra.Item
              key={file.key + "-recent-file"}
              title={file.name ?? "Untitled"}
              onAction={async () => {
                open(url + file.key);
                await visitFile(file);
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
      {allFiles?.map((team) => (
        <MenuBarExtra.Section title={team.name ?? "Untitled"} key={team.name + "-team"}>
          {team.files.map((project) => (
            <MenuBarExtra.Submenu key={team.name + project.name + "-project"} title={project.name ?? "Untitled"}>
              {project.files?.length != 0 ? (
                project.files?.map((file) => (
                  <MenuBarExtra.Item
                    key={team.name + project.name + file.key + "-file"}
                    title={file.name ?? "Untitled"}
                    onAction={async () => {
                      open(url + file.key);
                      await visitFile(file);
                    }}
                  />
                ))
              ) : (
                <MenuBarExtra.Item key={team.name + project.name + "-nofile"} title="Empty project" />
              )}
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      ))}
      {isLoading && !allFiles && <MenuBarExtra.Item title="Loading..." key="loadingState" />}
      {!isLoading && !allFiles && <MenuBarExtra.Item title="No projects found" key="noProjectsFoundState" />}
    </MenuBarExtra>
  );
}

export default withAccessToken(figma)(Command);
