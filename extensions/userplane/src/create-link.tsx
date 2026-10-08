import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LocalStorage,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { api } from "./api/client";
import { reportApiError } from "./api/errors";
import { CommonActions } from "./components/common-actions";
import { LinkSuccess } from "./components/link-success";
import { useDomains } from "./hooks/use-domains";
import { useProjects } from "./hooks/use-projects";
import { useWorkspaces } from "./hooks/use-workspaces";

const LAST_WORKSPACE_KEY = "userplane:lastWorkspaceId";
const lastDomainKey = (workspaceId: string) => `userplane:lastDomainId:${workspaceId}`;
const lastProjectKey = (workspaceId: string) => `userplane:lastProjectId:${workspaceId}`;

interface FormValues {
  reference: string;
  reusable: boolean;
}

export default function CreateLinkCommand() {
  const { push } = useNavigation();
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [domainId, setDomainId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const workspaces = useWorkspaces();
  const domains = useDomains(workspaceId || undefined);
  const projects = useProjects(workspaceId || undefined);

  useEffect(() => {
    void (async () => {
      const stored = await LocalStorage.getItem<string>(LAST_WORKSPACE_KEY);
      if (stored) setWorkspaceId(stored);
    })();
  }, []);

  useEffect(() => {
    const list = workspaces.data?.workspaces;
    if (!list || list.length === 0) return;
    if (workspaceId && list.some((w) => w.workspaceId === workspaceId)) return;
    setWorkspaceId(list[0].workspaceId);
  }, [workspaces.data, workspaceId]);

  useEffect(() => {
    if (workspaceId) void LocalStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  }, [workspaceId]);

  const bootstrappedDomainForWs = useRef<string | null>(null);
  useEffect(() => {
    const list = domains.data?.domains;
    if (!list) return;
    if (!workspaceId) return;
    if (list.length === 0) {
      setDomainId("");
      return;
    }
    if (bootstrappedDomainForWs.current === workspaceId) return;
    bootstrappedDomainForWs.current = workspaceId;
    void (async () => {
      const stored = await LocalStorage.getItem<string>(lastDomainKey(workspaceId));
      if (stored && list.some((d) => d.domainId === stored)) {
        setDomainId(stored);
      } else {
        setDomainId(list[0].domainId);
      }
    })();
  }, [domains.data, workspaceId]);

  const bootstrappedProjectForWs = useRef<string | null>(null);
  useEffect(() => {
    const list = projects.data?.projects;
    if (!list) return;
    if (!workspaceId) return;
    if (list.length === 0) {
      setProjectId("");
      return;
    }
    if (bootstrappedProjectForWs.current === workspaceId) return;
    bootstrappedProjectForWs.current = workspaceId;
    void (async () => {
      const stored = await LocalStorage.getItem<string>(lastProjectKey(workspaceId));
      if (stored && list.some((p) => p.projectId === stored)) {
        setProjectId(stored);
        return;
      }
      const preferred = list.find((p) => p.isDefault) ?? list[0];
      setProjectId(preferred.projectId);
    })();
  }, [projects.data, workspaceId]);

  const isLoading = workspaces.isLoading || domains.isLoading || projects.isLoading || submitting;
  const workspaceItems = workspaces.data?.workspaces ?? [];
  const domainItems = domains.data?.domains ?? [];
  const projectItems = projects.data?.projects ?? [];
  const noWorkspaces = !workspaces.isLoading && workspaceItems.length === 0;
  const noDomains = Boolean(workspaceId) && !domains.isLoading && domainItems.length === 0;
  const noProjects = Boolean(workspaceId) && !projects.isLoading && projectItems.length === 0;
  const singleWorkspace = workspaceItems.length === 1;
  const onlyWorkspace = singleWorkspace ? workspaceItems[0] : null;
  const currentWorkspace = workspaceItems.find((w) => w.workspaceId === workspaceId);
  const currentMemberId = currentWorkspace?.workspaceMembership?.workspaceMemberId;

  async function submitLink(values: FormValues, openInBrowser: boolean) {
    if (!workspaceId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a workspace first" });
      return;
    }
    if (!domainId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a domain first" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating link…" });

    try {
      const result = await api.links.create(workspaceId, {
        projectId: projectId || undefined,
        domainId,
        linkReference: values.reference.trim() || undefined,
        linkReusable: values.reusable,
        linkMeta: { source: "raycast" },
      });

      const link = result.link;
      const url = link.linkURL;
      await Clipboard.copy(url);
      await LocalStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
      await LocalStorage.setItem(lastDomainKey(workspaceId), domainId);
      if (projectId) {
        await LocalStorage.setItem(lastProjectKey(workspaceId), projectId);
      }

      toast.style = Toast.Style.Success;
      toast.title = openInBrowser ? "Link copied & opened" : "Link created";
      toast.message = url;

      if (openInBrowser) {
        await open(url);
      }

      push(<LinkSuccess link={link} workspaceId={workspaceId} workspaceName={currentWorkspace?.workspaceName} />);
    } catch (error) {
      toast.hide();
      await reportApiError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create & Copy Link"
            icon={Icon.Link}
            onSubmit={(values: FormValues) => submitLink(values, false)}
          />
          <Action.SubmitForm
            title="Create & Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={(values: FormValues) => submitLink(values, true)}
          />
          <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
        </ActionPanel>
      }
    >
      {noWorkspaces ? (
        <Form.Description
          title="No workspaces"
          text="Your API key isn't linked to a workspace yet. Create one in the Userplane dashboard to get started."
        />
      ) : null}

      {singleWorkspace && onlyWorkspace ? (
        <Form.Description title="Workspace" text={onlyWorkspace.workspaceName} />
      ) : (
        <Form.Dropdown
          id="workspaceId"
          title="Workspace"
          value={workspaceId}
          onChange={setWorkspaceId}
          isLoading={workspaces.isLoading}
          storeValue={false}
        >
          {workspaceItems.map((workspace) => (
            <Form.Dropdown.Item
              key={workspace.workspaceId}
              value={workspace.workspaceId}
              title={workspace.workspaceName}
            />
          ))}
        </Form.Dropdown>
      )}

      {noProjects ? (
        <Form.Description
          title="No projects"
          text="You don't have any projects in this workspace yet. Create one in the Userplane dashboard to continue."
        />
      ) : (
        <Form.Dropdown
          id="projectId"
          title="Project"
          value={projectId}
          onChange={setProjectId}
          isLoading={projects.isLoading}
          storeValue={false}
        >
          {projectItems.map((project) => (
            <Form.Dropdown.Item
              key={project.projectId}
              value={project.projectId}
              title={project.isDefault ? `${project.projectTitle} (default)` : project.projectTitle}
            />
          ))}
        </Form.Dropdown>
      )}

      {noDomains ? (
        <Form.Description
          title="No domains"
          text="You'll need a domain before creating a link. Add one in the Userplane dashboard to get started."
        />
      ) : (
        <Form.Dropdown
          id="domainId"
          title="Domain"
          value={domainId}
          onChange={setDomainId}
          isLoading={domains.isLoading}
          storeValue={false}
        >
          {domainItems.map((domain) => (
            <Form.Dropdown.Item key={domain.domainId} value={domain.domainId} title={domain.domainUrl} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextField id="reference" title="Reference" placeholder="Optional ID or note for this link" />

      <Form.Checkbox
        id="reusable"
        label="Reusable link"
        defaultValue={false}
        info="Reusable links can record multiple sessions. Single-use links record one and then expire."
      />
    </Form>
  );
}
