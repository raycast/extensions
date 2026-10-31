import { useCycleWorkItems, useModuleWorkItems } from "../hooks/useCycleWorkItems";
import useMe from "../hooks/useMe";
import WorkItemsByStateList from "./WorkItemsByStateList";
import { arrayMutator } from "./actions/WorkItemActions";

type ProjectRef = { id: string; identifier: string; name?: string };

export function CycleWorkItemsList({
  project,
  cycleId,
  cycleName,
}: {
  project: ProjectRef;
  cycleId: string;
  cycleName: string;
}) {
  const { data, isLoading, error, revalidate, mutate, pagination } = useCycleWorkItems(project, cycleId);
  const { me } = useMe();
  return (
    <WorkItemsByStateList
      items={data ?? []}
      isLoading={isLoading}
      error={error}
      onRefresh={revalidate}
      mutate={arrayMutator(mutate)}
      pagination={pagination}
      currentUserId={me?.id}
      navigationTitle={`${project.identifier} · ${cycleName}`}
      emptyTitle="No open work items in this cycle"
      toggleKey="cycle-work-items"
    />
  );
}

export function ModuleWorkItemsList({
  project,
  moduleId,
  moduleName,
}: {
  project: ProjectRef;
  moduleId: string;
  moduleName: string;
}) {
  const { data, isLoading, error, revalidate, mutate, pagination } = useModuleWorkItems(project, moduleId);
  const { me } = useMe();
  return (
    <WorkItemsByStateList
      items={data ?? []}
      isLoading={isLoading}
      error={error}
      onRefresh={revalidate}
      mutate={arrayMutator(mutate)}
      pagination={pagination}
      currentUserId={me?.id}
      navigationTitle={`${project.identifier} · ${moduleName}`}
      emptyTitle="No open work items in this module"
      toggleKey="module-work-items"
    />
  );
}
