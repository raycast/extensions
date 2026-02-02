import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { MESSAGES } from "./messages";
import { getLanguage, parseWorkLog, buildDailyWorkLogMessage, sendSlackMessage, WorkLogEntry } from "./utils";
import { validateIssues, updateJiraIssue, getRecentWorkLogSummary, WorkLogHistoryResult } from "./jira";
import { Preferences } from "./utils";

/**
 * Component to display historical work log data.
 * Fetches recent work logs and displays a weekly summary and a "Last 2 Weeks" total.
 */
function WorkLogHistory() {
  const [history, setHistory] = useState<WorkLogHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = getLanguage() as keyof typeof MESSAGES.wkl;
  const wklMessages = MESSAGES.wkl[lang];

  useEffect(() => {
    getRecentWorkLogSummary().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  return (
    <List isLoading={loading} navigationTitle={wklMessages.history_title}>
      {!loading && history && (
        <>
          <List.Section title={wklMessages.last_2_weeks}>
            <List.Item icon={Icon.Clock} title={wklMessages.last_2_weeks} subtitle={`${history.lastTwoWeeksHours}h`} />
          </List.Section>
          <List.Section title={wklMessages.history_subtitle}>
            {history.weekly.map((week, index) => (
              <List.Item
                key={index}
                icon={Icon.Calendar}
                title={wklMessages.week_summary.replace("{start}", week.weekStart)}
                subtitle={wklMessages.week_hours.replace("{hours}", String(week.totalHours))}
                accessories={[{ text: `${week.weekStart} - ${week.weekEnd}` }]}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

/**
 * Validates the user's input work log text against Jira.
 * - Parses lines into structured data.
 * - Checks if issue keys exist in Jira.
 * - Displays a validation summary before submission.
 */
function WorkLogValidator({ initialText }: { initialText: string }) {
  const [searchText] = useState(initialText);

  const [parsedIssues, setParsedIssues] = useState<WorkLogEntry[]>([]);
  const [validationMap, setValidationMap] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const { pop } = useNavigation();

  const lang = getLanguage() as keyof typeof MESSAGES.wkl;
  const wklMessages = MESSAGES.wkl[lang];
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const issues = parseWorkLog(searchText);
    setParsedIssues(issues);

    if (issues.length === 0) {
      setValidationMap({});
      return;
    }

    const uniqueKeys = new Set(issues.map((i) => i.issue_key));
    if (uniqueKeys.size > 0) {
      setLoading(true);
      validateIssues(uniqueKeys).then((map) => {
        setValidationMap(map);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [searchText]);

  const handleSubmit = async () => {
    if (parsedIssues.length === 0) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: wklMessages.processing,
    });

    try {
      const updatePromises = parsedIssues.map(async (issue) => {
        if (issue.issue_key === "NONE") return true;
        return await updateJiraIssue(issue.issue_key, issue.time_spent, issue.summary);
      });

      const results = await Promise.all(updatePromises);
      const allJiraSuccess = results.every((r) => r === true);

      if (!allJiraSuccess) {
        toast.style = Toast.Style.Failure;
        toast.title = wklMessages.some_issue_update_failed;
      }

      const message = buildDailyWorkLogMessage(parsedIssues, preferences.condition, preferences.environment);
      const slackSuccess = await sendSlackMessage(preferences.slackPersonalChannel, message);

      if (slackSuccess && allJiraSuccess) {
        toast.style = Toast.Style.Success;
        toast.title = MESSAGES.daily_log[lang].success;
        pop();
      } else if (!slackSuccess) {
        toast.style = Toast.Style.Failure;
        toast.title = MESSAGES.daily_log[lang].failed;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = String(error);
    }
  };

  const totalHours = parsedIssues.reduce((acc, curr) => acc + curr.time_spent, 0);
  const allValid = parsedIssues.every((i) => validationMap[i.issue_key] === true || i.issue_key === "NONE");

  return (
    <List isLoading={loading} filtering={false} searchBarPlaceholder={wklMessages.review_your_work_log}>
      {parsedIssues.length === 0 ? (
        <List.EmptyView icon={Icon.Text} title={wklMessages.no_valid_work_log} />
      ) : (
        <>
          <List.Item
            icon={allValid ? Icon.CheckCircle : Icon.Warning}
            title={wklMessages.tasks_hours
              .replace("{tasks}", String(parsedIssues.length))
              .replace("{hours}", String(totalHours))}
            subtitle={allValid ? wklMessages.tasks_hours_subtitle : wklMessages.fix_input}
            actions={
              <ActionPanel>{allValid && <Action title={wklMessages.submit} onAction={handleSubmit} />}</ActionPanel>
            }
          />

          {parsedIssues.map((issue, index) => {
            const isValid = validationMap[issue.issue_key] === true || issue.issue_key === "NONE";
            const formatTitle = isValid ? wklMessages.valid_issues : wklMessages.invalid_issues;
            const title = formatTitle.replace("{key}", issue.issue_key).replace("{hours}", String(issue.time_spent));
            const subtitle = isValid
              ? wklMessages.valid_issues_subtitle.replace("{desc}", issue.summary)
              : wklMessages.invalid_issues_subtitle.replace("{desc}", issue.summary);

            return (
              <List.Item key={index} icon={isValid ? Icon.Check : Icon.XMarkCircle} title={title} subtitle={subtitle} />
            );
          })}
        </>
      )}
    </List>
  );
}

function WorkLogInput() {
  const [text, setText] = useState("");
  const lang = getLanguage() as keyof typeof MESSAGES.wkl;
  const wklMessages = MESSAGES.wkl[lang];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push title={wklMessages.preview} target={<WorkLogValidator initialText={text} />} icon={Icon.Eye} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="worklog"
        placeholder={wklMessages.empty_query_subtitle}
        value={text}
        onChange={setText}
        enableMarkdown={false}
        autoFocus
      />
    </Form>
  );
}

export default function WorkLogCommand() {
  const lang = getLanguage() as keyof typeof MESSAGES.wkl;
  const wklMessages = MESSAGES.wkl[lang];
  return (
    <List>
      <List.Item
        title={wklMessages.log}
        subtitle={wklMessages.log_subtitle}
        icon="../assets/jira.png"
        actions={
          <ActionPanel>
            <Action.Push title={wklMessages.log} target={<WorkLogInput />} />
          </ActionPanel>
        }
      />
      <List.Item
        title={wklMessages.history_title}
        subtitle={wklMessages.history_subtitle}
        icon="../assets/jira.png"
        actions={
          <ActionPanel>
            <Action.Push title={wklMessages.history_title} target={<WorkLogHistory />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
