import { ActionPanel, List, Action, Icon, LocalStorage, Cache, useNavigation, Toast, showToast } from "@raycast/api";
import * as fs from "fs";
import { join, basename } from "path";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import Configuration from "./configuration";

interface NodeModulesProject {
  name: string;
  path: string;
  lastModifiedTime: number;
  size?: number;
}

const ignoreName = "node_modules";
const cache = new Cache();

export default function Command() {
  const cachedProjects = cache.get("node_modules_cleanner_cached_projects");
  const { push } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<NodeModulesProject[]>([]);

  function _readdirSync(path: string) {
    fs.readdirSync(path).forEach((_path) => {
      const finalPath = `${path}/${_path}`;
      if (_path === "node_modules") {
        setProjects((projects) =>
          [
            ...projects,
            {
              name: basename(path),
              path,
              lastModifiedTime: fs.statSync(path).mtime.getTime(),
            },
          ].sort((a, b) => a.lastModifiedTime - b.lastModifiedTime)
        );
      }
      if (!ignoreName.includes(_path)) {
        const stat = fs.lstatSync(finalPath);

        if (stat.isDirectory()) {
          _readdirSync(finalPath);
        }
      }
    });
  }

  useEffect(() => {
    setIsLoading(true);
    LocalStorage.getItem<string>("node_modules_cleanner_base_folder").then((value) => {
      if (value) {
        if (cachedProjects) {
          setProjects(JSON.parse(cachedProjects));
        } else {
          _readdirSync(value);
        }
        setIsLoading(false);
      } else {
        const options: Toast.Options = {
          style: Toast.Style.Failure,
          title: "Fail",
          message: "Directory to scan not selected!",
          primaryAction: {
            title: "Go configure",
            onAction: (toast) => {
              push(<Configuration />);
              toast.hide();
            },
          },
        };
        showToast(options);
      }
    });
  }, []);

  useEffect(() => {
    if (projects && projects.length > 0) {
      cache.set("node_modules_cleanner_cached_projects", JSON.stringify(projects));
    }
  }, [projects]);

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Force Scan"
            onAction={() => {
              setIsLoading(true);
              setProjects([]);
              LocalStorage.getItem<string>("node_modules_cleanner_base_folder").then((value) => {
                if (value) {
                  _readdirSync(value);
                }
                setIsLoading(false);
              });
            }}
          />
        </ActionPanel>
      }
    >
      {projects.length > 0 ? (
        projects.map((project, index) => {
          return (
            <List.Item
              icon={Icon.Folder}
              title={project.name}
              subtitle={project.path}
              key={`${project.name}-${index}`}
              accessories={[
                {
                  text: `${dayjs().diff(dayjs(project.lastModifiedTime), "days")} days ago`,
                  icon: Icon.Clock,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Force Scan"
                    onAction={() => {
                      const options: Toast.Options = {
                        style: Toast.Style.Success,
                        title: "Scanning",
                      };
                      showToast(options);
                      setIsLoading(true);
                      setProjects([]);
                      LocalStorage.getItem<string>("node_modules_cleanner_base_folder").then((value) => {
                        if (value) {
                          _readdirSync(value);
                        }
                        setIsLoading(false);
                      });
                    }}
                  />
                  <Action.Trash
                    paths={join(project.path, "node_modules")}
                    onTrash={(path) => {
                      if (!Array.isArray(path)) {
                        setProjects((projects) => {
                          const _projects = [...projects];
                          console.log(project.path, path);
                          const index = _projects.findIndex((project) => path.toString().startsWith(project.path));
                          if (index >= 0 && index < _projects.length) {
                            _projects.splice(index, 1);
                          }
                          console.log(_projects);
                          return _projects;
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView
          icon={{ source: { light: "empty_light.png", dark: "empty_dark.png" } }}
          title="Woops!"
          description="You don't have projects contains node_modules."
          actions={
            <ActionPanel>
              <Action
                title="Force Scan"
                onAction={() => {
                  setIsLoading(true);
                  setProjects([]);
                  LocalStorage.getItem<string>("node_modules_cleanner_base_folder").then((value) => {
                    if (value) {
                      _readdirSync(value);
                    }
                    setIsLoading(false);
                  });
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
