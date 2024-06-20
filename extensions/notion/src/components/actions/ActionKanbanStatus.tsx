import { ActionPanel, Action, showToast, Toast } from "@raycast/api";

import { PageProperty, WritableDatabaseProperty, patchPage, PropertyConfig } from "../../utils/notion";

type KanbanStatusOption = PropertyConfig<"status">["options"][number] & { icon: string };

interface ActionKanbanStatusParams {
  pageId: string;
  databaseProperty: WritableDatabaseProperty;
  pageProperty: PageProperty;
  statusOptions: KanbanStatusOption[];
  mutate: () => Promise<void>;
}

export function ActionKanbanStatus({
  pageId,
  databaseProperty,
  pageProperty,
  statusOptions,
  mutate,
}: ActionKanbanStatusParams) {
  const setStatus = async (statusId: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting " + databaseProperty.name,
    });
    const updatedPage = await patchPage(pageId, { [databaseProperty.id]: { status: { id: statusId } } });
    if (updatedPage && updatedPage.id) {
      toast.style = Toast.Style.Success;
      toast.title = databaseProperty.name + " Updated";
      await mutate();
    }
  };

  const value = pageProperty && "status" in pageProperty ? pageProperty.status?.id : null;
  return (
    <ActionPanel.Submenu
      title={"Set " + databaseProperty.name}
      icon={"./icon/kanban_status_started.png"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
    >
      {statusOptions?.map((opt) => (
        <Action
          key={opt.id}
          icon={opt.icon}
          title={(opt.name ? opt.name : "Untitled") + (opt.icon && value === opt.id ? "  ✓" : "")}
          onAction={() => setStatus(opt.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

{
  /* <ActionEditPageProperty
                key={`kanban-section-${ds.id}-page-${p.id}-custom-edit-status-action`}
                databaseProperty={statusProperty}
                options={customOptions}
                pageId={p.id}
                pageProperty={p.properties[propertyId]}
                icon="./icon/kanban_status_started.png"
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                mutate={mutate}
              />, */
}
