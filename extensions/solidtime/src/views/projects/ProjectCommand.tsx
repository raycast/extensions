import { Action, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { useClients, useProjects } from "../../api/hooks.js";
import type { CreateProjectBody, Project } from "../../api/index.js";
import { api } from "../../api/index.js";
import { formatDuration, useFormatters } from "../../utils/formatters.js";
import { tagArchived } from "../../utils/list.js";
import { useMembership, useOrgId } from "../../utils/membership.js";
import { messageBuilder, tryWithToast, usePreferredExit } from "../../utils/operations.js";
import { djs, getTimeStamp } from "../../utils/time.js";
import { CrudActions } from "../shared/CrudActions.js";
import { Entry } from "../shared/Entry.js";
import MembershipAccessory from "../shared/MembershipAccessory.js";
import { ProjectDetails } from "./ProjectDetails.js";
import { ProjectForm } from "./ProjectForm.js";
import { createColorIcon } from "../../utils/color.js";

function useProjectAccessories(orgId: string | null) {
  const formatters = useFormatters();
  const clients = useClients(orgId);

  return (project: Project) => {
    const accessories: List.Item.Accessory[] = [];
    const client = clients.data?.find((client) => client.id === project.client_id)?.name;
    if (client) {
      accessories.push({ tag: { value: client }, icon: Icon.PersonCircle });
    }
    const spentTime = djs.duration({ seconds: project.spent_time });
    if (spentTime.asSeconds() > 0) {
      accessories.push({
        tag: formatDuration(spentTime),
        icon: Icon.Gauge,
      });
    }
    if (project.is_billable) {
      accessories.push({
        tag: {
          value: formatters.projectBilling(project.billable_rate) + "/h",
        },
        icon: Icon.Coins,
      });
    }
    accessories.push(tagArchived(project.is_archived));
    return accessories;
  };
}

export function ProjectCommand() {
  const navigation = useNavigation();
  const ctx = useMembership();
  const orgId = useOrgId();
  const preferredExit = usePreferredExit();

  const projects = useProjects(orgId);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const saveFn = useCallback(
    (projectId?: string) => async (values: CreateProjectBody) => {
      if (!orgId) throw new Error("No organization id");
      await tryWithToast(
        () =>
          !projectId
            ? api.createProject(
                {
                  client_id: null,
                  billable_rate: null,
                  estimated_time: null,
                  ...values,
                },
                { params: { organization: orgId } },
              )
            : api.updateProject(values, { params: { organization: orgId, project: projectId } }),
        messageBuilder("create", "project", values.name),
      );
      projects.refetch();
      navigation.pop();
    },
    [orgId],
  );

  const sorted = projects.data?.toSorted((a, b) => Number(a.is_archived) - Number(b.is_archived));
  const accessories = useProjectAccessories(orgId);

  return (
    <List
      navigationTitle="Search Projects"
      isLoading={projects.isLoading}
      searchBarAccessory={<MembershipAccessory />}
      isShowingDetail={isShowingDetail}
    >
      {orgId && !sorted?.length && !projects.error && (
        <List.EmptyView
          icon={Icon.NewFolder}
          title="No projects found"
          description="Create your first project now!"
          actions={
            <CrudActions
              name="Project"
              onNew={() =>
                navigation.push(
                  <Entry>
                    <ProjectForm onSubmit={saveFn()} />
                  </Entry>,
                )
              }
            />
          }
        />
      )}
      {orgId &&
        sorted?.map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            accessories={isShowingDetail ? undefined : accessories(project)}
            icon={createColorIcon(project.color)}
            detail={<ProjectDetails project={project} />}
            actions={
              <CrudActions
                name="Project"
                onDetails={() => setIsShowingDetail(true)}
                onEdit={() =>
                  navigation.push(
                    <Entry>
                      <ProjectForm onSubmit={saveFn(project.id)} initialValues={project} />
                    </Entry>,
                  )
                }
                onDelete={async () => {
                  await tryWithToast(
                    () => api.deleteProject(undefined, { params: { organization: orgId, project: project.id } }),
                    messageBuilder("delete", "project", project.name),
                  );
                  projects.refetch();
                }}
                onNew={() =>
                  navigation.push(
                    <Entry>
                      <ProjectForm onSubmit={saveFn()} />
                    </Entry>,
                  )
                }
                itemActions={
                  <>
                    <Action
                      title={"Start Timer"}
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        await tryWithToast(
                          () => {
                            if (!ctx.membership) throw new Error("No membership set");
                            const body = {
                              start: getTimeStamp(),
                              member_id: ctx.membership?.id,
                              project_id: project.id,
                              billable: project.is_billable,
                            };
                            return api.createTimeEntry(body, { params: { organization: orgId } });
                          },
                          messageBuilder("start", "time entry"),
                        );
                        preferredExit();
                        projects.refetch();
                      }}
                    />
                    <Action
                      title={project.is_archived ? "Unarchive" : "Archive"}
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["ctrl"], key: "a" }}
                      onAction={async () => {
                        await tryWithToast(
                          () =>
                            api.updateProject(
                              { ...project, is_archived: !project.is_archived },
                              { params: { organization: orgId, project: project.id } },
                            ),
                          messageBuilder("update", "project", project.name),
                        );
                        projects.refetch();
                      }}
                    />
                  </>
                }
              />
            }
          />
        ))}
    </List>
  );
}
