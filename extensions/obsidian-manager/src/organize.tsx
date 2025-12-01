import {
  ActionPanel,
  Action,
  List,
  Detail,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { analyzeNote, applyOrganization, OrganizationPlan, walkVault } from "./lib/organize";

interface NoteAnalysis {
  path: string;
  relativePath: string;
  status: "pending" | "analyzing" | "done" | "error";
  plan?: OrganizationPlan;
  error?: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [notes, setNotes] = useState<NoteAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    async function loadNotes() {
      try {
        const files = await walkVault();
        setNotes(
          files.map((f) => ({
            path: f.path,
            relativePath: f.relativePath,
            status: "pending",
          })),
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Vault Loaded",
          message: `Found ${files.length} notes`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load vault",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadNotes();
  }, []);

  async function analyzeAll() {
    setIsAnalyzing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing notes...",
      message: `0/${notes.length}`,
    });

    for (let i = 0; i < notes.length; i++) {
      setCurrentIndex(i);
      toast.message = `${i + 1}/${notes.length}`;

      setNotes((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: "analyzing" };
        return updated;
      });

      try {
        const plan = await analyzeNote(notes[i].path);
        setNotes((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "done", plan };
          return updated;
        });
      } catch (err) {
        setNotes((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          };
          return updated;
        });
      }

      // Small delay between notes to avoid rate limits
      if (i < notes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    setIsAnalyzing(false);
    toast.style = Toast.Style.Success;
    toast.title = "Analysis Complete";

    const needsAction = notes.filter(
      (n) => n.plan && n.plan.actions.length > 0 && n.plan.actions[0]?.type !== "NO_ACTION",
    ).length;
    toast.message = `${needsAction} notes need organization`;
  }

  async function analyzeSingle(index: number) {
    setNotes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "analyzing" };
      return updated;
    });

    try {
      const plan = await analyzeNote(notes[index].path);
      setNotes((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "done", plan };
        return updated;
      });

      if (plan.actions.length > 0 && plan.actions[0]?.type !== "NO_ACTION") {
        await showToast({
          style: Toast.Style.Success,
          title: "Changes Suggested",
          message: plan.actions.map((a) => a.type).join(", "),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "No Changes Needed",
        });
      }
    } catch (err) {
      setNotes((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
        return updated;
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "Analysis Failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function viewPlan(note: NoteAnalysis) {
    if (note.plan) {
      push(<PlanDetail note={note} onApply={() => applyPlan(note)} />);
    }
  }

  async function applyPlan(note: NoteAnalysis) {
    if (!note.plan || note.plan.actions.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Apply Changes?",
      message: `This will ${note.plan.actions.map((a) => a.type.toLowerCase()).join(", ")} the note.`,
      primaryAction: {
        title: "Apply",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await applyOrganization(note.path, note.plan);
      await showToast({
        style: Toast.Style.Success,
        title: "Changes Applied",
      });

      // Remove from list or mark as done
      setNotes((prev) => prev.filter((n) => n.path !== note.path));
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Apply",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function getStatusIcon(note: NoteAnalysis): { source: Icon; tintColor?: Color } {
    switch (note.status) {
      case "analyzing":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      case "error":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "done":
        if (!note.plan || note.plan.actions.length === 0 || note.plan.actions[0]?.type === "NO_ACTION") {
          return { source: Icon.CheckCircle, tintColor: Color.Green };
        }
        return { source: Icon.ExclamationMark, tintColor: Color.Orange };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function getActionSummary(plan?: OrganizationPlan): string {
    if (!plan || plan.actions.length === 0) return "";
    const action = plan.actions[0];
    if (action.type === "NO_ACTION") return "OK";
    return action.type;
  }

  // Filter to show notes needing action first
  const sortedNotes = [...notes].sort((a, b) => {
    const aNeeds = a.plan && a.plan.actions.length > 0 && a.plan.actions[0]?.type !== "NO_ACTION" ? 0 : 1;
    const bNeeds = b.plan && b.plan.actions.length > 0 && b.plan.actions[0]?.type !== "NO_ACTION" ? 0 : 1;
    return aNeeds - bNeeds;
  });

  const needsActionCount = notes.filter(
    (n) => n.plan && n.plan.actions.length > 0 && n.plan.actions[0]?.type !== "NO_ACTION",
  ).length;

  const analyzedCount = notes.filter((n) => n.status === "done").length;

  return (
    <List isLoading={isLoading || isAnalyzing} searchBarPlaceholder="Filter notes..." navigationTitle="Organize Vault">
      <List.Section title="Actions">
        <List.Item
          title="Analyze All Notes"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          subtitle={
            analyzedCount > 0
              ? `${analyzedCount}/${notes.length} analyzed, ${needsActionCount} need action`
              : `${notes.length} notes`
          }
          actions={
            <ActionPanel>
              <Action
                title="Start Analysis"
                icon={Icon.Play}
                onAction={analyzeAll}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {needsActionCount > 0 && (
        <List.Section title="Needs Organization" subtitle={`${needsActionCount} notes`}>
          {sortedNotes
            .filter((n) => n.plan && n.plan.actions.length > 0 && n.plan.actions[0]?.type !== "NO_ACTION")
            .map((note) => (
              <List.Item
                key={note.path}
                title={note.relativePath}
                icon={getStatusIcon(note)}
                accessories={[
                  { tag: { value: getActionSummary(note.plan), color: Color.Orange } },
                  { text: note.plan?.actions[0]?.reason?.slice(0, 40) },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="View Plan" icon={Icon.Eye} onAction={() => viewPlan(note)} />
                    <Action
                      title="Apply Changes"
                      icon={Icon.Hammer}
                      onAction={() => applyPlan(note)}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Re-Analyze"
                      icon={Icon.RotateClockwise}
                      onAction={() => analyzeSingle(notes.indexOf(note))}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      <List.Section title="All Notes" subtitle={`${notes.length} total`}>
        {sortedNotes.map((note) => (
          <List.Item
            key={note.path}
            title={note.relativePath}
            icon={getStatusIcon(note)}
            accessories={[
              note.status === "done" && note.plan
                ? {
                    tag: {
                      value: getActionSummary(note.plan),
                      color: note.plan.actions[0]?.type === "NO_ACTION" ? Color.Green : Color.Orange,
                    },
                  }
                : {},
              note.error ? { text: note.error.slice(0, 30), tooltip: note.error } : {},
            ]}
            actions={
              <ActionPanel>
                {note.status === "done" && note.plan && note.plan.actions[0]?.type !== "NO_ACTION" ? (
                  <>
                    <Action title="View Plan" icon={Icon.Eye} onAction={() => viewPlan(note)} />
                    <Action
                      title="Apply Changes"
                      icon={Icon.Hammer}
                      onAction={() => applyPlan(note)}
                      style={Action.Style.Destructive}
                    />
                  </>
                ) : null}
                <Action
                  title="Analyze Note"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => analyzeSingle(notes.indexOf(note))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface PlanDetailProps {
  note: NoteAnalysis;
  onApply: () => void;
}

function PlanDetail({ note, onApply }: PlanDetailProps) {
  if (!note.plan) return null;

  let markdown = `# Organization Plan\n\n`;
  markdown += `**File:** ${note.relativePath}\n\n---\n\n`;

  for (const action of note.plan.actions) {
    markdown += `## ${action.type}\n\n`;
    markdown += `**Reason:** ${action.reason}\n\n`;

    if (action.type === "RENAME" && action.newPath) {
      markdown += `**New name:** \`${action.newPath}\`\n\n`;
    } else if (action.type === "REWRITE" && action.content) {
      markdown += `**New content preview:**\n\n\`\`\`markdown\n${action.content.slice(0, 1000)}${action.content.length > 1000 ? "\n..." : ""}\n\`\`\`\n\n`;
    } else if (action.type === "SPLIT" && action.newNotes) {
      markdown += `**Split into ${action.newNotes.length} notes:**\n\n`;
      for (const newNote of action.newNotes) {
        markdown += `### ${newNote.path}\n\n`;
        markdown += `\`\`\`markdown\n${newNote.content.slice(0, 500)}${newNote.content.length > 500 ? "\n..." : ""}\n\`\`\`\n\n`;
      }
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Apply Changes" icon={Icon.Hammer} onAction={onApply} style={Action.Style.Destructive} />
        </ActionPanel>
      }
    />
  );
}
