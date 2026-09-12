import { Action, ActionPanel, Form, showToast, Toast, open, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

import type { ProjectLite, UserLite } from "./types";
import { createTask, listProjects, listUsers, whoami } from "./api";
import { getAppHost, getConfig } from "./preferences";
import ManageSubtasks from "./subtasks";

export default function Command() {
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const [lastCreatedTaskId, setLastCreatedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getConfig();
    void (async () => {
      try {
        const [projResp, us, me] = await Promise.all([listProjects(cfg), listUsers(cfg), whoami(cfg)]);
        setProjects(projResp?.projects ?? []);
        setLastProjectId(projResp?.lastSelectedProjectId ?? null);
        setUsers(us);
        if (me?.ok && me.userId) setMyUserId(me.userId);
      } catch {
        /* errors are already toasted by api */
      }
    })();
  }, []);

  async function handleSubmit(values: {
    title: string;
    projectId: string;
    assigneeId?: string;
    description?: string;
    dueDate?: string;
  }) {
    const cfg = getConfig();
    try {
      const due = values.dueDate ? Date.parse(values.dueDate) : undefined;
      const effectiveAssignee = values.assigneeId ? values.assigneeId || undefined : myUserId || undefined;
      const res = await createTask(cfg, {
        title: values.title.trim(),
        projectId: values.projectId,
        assigneeId: effectiveAssignee,
        description: values.description || undefined,
        dueDate: due && !isNaN(due) ? due : undefined,
      });
      const appHost = getAppHost();
      setLastCreatedTaskId(res.taskId);
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        primaryAction: {
          title: "Open in Browser",
          onAction: () => {
            open(appHost + "/task/" + res.taskId);
          },
        },
      } as any);
    } catch {
      /* errors are already toasted by api */
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          {lastCreatedTaskId ? (
            <Action.Push
              title="Manage Subtasks"
              icon={Icon.List}
              target={
                <ManageSubtasks
                  task={
                    {
                      _id: lastCreatedTaskId,
                      _creationTime: Date.now(),
                      title: "",
                      status: "todo",
                    } as any
                  }
                />
              }
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Task title" autoFocus />
      <Form.Dropdown
        id="projectId"
        title="Project"
        key={`project-${lastProjectId ?? ""}`}
        defaultValue={lastProjectId ?? (projects.length > 0 ? projects[0]._id : "")}
      >
        {projects.map((p) => (
          <Form.Dropdown.Item key={p._id} value={p._id} title={p.name} />
        ))}
      </Form.Dropdown>
      {(() => {
        const normalizedKey = (s: string) => s.toLowerCase().replace(/\s+/g, "");
        const grouped = new Map<string, UserLite[]>();
        for (const u of users) {
          const name = (u.name || u._id).trim();
          const key = normalizedKey(name);
          const arr = grouped.get(key) || [];
          arr.push(u);
          grouped.set(key, arr);
        }
        const score = (name: string) => {
          let s = 0;
          if (/\s/.test(name)) s += 100; // prefer spaced names like "Xiao Du"
          if (/[A-Z]/.test(name)) s += 10; // prefer capitalized variants
          s += name.length; // then by length
          return s;
        };
        const pickPreferred = (arr: UserLite[]) => {
          return arr.slice().sort((a, b) => score((b.name || b._id).trim()) - score((a.name || a._id).trim()))[0];
        };
        // Determine my group key (based on my name if present in list)
        let myGroupKey: string | null = null;
        if (myUserId) {
          const me = users.find((u) => u._id === myUserId) || null;
          if (me) myGroupKey = normalizedKey((me.name || me._id).trim());
        }
        // Build list from preferred representative per group, excluding my group
        const others: UserLite[] = [];
        for (const [key, arr] of grouped.entries()) {
          if (myGroupKey && key === myGroupKey) continue;
          const preferred = pickPreferred(arr);
          if (preferred._id === myUserId) continue;
          others.push(preferred);
        }
        // My display prefers preferred name from my group
        let myDisplay = "-";
        if (myUserId) {
          if (myGroupKey && grouped.has(myGroupKey)) {
            const preferred = pickPreferred(grouped.get(myGroupKey)!);
            myDisplay = preferred.name || preferred._id;
          } else {
            myDisplay = users.find((u) => u._id === myUserId)?.name || "";
          }
        }
        others.sort((a, b) => (a.name || a._id).localeCompare(b.name || b._id));
        return (
          <Form.Dropdown
            id="assigneeId"
            title="Assignee"
            key={`assignee-${myUserId ?? "none"}`}
            defaultValue={myUserId || ""}
          >
            <Form.Dropdown.Item value={myUserId || ""} title={`${myDisplay}`} />
            {others.map((u) => (
              <Form.Dropdown.Item key={u._id} value={u._id} title={u.name || u._id} />
            ))}
          </Form.Dropdown>
        );
      })()}
      <Form.DatePicker id="dueDate" title="Due" />
      <Form.TextArea id="description" title="Description" placeholder="Optional" />
    </Form>
  );
}
