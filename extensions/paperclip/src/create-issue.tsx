import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  buildIssueUrl,
  createIssue,
  listAgents,
  listCompanies,
  type Agent,
  type Company,
  type PaperclipPreferences,
} from "./api";

const STATUS_OPTIONS = [
  { value: "backlog", title: "Backlog" },
  { value: "todo", title: "Todo" },
  { value: "in_progress", title: "In Progress" },
  { value: "in_review", title: "In Review" },
  { value: "blocked", title: "Blocked" },
  { value: "done", title: "Done" },
  { value: "cancelled", title: "Cancelled" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "critical", title: "Critical" },
  { value: "high", title: "High" },
  { value: "medium", title: "Medium" },
  { value: "low", title: "Low" },
] as const;

type FormValues = {
  companyId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeAgentId: string;
};

type LaunchContext = {
  companyId?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function CreateIssueCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const preferences = useMemo<PaperclipPreferences>(() => getPreferenceValues<Preferences>(), []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedCompanyId, setSelectedCompanyId] = useState(props.launchContext?.companyId ?? "");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string>();
  const [selectedAssigneeAgentId, setSelectedAssigneeAgentId] = useState("");

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;

    async function run() {
      setIsLoading(true);
      setError(undefined);

      try {
        const loadedCompanies = await listCompanies(preferences, abortController.signal);
        if (!isCurrent) return;

        setCompanies(loadedCompanies);
        setSelectedCompanyId((current) => {
          if (current && loadedCompanies.some((company) => company.id === current)) {
            return current;
          }
          return loadedCompanies[0]?.id ?? "";
        });
      } catch (nextError) {
        if (!isCurrent || abortController.signal.aborted) {
          return;
        }
        setError(getErrorMessage(nextError));
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [preferences]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setAgents([]);
      setAgentsError(undefined);
      setSelectedAssigneeAgentId("");
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;

    async function run() {
      setAgentsLoading(true);
      setAgentsError(undefined);

      try {
        const loadedAgents = await listAgents(preferences, selectedCompanyId, abortController.signal);
        if (!isCurrent) return;

        setAgents(loadedAgents);
        setSelectedAssigneeAgentId((current) =>
          current && loadedAgents.some((agent) => agent.id === current) ? current : "",
        );
      } catch (nextError) {
        if (!isCurrent || abortController.signal.aborted) {
          return;
        }
        setAgents([]);
        setAgentsError(getErrorMessage(nextError));
        setSelectedAssigneeAgentId("");
      } finally {
        if (isCurrent) {
          setAgentsLoading(false);
        }
      }
    }

    run();

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [preferences, selectedCompanyId]);

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
        message: "Add a short issue title before submitting.",
      });
      return false;
    }

    const company = companies.find((entry) => entry.id === values.companyId);
    if (!company) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No company selected",
        message: "Pick a Paperclip company before creating an issue.",
      });
      return false;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating issue",
      message: values.title.trim(),
    });

    try {
      const issue = await createIssue(preferences, values.companyId, {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        status: values.status,
        priority: values.priority,
        assigneeAgentId: values.assigneeAgentId || undefined,
      });

      const issueUrl = buildIssueUrl(preferences.apiBaseUrl, company.issuePrefix, issue.identifier);
      toast.style = Toast.Style.Success;
      toast.title = "Issue created";
      toast.message = issue.identifier;
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => {
          void open(issueUrl);
        },
      };

      await popToRoot({ clearSearchBar: true });
    } catch (submitError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn’t create issue";
      toast.message = getErrorMessage(submitError);
      return false;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Issue"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {error ? <Form.Description title="Connection Error" text={error} /> : null}
      <Form.Dropdown
        id="companyId"
        title="Company"
        value={selectedCompanyId}
        onChange={setSelectedCompanyId}
        info="The issue will be created in this Paperclip company."
      >
        {companies.map((company) => (
          <Form.Dropdown.Item key={company.id} value={company.id} title={company.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="assigneeAgentId"
        title="Assignee"
        value={selectedAssigneeAgentId}
        onChange={setSelectedAssigneeAgentId}
        info={
          agentsError
            ? `Couldn’t load agents: ${agentsError}`
            : agentsLoading
              ? "Loading available agents for the selected company."
              : "Leave unassigned or pick an agent."
        }
      >
        <Form.Dropdown.Item value="" title="Unassigned" />
        {agents.map((agent) => (
          <Form.Dropdown.Item key={agent.id} value={agent.id} title={`${agent.name} (${agent.role})`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Issue title" />
      <Form.TextArea id="description" title="Description" placeholder="Describe the work to be done" enableMarkdown />
      <Form.Dropdown id="status" title="Status" defaultValue="todo">
        {STATUS_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="medium">
        {PRIORITY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
