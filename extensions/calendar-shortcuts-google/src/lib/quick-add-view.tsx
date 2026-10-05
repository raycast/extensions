import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CalendarSetupView } from "./calendar-setup-view";
import { CalendarRole, isCalendarSetupComplete } from "./calendar-settings";
import {
  MenuBarDateStyle,
  readMenuBarDisplaySettings,
} from "./menu-bar-display-settings";
import { QuickAddArgs, runQuickAdd } from "./quick-add";

export type QuickAddLaunchProps = LaunchProps<{
  arguments: QuickAddArgs;
  draftValues: QuickAddArgs;
}>;

type Props = {
  defaultCalendarRole: CalendarRole;
  defaultCalendarFallbackName: string;
  commandTitle: string;
  launchProps: QuickAddLaunchProps;
};

type FormValues = {
  title: string;
  when: string;
  details: string;
};

export function QuickAddView({
  defaultCalendarRole,
  defaultCalendarFallbackName,
  commandTitle,
  launchProps,
}: Props) {
  const draftValues = launchProps.draftValues;
  const openedFromDraft = Boolean(draftValues);

  // Raycast passes saved form values through launchProps.draftValues when the
  // user opens a Draft. Normal command launches still use launch arguments.
  const initial: QuickAddArgs = draftValues ?? launchProps.arguments;

  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [dateStyle, setDateStyle] = useState<MenuBarDateStyle>("day-month");
  const [error, setError] = useState<string | null>(null);
  const [editRequested, setEditRequested] = useState(openedFromDraft);
  const [formValues, setFormValues] = useState<QuickAddArgs>(initial);
  const [isSubmitting, setIsSubmitting] = useState(!openedFromDraft);
  const autoSubmitted = useRef(openedFromDraft);

  async function submit(values: QuickAddArgs) {
    setFormValues(values);
    setError(null);
    setEditRequested(false);
    setIsSubmitting(true);

    try {
      const result = await runQuickAdd(
        defaultCalendarRole,
        defaultCalendarFallbackName,
        values,
      );

      if (result === "cancelled") {
        setEditRequested(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add event",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void Promise.all([
      isCalendarSetupComplete(),
      readMenuBarDisplaySettings(),
    ]).then(([complete, displaySettings]) => {
      setSetupComplete(complete);
      setDateStyle(displaySettings.dateStyle);
    });
  }, []);

  useEffect(() => {
    // Drafts must open as forms, not auto-submit. Raycast has already restored
    // the unfinished values for the user to review.
    if (openedFromDraft || !setupComplete || autoSubmitted.current) {
      return;
    }

    autoSubmitted.current = true;
    void submit(initial);

    // Launch values are fixed for this invocation.
  }, [setupComplete]);

  if (setupComplete === null) {
    return (
      <Detail
        navigationTitle={commandTitle}
        isLoading
        markdown="Loading DayCal…"
      />
    );
  }

  if (!setupComplete) {
    return <CalendarSetupView onComplete={() => setSetupComplete(true)} />;
  }

  // Normal quick-add launches keep the compact "Adding event…" flow.
  // Draft launches and correction/edit requests go directly to the form.
  if (!error && !editRequested) {
    return (
      <Detail
        navigationTitle={commandTitle}
        isLoading={isSubmitting}
        markdown={isSubmitting ? "Adding event…" : "Event added."}
      />
    );
  }

  return (
    <Form
      navigationTitle={commandTitle}
      enableDrafts
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={editRequested ? "Add Event" : "Try Again"}
            onSubmit={(values: FormValues) =>
              submit({
                title: values.title,
                when: values.when,
                details: values.details || undefined,
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={error ? "Fix this input" : "Edit event"}
        text={
          error
            ? `❌ ${error}`
            : openedFromDraft
              ? "Draft restored. Update anything below, then add the event."
              : "Update anything below, then try again."
        }
      />

      <Form.TextField
        id="title"
        title="Title"
        defaultValue={formValues.title || ""}
        placeholder="Event title"
      />

      <Form.TextField
        id="when"
        title="When"
        defaultValue={formValues.when || ""}
        placeholder={
          dateStyle === "month-day"
            ? "tomorrow / Friday / 09/15 / next Thu 5pm"
            : "tomorrow / Friday / 15/09 / next Thu 5pm"
        }
      />

      <Form.TextField
        id="details"
        title="Duration / Location"
        defaultValue={formValues.details || ""}
        placeholder="3d / 45m @ Location / Zoom / URL"
      />

      <Form.Description
        title="Examples"
        text={
          dateStyle === "month-day"
            ? "All day: tomorrow · Friday · 09/15 · 3d. Timed: tomorrow 6pm · 09/15 5pm · 45m @ Office."
            : "All day: tomorrow · Friday · 15/09 · 3d. Timed: tomorrow 6pm · 15/09 5pm · 45m @ Office."
        }
      />
    </Form>
  );
}
