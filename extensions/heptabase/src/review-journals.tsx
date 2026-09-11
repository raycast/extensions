import { Action, ActionPanel, List, showToast, Toast, Detail, Icon, Form, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";

import { parseHeptabaseList } from "./xml-parser";

/**
 * Journal entry
 */
interface JournalEntry {
  id: string;
  date: string;
  content: string;
}

/**
 * MCP result for journal range
 */
interface JournalRangeResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Review View - Aggregated journals
 */
function ReviewView({ startDate, endDate, title }: { startDate: Date; endDate: Date; title: string }) {
  const [markdown, setMarkdown] = useState<string>("Loading journals...");
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    async function loadJournals() {
      try {
        await authorize();
        const client = getHeptabaseMCPClient();

        const startStr = formatDate(startDate);
        const endStr = formatDate(endDate);

        await showToast({ style: Toast.Style.Animated, title: "Fetching journals..." });

        const result = (await client.callTool("get_journal_range", {
          startDate: startStr,
          endDate: endStr,
        })) as JournalRangeResult;

        let aggregatedContent = `# ${title}\n\n**Period:** ${startStr} to ${endStr}\n\n---\n\n`;
        const fetchedEntries: JournalEntry[] = [];

        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content.find((c) => c.type === "text");
          if (textContent) {
            const xmlText = textContent.text;

            const parsedJournals = parseHeptabaseList(xmlText, ["journal"]);

            for (const j of parsedJournals) {
              const entry: JournalEntry = {
                id: j.id,
                date: j.title || j.id,
                content: j.content,
              };
              fetchedEntries.push(entry);
              aggregatedContent += `## ${entry.date}\n\n${entry.content || "*(No content)*"}\n\n---\n\n`;
            }
          }
        }

        if (fetchedEntries.length === 0) {
          aggregatedContent += "*No journal entries found for this period.*";
        }

        setEntries(fetchedEntries);
        setMarkdown(aggregatedContent);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Success, title: `Loaded ${fetchedEntries.length} entries` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMarkdown(`# Error\n\nFailed to load journals: ${msg}`);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: "Error", message: msg });
      }
    }
    loadJournals();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All for AI" content={markdown} />
          <Action.CopyToClipboard
            title="Copy Raw Content"
            content={entries.map((e) => `${e.date}:\n${e.content}`).join("\n\n---\n\n")}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Weekly Review Command
 */
export default function WeeklyReview() {
  const today = new Date();

  // Past 7 days
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 7);

  // Past month
  const lastMonthStart = new Date(today);
  lastMonthStart.setDate(today.getDate() - 30);

  return (
    <List navigationTitle="Weekly Review">
      <List.Section title="Presets">
        <List.Item
          icon={Icon.Calendar}
          title="Last 7 Days"
          subtitle={`${formatDate(lastWeekStart)} - ${formatDate(today)}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start Review"
                icon={Icon.Eye}
                target={<ReviewView startDate={lastWeekStart} endDate={today} title="Weekly Review (Last 7 Days)" />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Calendar}
          title="Last 30 Days"
          subtitle={`${formatDate(lastMonthStart)} - ${formatDate(today)}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start Review"
                icon={Icon.Eye}
                target={<ReviewView startDate={lastMonthStart} endDate={today} title="Monthly Review (Last 30 Days)" />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Custom">
        <List.Item
          icon={Icon.Pencil}
          title="Custom Date Range"
          subtitle="Choose specific dates"
          actions={
            <ActionPanel>
              <Action.Push title="Select Dates" target={<CustomDateForm />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CustomDateForm() {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Review"
            onSubmit={() => {
              push(
                <ReviewView
                  startDate={startDate}
                  endDate={endDate}
                  title={`Review (${formatDate(startDate)} - ${formatDate(endDate)})`}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="start" title="Start Date" value={startDate} onChange={(d) => d && setStartDate(d)} />
      <Form.DatePicker id="end" title="End Date" value={endDate} onChange={(d) => d && setEndDate(d)} />
    </Form>
  );
}
