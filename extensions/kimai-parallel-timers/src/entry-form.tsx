import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Entry, idOf, entryPayload } from "./api";
import { client, perform } from "./shared";
export default function EntryForm({
  entry,
  refresh,
}: {
  entry?: Entry;
  refresh?: () => unknown;
}) {
  const api = client();
  const { pop } = useNavigation();
  const submitting = useRef(false);
  const [project, setProject] = useState(
    entry ? String(idOf(entry.project)) : "",
  );
  const [activity, setActivity] = useState(
    entry ? String(idOf(entry.activity)) : "",
  );
  const [description, setDescription] = useState(entry?.description ?? "");
  const [tags, setTags] = useState(
    (entry?.tags ?? [])
      .map((t) => (typeof t === "string" ? t : t.name))
      .join(", "),
  );
  const { data, isLoading } = usePromise(() => api.entryOptions(entry), []);
  const projects = data?.projects ?? [];
  const activities = (data?.activities ?? []).filter(
    (a) =>
      (entry &&
        project === String(idOf(entry.project)) &&
        a.id === idOf(entry.activity)) ||
      (!a.project &&
        projects.find((p) => String(p.id) === project)?.globalActivities !==
          false) ||
      (a.project && String(idOf(a.project)) === project),
  );
  const selectedActivity =
    !entry && !activities.some((a) => String(a.id) === activity)
      ? activities[0]
        ? String(activities[0].id)
        : ""
      : activity;
  useEffect(() => {
    if (!entry && activity !== selectedActivity) setActivity(selectedActivity);
  }, [entry, activity, selectedActivity]);
  const valid = Boolean(
    project && activities.some((a) => String(a.id) === selectedActivity),
  );
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={entry ? "Save Entry" : "Start Parallel Timer"}
            onSubmit={async () => {
              if (!valid || submitting.current) return;
              submitting.current = true;
              await perform(
                entry ? `timer:edit:${entry.id}` : "timer:create",
                entry ? "Save entry" : "Start timer",
                async () => {
                  const body = entryPayload(
                    {
                      project: Number(project),
                      activity: Number(selectedActivity),
                      description,
                      tags,
                    },
                    entry,
                  );
                  if (entry)
                    await api.request(`/timesheets/${entry.id}`, "PATCH", body);
                  else await api.start(body);
                  await refresh?.();
                  pop();
                },
              );
              submitting.current = false;
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown
        id="project"
        title="Project"
        value={project}
        onChange={(v) => {
          setProject(v);
          setActivity("");
        }}
        error={!project ? "Select a project" : undefined}
      >
        <Form.Dropdown.Item value="" title="Select a project" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="activity"
        title="Activity"
        value={selectedActivity}
        onChange={setActivity}
        error={project && !valid ? "Select an activity" : undefined}
      >
        {(entry || !activities.length) && (
          <Form.Dropdown.Item value="" title="Select an activity" />
        )}
        {activities.map((a) => (
          <Form.Dropdown.Item key={a.id} value={String(a.id)} title={a.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="development, support"
        value={tags}
        onChange={setTags}
      />
      {entry && (
        <Form.Description
          title="Times"
          text="This form updates description, project, activity and tags. Open Kimai to edit dates or duration."
        />
      )}
    </Form>
  );
}
