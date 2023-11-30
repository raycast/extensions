import { Icon, LaunchType, LocalStorage, MenuBarExtra, launchCommand } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Project } from "./add";

export default function Command() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    LocalStorage.getItem("projects").then((projects) => {
      setProjects(JSON.parse((projects as string) || "[]"));
      setLoading(false);
    });
  }, []);

  return (
    <MenuBarExtra isLoading={loading} icon={"https://code.visualstudio.com/assets/images/code-stable.png"}>
      <MenuBarExtra.Item
        title="Add project"
        onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Section title="Favorites">
        {projects.map((project: Project, index: 1 | 2 | 3 | number) => (
          <MenuBarExtra.Item
            shortcut={
              index < 3
                ? {
                    key: `${index as 1 | 2 | 3}`,
                    modifiers: ["cmd"],
                  }
                : undefined
            }
            key={project.name}
            title={project.name}
            onAction={() => {
              runAppleScript(`tell application "Visual Studio Code" to open "${project.path}"`);
            }}
          ></MenuBarExtra.Item>
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
