import { Action, ActionPanel, Form, List, showToast, Toast, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";
import { buildHeptabaseUrl } from "./shared-types";
import { parseHeptabaseList } from "./xml-parser";

/**
 * Journal entry from API
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
 * Detail view for a single journal entry
 */
function JournalDetail({ entry }: { entry: JournalEntry }) {
  const preferences = getPreferenceValues<Preferences>();
  const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, "journal", entry.id);

  return (
    <Detail
      markdown={entry.content || "No content"}
      navigationTitle={entry.date}
      actions={
        <ActionPanel>
          {heptabaseUrl && <Action.OpenInBrowser title="Open in Heptabase" icon={Icon.Globe} url={heptabaseUrl} />}
          <Action.CopyToClipboard title="Copy Content" content={entry.content} />
          <Action.CopyToClipboard title="Copy Date" content={entry.date} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get Journal Range
 * Retrieve journal entries within a date range
 */
export default function GetJournalRange() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Default: last 7 days
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState<Date>(weekAgo);
  const [endDate, setEndDate] = useState<Date>(today);

  async function handleSubmit() {
    if (!startDate || !endDate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select both dates",
      });
      return;
    }

    // Check 92 day limit
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 92) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Date range too large",
        message: "Maximum 92 days per request",
      });
      return;
    }

    if (endDate < startDate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid date range",
        message: "End date must be after start date",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading journals...",
      });

      await authorize();
      const client = getHeptabaseMCPClient();

      const result = (await client.callTool("get_journal_range", {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      })) as JournalRangeResult;

      // Parse results - API returns XML format
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find((c) => c.type === "text");
        if (textContent) {
          const xmlText = textContent.text;

          // Parse journals from XML using shared parser
          const parsedJournals = parseHeptabaseList(xmlText, ["journal"]);
          const journals: JournalEntry[] = parsedJournals.map((j) => ({
            id: j.id,
            date: j.title || j.id,
            content: j.content || "(Empty journal)",
          }));

          if (journals.length > 0) {
            setEntries(journals);
          } else {
            // Fallback: show raw content if no journals parsed
            setEntries([
              {
                id: "raw",
                date: `${formatDate(startDate)} - ${formatDate(endDate)}`,
                content: xmlText,
              },
            ]);
          }
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Journals loaded",
        message: `Found ${entries.length} entries`,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error loading journals:", e);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load journals",
        message: errorMessage,
      });
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasSearched) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Get Journals" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.DatePicker
          id="startDate"
          title="Start Date"
          value={startDate}
          onChange={(date) => date && setStartDate(date)}
        />
        <Form.DatePicker id="endDate" title="End Date" value={endDate} onChange={(date) => date && setEndDate(date)} />
        <Form.Description text="Retrieve journal entries from your Heptabase. Maximum 92 days per request." />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading}>
      {entries.length === 0 ? (
        <List.EmptyView
          title="No journal entries found"
          description={`${formatDate(startDate)} - ${formatDate(endDate)}`}
          icon="📅"
          actions={
            <ActionPanel>
              <Action
                title="Search Again"
                onAction={() => {
                  setHasSearched(false);
                  setEntries([]);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        entries.map((entry, index) => (
          <List.Item
            key={entry.id || `entry-${index}`}
            title={entry.date}
            subtitle={entry.content?.substring(0, 100)}
            accessories={[{ text: "Journal" }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Full Entry" icon={Icon.Eye} target={<JournalDetail entry={entry} />} />
                {(() => {
                  const preferences = getPreferenceValues<Preferences>();
                  const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, "journal", entry.id);
                  if (heptabaseUrl) {
                    return (
                      <Action.OpenInBrowser
                        title="Open in Heptabase"
                        icon={Icon.Globe}
                        url={heptabaseUrl}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    );
                  }
                  return null;
                })()}
                <Action.CopyToClipboard
                  title="Copy Content"
                  content={entry.content}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Search Again"
                  onAction={() => {
                    setHasSearched(false);
                    setEntries([]);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
