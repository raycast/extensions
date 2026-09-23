import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ProjectLite, TaskLite, UserLite } from "./types";
import { deleteTask, getTask, listProjects, listUsers, updateTask } from "./api";
import { getConfig } from "./preferences";
import ManageSubtasks from "./subtasks";

export default function TaskDetail(props: {
  task: TaskLite;
  appHost: string;
  __openSubtasks?: boolean;
  onUpdated?: (updated?: TaskLite) => void | Promise<void>;
  onDeleted?: (taskId: string) => void;
}) {
  const { task } = props;
  const { pop } = useNavigation();
  const [subtasks, setSubtasks] = useState<Array<{ id: string; text: string; completed: boolean }>>(
    () => task.subtasks || [],
  );
  const [projects, setProjects] = useState<ProjectLite[]>(() => {
    if (task.projectId && task.projectName) {
      return [{ _id: task.projectId, name: task.projectName }];
    }
    return [];
  });
  const [users, setUsers] = useState<UserLite[]>(() => {
    if (task.assigneeId) {
      return [
        {
          _id: task.assigneeId,
          name: task.assigneeName ?? "Loading...",
          email: null,
        },
      ];
    }
    return [];
  });

  const projectDefault = useMemo(() => (task.projectId ? task.projectId : ""), [task.projectId]);
  const assigneeDefault = useMemo(() => (task.assigneeId ? task.assigneeId : ""), [task.assigneeId]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectDefault);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(assigneeDefault);

  const hasSelectedProjectInList = useMemo(
    () => projects.some((p) => p._id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const hasSelectedAssigneeInList = useMemo(
    () => users.some((u) => u._id === selectedAssigneeId),
    [users, selectedAssigneeId],
  );

  useEffect(() => {
    const cfg = getConfig();
    void (async () => {
      try {
        const [projResp, us, freshTask] = await Promise.all([
          listProjects(cfg),
          listUsers(cfg),
          getTask(cfg, task._id).catch(() => null),
        ]);
        if (freshTask && Array.isArray(freshTask.subtasks)) {
          setSubtasks(freshTask.subtasks);
        }
        const projList = projResp?.projects ?? [];
        const mergedProjects =
          projectDefault && !projList.some((p) => p._id === projectDefault)
            ? [{ _id: projectDefault, name: task.projectName ?? "" }, ...projList]
            : projList;
        const mergedUsers =
          assigneeDefault && !us.some((u) => u._id === assigneeDefault)
            ? [
                {
                  _id: assigneeDefault,
                  name: task.assigneeName ?? null,
                  email: null,
                } as UserLite,
                ...us,
              ]
            : us;
        setProjects(mergedProjects);
        setUsers(mergedUsers);
        if (projectDefault) {
          setSelectedProjectId(projectDefault);
        } else if (projList.length > 0) {
          setSelectedProjectId(projList[0]._id);
        }
        if (assigneeDefault) {
          setSelectedAssigneeId(assigneeDefault);
        } else if (us.length > 0) {
          setSelectedAssigneeId(us[0]._id);
        }
      } catch {
        /* errors are already toasted by api */
      }
    })();
  }, [projectDefault, assigneeDefault]);

  const [openSubtasks] = useState<boolean>(Boolean(props.__openSubtasks));

  const initialDescription = useMemo(() => {
    if (task.descriptionMarkdown) return task.descriptionMarkdown;
    const raw = task.description;
    if (!raw) return "";
    // Try to convert TipTap JSON -> simple Slack-style markdown
    try {
      const doc = JSON.parse(raw);
      if (!doc || typeof doc !== "object" || doc.type !== "doc") return raw;

      const renderInline = (node: any): string => {
        if (!node) return "";
        if (node.type === "text") {
          let text: string = node.text || "";
          const marks: Array<any> = Array.isArray(node.marks) ? node.marks : [];
          const link = marks.find((m) => m.type === "link" && m.attrs?.href);
          const hasCode = marks.some((m) => m.type === "code");
          const hasBold = marks.some((m) => m.type === "bold");
          const hasItalic = marks.some((m) => m.type === "italic" || m.type === "em");
          const hasStrike = marks.some((m) => m.type === "strike" || m.type === "strikeThrough");
          if (hasCode) return "`" + String(text).replace(/`/g, "\u200b`") + "`";
          if (hasStrike) text = `~${text}~`;
          if (hasBold) text = `*${text}*`;
          if (hasItalic) text = `_${text}_`;
          if (link) {
            const href = String(link.attrs.href);
            const label = text.length > 0 ? text : href;
            return `<${href}|${label}>`;
          }
          return text;
        }
        if (node.type === "hardBreak") return "\n";
        if (Array.isArray(node.content)) return node.content.map(renderInline).join("");
        return "";
      };

      const renderBlock = (node: any): Array<string> => {
        if (!node) return [];
        switch (node.type) {
          case "paragraph": {
            const line = (node.content || []).map(renderInline).join("");
            return line ? [line] : [];
          }
          case "heading": {
            const level = Math.max(1, Math.min(6, node.attrs?.level || 1));
            const line = (node.content || []).map(renderInline).join("");
            return [`${"#".repeat(level)} ${line}`];
          }
          case "bulletList": {
            const items = Array.isArray(node.content) ? node.content : [];
            const lines: Array<string> = [];
            for (const it of items) {
              const liLines = renderBlock(it);
              if (liLines.length > 0) {
                lines.push(`- ${liLines[0]}`);
                for (let i = 1; i < liLines.length; i++) lines.push(liLines[i]);
              }
            }
            return lines;
          }
          case "orderedList": {
            const items = Array.isArray(node.content) ? node.content : [];
            const lines: Array<string> = [];
            let i = 1;
            for (const it of items) {
              const liLines = renderBlock(it);
              if (liLines.length > 0) {
                lines.push(`${i}. ${liLines[0]}`);
                for (let j = 1; j < liLines.length; j++) lines.push(liLines[j]);
              }
              i += 1;
            }
            return lines;
          }
          case "listItem": {
            const lines: Array<string> = [];
            for (const c of node.content || []) lines.push(...renderBlock(c));
            return lines;
          }
          case "blockquote": {
            const inner = ([] as Array<string>).concat(
              ...((node.content || []) as Array<any>).map((c: any) => renderBlock(c)),
            );
            if (inner.length === 0) return [];
            return inner.map((l) => (l ? `> ${l}` : ">"));
          }
          case "codeBlock": {
            const code = (node.content || []).map((n: any) => (n.type === "text" ? n.text || "" : "")).join("");
            return ["```", code, "```"];
          }
          default: {
            const inline = renderInline(node);
            return inline ? [inline] : [];
          }
        }
      };

      const blocks: Array<string> = [];
      for (const n of doc.content || []) blocks.push(...renderBlock(n));
      return blocks.join("\n").replace(/[\n]{3,}/g, "\n\n");
    } catch {
      return raw;
    }
  }, [task.descriptionMarkdown, task.description]);

  async function handleSubmit(form: {
    title: string;
    projectId?: string;
    assigneeId?: string;
    description?: string;
    dueDate?: string;
    status: TaskLite["status"];
  }) {
    const cfg = getConfig();
    try {
      const ensuredProjectId = form.projectId || selectedProjectId || projects[0]?._id || "";
      const ensuredAssigneeId = form.assigneeId || selectedAssigneeId || users[0]?._id || "";

      if (!ensuredProjectId || !ensuredAssigneeId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Project and assignee are required",
        });
        return;
      }
      const due = form.dueDate ? Date.parse(form.dueDate) : undefined;
      // Subtasks are managed in ManageSubtasks; omitting them here keeps a
      // stale snapshot from clobbering edits made while this form was open.
      await updateTask(cfg, {
        taskId: task._id,
        title: form.title?.trim(),
        projectId: ensuredProjectId,
        assigneeId: ensuredAssigneeId,
        description: form.description,
        dueDate: due && !isNaN(due) ? due : undefined,
        status: form.status,
      });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      try {
        const fresh = await getTask(cfg, task._id);
        props.onUpdated?.(fresh as any);
      } catch {
        try {
          props.onUpdated?.();
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: String(e) });
    }
  }

  if (openSubtasks) {
    return <ManageSubtasks task={{ ...task, subtasks }} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Checkmark} onSubmit={handleSubmit as any} />
          <Action.Push
            title="Manage Subtasks"
            icon={Icon.CheckList}
            target={
              <ManageSubtasks
                task={{ ...task, subtasks }}
                onChanged={async () => {
                  try {
                    const cfg2 = getConfig();
                    const fresh = await getTask(cfg2, task._id);
                    if (Array.isArray(fresh.subtasks)) setSubtasks(fresh.subtasks);
                    try {
                      props.onUpdated?.(fresh as any);
                    } catch {
                      /* ignore */
                    }
                  } catch {
                    /* ignore */
                  }
                }}
              />
            }
          />
          <Action
            title="Delete Task"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            onAction={async () => {
              const ok = await confirmAlert({
                title: "Delete task?",
                message: `This cannot be undone.`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!ok) return;
              try {
                await deleteTask(getConfig(), task._id);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Task deleted",
                });
                props.onDeleted?.(task._id);
                pop();
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: String(e),
                });
              }
            }}
          />
          <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={`${props.appHost}/task/${task._id}`} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Task title" defaultValue={task.title} />
      <Form.Dropdown id="projectId" title="Project" value={selectedProjectId} onChange={setSelectedProjectId}>
        {!hasSelectedProjectInList && selectedProjectId ? (
          <Form.Dropdown.Item
            key="__selected_project__"
            value={selectedProjectId}
            title={task.projectName || selectedProjectId}
          />
        ) : null}
        {projects.map((p) => (
          <Form.Dropdown.Item key={p._id} value={p._id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="assigneeId" title="Assignee" value={selectedAssigneeId} onChange={setSelectedAssigneeId}>
        {!hasSelectedAssigneeInList && selectedAssigneeId ? (
          <Form.Dropdown.Item
            key="__selected_assignee__"
            value={selectedAssigneeId}
            title={task.assigneeName ?? "Loading..."}
          />
        ) : null}
        {users.map((u) => (
          <Form.Dropdown.Item key={u._id} value={u._id} title={u.name || u.email || "Loading..."} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" defaultValue={task.status}>
        <Form.Dropdown.Item value="todo" title="Todo" icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
        <Form.Dropdown.Item value="progress" title="Progress" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="review" title="Review" icon={{ source: Icon.Circle, tintColor: Color.Purple }} />
        <Form.Dropdown.Item value="done" title="Done" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
      </Form.Dropdown>

      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={task.dueDate ? new Date(task.dueDate) : undefined} />

      <Form.TextArea id="description" title="Description" placeholder="Optional" defaultValue={initialDescription} />

      {/* Subtasks summary and navigation hint */}
      <Form.Description
        title="Subtasks"
        text={
          subtasks.length > 0
            ? `${subtasks.filter((s) => s.completed).length}/${subtasks.length} completed`
            : "No subtasks"
        }
      />
    </Form>
  );
}
