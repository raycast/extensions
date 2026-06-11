import { Action, ActionPanel, Form, List, open, PopToRootType, showHUD, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Project, Service } from "clockodo";
import { useEffect } from "react";
import { clockodo, getServices } from "./clockodo";
import { useGroupedProjects } from "./hooks";

type Values = {
  text: string;
};

const Details = ({ project, service }: { project: Project; service: Service }) => {
  async function handleSubmit(values: Values) {
    try {
      await clockodo.startClock({
        projectsId: project.id,
        customersId: project.customersId,
        servicesId: service.id,
        text: values.text,
      });
      await showHUD("Clock started", {
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to start clock" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Clock" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" autoFocus title="Text" placeholder="I'm working on" info="You can share a GitHub URL" />
    </Form>
  );
};

const SelectService = ({ project }: { project: Project }) => {
  const { push } = useNavigation();
  const { data, error, isLoading } = usePromise(() => getServices());

  useEffect(() => {
    if (error) {
      void showFailureToast(error, { title: "Failed to fetch services" });
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Services...">
      {data?.data.map((service) => (
        <List.Item
          key={service.id}
          title={service.name}
          actions={
            <ActionPanel>
              <Action
                title="Details"
                onAction={() => {
                  push(<Details project={project} service={service} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No Services" description="No active services found in Clockodo." />
    </List>
  );
};

export default function Command() {
  const { push } = useNavigation();
  const { data, error, isLoading } = useGroupedProjects();

  useEffect(() => {
    if (error) {
      void showFailureToast(error, { title: "Failed to fetch projects" });
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Projects...">
      {data &&
        Object.entries(data).map(([customerName, projects]) => {
          const projectList = Array.isArray(projects) ? projects : [];
          return (
            <List.Section key={customerName} title={customerName}>
              {projectList.map((project) => (
                <List.Item
                  key={project.id}
                  title={project.name}
                  keywords={[customerName]}
                  actions={
                    <ActionPanel>
                      <Action title="Select Service" onAction={() => push(<SelectService project={project} />)} />
                      <Action
                        title="Open Project Report"
                        onAction={() => open(`https://my.clockodo.com/projects/${project.id}/`)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
      <List.EmptyView title="No Projects" description="No active projects found in Clockodo." />
    </List>
  );
}
