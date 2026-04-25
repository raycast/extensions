import React, { useState } from "react";
import { Form, ActionPanel, Action, Toast, showToast, useNavigation } from "@raycast/api";
import { createJiraIssue } from "../lib/integrations/jira";
import { getPreferenceValues } from "@raycast/api";

interface JiraPreferences {
  jiraUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
}

interface JiraIssueFormProps {
  initialSummary?: string;
  initialDescription?: string;
  onSuccess?: (issueKey: string, issueUrl: string) => void | Promise<void>;
}

export function JiraIssueForm({ initialSummary = "", initialDescription = "", onSuccess }: JiraIssueFormProps) {
  const prefs = getPreferenceValues<JiraPreferences>();
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [description, setDescription] = useState(initialDescription);
  const [issueType, setIssueType] = useState<"Bug" | "Task" | "Incident">("Bug");
  const [priority, setPriority] = useState<"Highest" | "High" | "Medium" | "Low" | "Lowest">("Medium");

  const handleSubmit = async () => {
    if (!summary.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Summary is required",
      });
      return;
    }

    if (!description.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Description is required",
      });
      return;
    }

    if (!prefs.jiraUrl || !prefs.jiraEmail || !prefs.jiraApiToken || !prefs.jiraProjectKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Jira configuration incomplete",
        message: "Check Jira URL, Email, API Token, and Project Key in extension preferences",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await createJiraIssue(prefs.jiraUrl, prefs.jiraEmail, prefs.jiraApiToken, {
        summary: summary.trim(),
        description: description.trim(),
        issueType,
        projectKey: prefs.jiraProjectKey,
        priority,
      });

      // Convert self URL to browse URL
      // self: https://mysite.atlassian.net/rest/api/3/issue/10000
      // browse: https://mysite.atlassian.net/browse/KAN-1
      const issueUrl = response.self.replace(/\/rest\/api\/\d+\/issue\/\d+/, `/browse/${response.key}`);

      await showToast({
        style: Toast.Style.Success,
        title: "Issue created successfully",
        message: response.key,
      });

      if (onSuccess) {
        onSuccess(response.key, issueUrl);
      } else {
        pop();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create issue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Issue" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="issueType"
        title="Issue Type"
        value={issueType}
        onChange={(value) => setIssueType(value as "Bug" | "Task" | "Incident")}
      >
        <Form.Dropdown.Item value="Bug" title="🐛 Bug" />
        <Form.Dropdown.Item value="Task" title="✓ Task" />
        <Form.Dropdown.Item value="Incident" title="⚠️ Incident" />
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={(value) => setPriority(value as "Highest" | "High" | "Medium" | "Low" | "Lowest")}
      >
        <Form.Dropdown.Item value="Lowest" title="⬜ Lowest" />
        <Form.Dropdown.Item value="Low" title="🟦 Low" />
        <Form.Dropdown.Item value="Medium" title="🟧 Medium" />
        <Form.Dropdown.Item value="High" title="🟥 High" />
        <Form.Dropdown.Item value="Highest" title="🔴 Highest" />
      </Form.Dropdown>

      <Form.TextField
        id="summary"
        title="Summary"
        placeholder="Brief description of the issue"
        value={summary}
        onChange={setSummary}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Detailed description"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
