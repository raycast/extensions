import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { neon } from "./neon";
import { OpenInNeon } from "./components";
import { formatBytes } from "./utils";

export default function ListAPIKeys() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const res = await neon.listProjects({});
      return res.data.projects;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {data.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Dot}
          title={project.name}
          subtitle={project.region_id}
          accessories={[
            { icon: Icon.Coin, text: formatBytes(project.synthetic_storage_size), tooltip: "Storage" },
            { icon: `number-${project.pg_version}-16`, tooltip: "Postgres version" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
                title="View Project Branches"
                target={<ProjectBranches id={project.id} />}
              />
              <OpenInNeon route={`projects/${project.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectBranches({ id }: { id: string }) {
  const { isLoading, data: branches = [] } = usePromise(async () => {
    const res = await neon.listProjectBranches({ projectId: id });
    return res.data.branches;
  });

  return (
    <List isLoading={isLoading}>
      {branches.map((branch) => {
        const accessories: List.Item.Accessory[] = [
          { icon: Icon.Coin, text: formatBytes(branch.logical_size), tooltip: "Data size" },
        ];
        if (branch.current_state === "ready")
          accessories.unshift({
            tag: "IDLE",
            tooltip: "Compute is suspended and automatically activates on client connections",
          });
        return (
          <List.Item
            key={branch.id}
            icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
            title={branch.name}
            subtitle={branch.default ? "DEFAULT" : ""}
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
