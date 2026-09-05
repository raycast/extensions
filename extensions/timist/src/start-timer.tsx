import { Action, ActionPanel, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { ApiError, createTimer, startTimer } from "./api/client";
import type { CreateTimerInput, Timer } from "./api/types";
import { ProjectTagFields } from "./components/ProjectTagFields";
import { useProjects, useTags } from "./hooks";
import { ensureCacheOwner } from "./lib/cache";
import { showApiErrorToast, withRateLimitRetry } from "./lib/errors";
import { ProjectTagFormValues, projectTagParams } from "./lib/form";
import { refreshMenuBar } from "./lib/refresh";

interface StartTimerFormValues extends ProjectTagFormValues {
  title: string;
  notes: string;
}

export default function StartTimer() {
  ensureCacheOwner();
  const projects = useProjects();
  const tags = useTags();
  const [projectValue, setProjectValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A create that used project_name/tag_names returns the resolved objects —
  // merge them into the cached lists (prepend, dedupe by id), no extra GET.
  async function mergeCaches(timer: Timer) {
    if (timer.project) {
      const project = timer.project;
      const merged = [project, ...(projects.data ?? []).filter((existing) => existing.id !== project.id)];
      await projects.mutate(Promise.resolve(merged), { shouldRevalidateAfter: false });
    }
    if (timer.tags.length > 0) {
      const merged = [
        ...timer.tags,
        ...(tags.data ?? []).filter((existing) => !timer.tags.some((tag) => tag.id === existing.id)),
      ];
      await tags.mutate(Promise.resolve(merged), { shouldRevalidateAfter: false });
    }
  }

  async function retryStart(timer: Timer, toast: Toast) {
    try {
      await withRateLimitRetry(() => startTimer(timer.id));
      await toast.hide();
      await showHUD(`▶ ${timer.title}`);
      await refreshMenuBar();
    } catch (error) {
      await showApiErrorToast(error);
    }
  }

  async function onSubmit(values: StartTimerFormValues) {
    const title = values.title.trim();
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const input: CreateTimerInput = { title, ...projectTagParams(values) };
      const notes = values.notes.trim();
      if (notes) input.notes = notes;

      const timer = await withRateLimitRetry(() => createTimer(input));
      await mergeCaches(timer);

      try {
        await withRateLimitRetry(() => startTimer(timer.id));
      } catch (error) {
        // The block exists and is visible in Show Status either way.
        await showToast({
          style: Toast.Style.Failure,
          title: "Block created but not started",
          message: error instanceof ApiError ? error.message : undefined,
          primaryAction: {
            title: "Retry Start",
            onAction: (toast) => {
              void retryStart(timer, toast);
            },
          },
        });
        return;
      }

      await showHUD(`▶ ${timer.title}`);
      await refreshMenuBar();
    } catch (error) {
      // 403 keeps the form open with an Upgrade action; free-plan title-only
      // timers still work.
      await showApiErrorToast(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={projects.isLoading || tags.isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Play}
            onSubmit={(values: StartTimerFormValues) => void onSubmit(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="What are you working on?" autoFocus />
      <ProjectTagFields
        projects={projects.data ?? []}
        tags={tags.data ?? []}
        projectValue={projectValue}
        onProjectChange={setProjectValue}
      />
      <Form.TextArea id="notes" title="Notes" placeholder="Optional notes" />
    </Form>
  );
}
