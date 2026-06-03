import { showHUD, showToast, Toast, LaunchProps } from "@raycast/api";
import { getAccessToken, getProjects, createTask } from "./api";
import { parseTaskInput } from "./parser";

interface Arguments { text: string; }

export default async function QuickAdd(props: LaunchProps<{ arguments: Arguments }>) {
  const input = props.arguments.text?.trim();
  if (!input) { await showToast({ style: Toast.Style.Failure, title: "No input provided" }); return; }

  try {
    await getAccessToken();
    const parsed = parseTaskInput(input);
    if (!parsed.title) { await showToast({ style: Toast.Style.Failure, title: "Could not parse a task title" }); return; }

    let projectId: string | undefined;
    if (parsed.listName) {
      try {
        const projects = await getProjects();
        const match = projects.find((p) => p.name.toLowerCase() === parsed.listName!.toLowerCase());
        if (match) projectId = match.id;
      } catch { /* fall back to inbox */ }
    }

    await createTask({ title: parsed.title, dueDate: parsed.dueDate, priority: parsed.priority, tags: parsed.tags, projectId });

    const parts: string[] = [parsed.title];
    if (parsed.dueDate) {
      const d = new Date(parsed.dueDate);
      parts.push(d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short" }));
    }
    if (parsed.priority) { const l: Record<number,string> = {5:"High",3:"Medium",1:"Low"}; parts.push(l[parsed.priority]); }
    if (parsed.tags.length) parts.push(parsed.tags.map((t) => `#${t}`).join(" "));

    await showHUD(`✅ ${parts.join(" · ")}`);
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to add task", message: err instanceof Error ? err.message : String(err) });
  }
}
