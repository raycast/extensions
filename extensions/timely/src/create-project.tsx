import { Form, ActionPanel, Action, showToast, Toast, Icon, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { useTimely } from "./hooks/useTimely";
import { getClients, getCurrentUser, createProject, projectUrl, type TimelyClient } from "./lib/timely-api";

type FormValues = {
  name: string;
  clientId: string;
};

export default function Command() {
  const timely = useTimely();
  const [clients, setClients] = useState<TimelyClient[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);

  useEffect(() => {
    if (timely.status !== "ready") return;

    const { accessToken, accountId } = timely;
    let cancelled = false;

    getClients(accessToken, accountId)
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch((e) => {
        if (!cancelled) setClientsError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [timely]);

  async function handleSubmit(values: FormValues) {
    if (timely.status !== "ready") return;

    const name = values.name?.trim();
    if (!name) {
      showToast({ style: Toast.Style.Failure, title: "Enter a project name" });
      return;
    }

    const clientId = parseInt(values.clientId, 10);
    if (!values.clientId || isNaN(clientId)) {
      showToast({ style: Toast.Style.Failure, title: "Select a client" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating project…" });

    try {
      const currentUser = await getCurrentUser(timely.accessToken, timely.accountId);
      const project = await createProject(timely.accessToken, timely.accountId, {
        name,
        client_id: clientId,
        user_id: currentUser.id,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Project created";
      toast.message = project.name;

      await open(projectUrl(timely.accountId, project.id));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create project";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  if (timely.status === "loading") {
    return <Form isLoading />;
  }

  if (timely.status === "error") {
    return (
      <Form>
        <Form.Description text={`Connection failed: ${timely.error}`} />
      </Form>
    );
  }

  if (clientsError) {
    return (
      <Form>
        <Form.Description text={`Could not load clients: ${clientsError}`} />
      </Form>
    );
  }

  if (clients === null) {
    return <Form isLoading />;
  }

  if (clients.length === 0) {
    return (
      <Form>
        <Form.Description text="No clients found. Create a client in Timely first." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Project name" placeholder="e.g. Website redesign" autoFocus />
      <Form.Dropdown id="clientId" title="Client" storeValue={false}>
        {clients.map((c) => (
          <Form.Dropdown.Item key={c.id} value={String(c.id)} title={c.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
