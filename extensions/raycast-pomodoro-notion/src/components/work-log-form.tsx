import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  acquireWorkLogFormAudio,
  isWorkLogFormBlockingLoopAudio,
  stopLoopingAudio,
  syncAudioForSession,
} from "../lib/audio";
import { createWorkLogPage } from "../lib/notion";
import { describeNotionAuthGap, getNotionAuth, type NotionAuth } from "../lib/notion-auth";
import {
  clearSession,
  finishSessionAndContinue,
  getActualActiveMinutes,
  loadSession,
  saveSession,
  type PomodoroSession,
} from "../lib/pomodoro-state";
import { type FocusLevel, type PomodoroConfig } from "../lib/preferences";
import { syncTimerScheduler } from "../lib/timer-scheduler";

type FormValues = {
  note: string;
  focus: FocusLevel;
};

type WorkLogFormProps = {
  session: PomodoroSession;
  config: PomodoroConfig;
  onCompleted: (nextSession: PomodoroSession | null) => Promise<void>;
  submitTitle?: string;
  successMessage?: string;
  createNextSessionOnSubmit?: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { hour12: false });
}

export function WorkLogForm(props: WorkLogFormProps) {
  const {
    session,
    config,
    onCompleted,
    submitTitle = "Save Work Log and Start Break",
    successMessage = "Moved to the next break session.",
    createNextSessionOnSubmit = true,
  } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [auth, setAuth] = useState<NotionAuth | null>(null);
  const [authGapMessage, setAuthGapMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [focus, setFocus] = useState<FocusLevel>("Medium");
  const [savedTimeMinutes] = useState(() => getActualActiveMinutes(session, Date.now()));
  const { pop } = useNavigation();
  const submittedRef = useRef(false);

  useEffect(() => {
    async function preloadAuth() {
      setIsCheckingAuth(true);
      const resolvedAuth = await getNotionAuth();
      setAuth(resolvedAuth);
      setAuthGapMessage(resolvedAuth ? null : await describeNotionAuthGap());
      setIsCheckingAuth(false);
    }

    void preloadAuth();
  }, []);

  useEffect(() => {
    const releaseWorkLogAudio = acquireWorkLogFormAudio();

    return () => {
      releaseWorkLogAudio();

      if (submittedRef.current) {
        if (!createNextSessionOnSubmit) {
          void stopLoopingAudio();
        }
        return;
      }

      void (async () => {
        if (isWorkLogFormBlockingLoopAudio()) {
          return;
        }

        const activeSession = await loadSession();
        if (activeSession?.id === session.id) {
          await syncAudioForSession(activeSession, config);
        }
      })();
    };
  }, [config, createNextSessionOnSubmit, session]);

  async function submitWorkLog(values: FormValues) {
    const activeAuth = auth ?? (await getNotionAuth());
    if (!activeAuth) {
      const message = authGapMessage ?? (await describeNotionAuthGap());
      await showToast({
        style: Toast.Style.Failure,
        title: "Notion is not connected",
        message,
      });
      return;
    }

    setIsSubmitting(true);
    const endAt = new Date().toISOString();

    try {
      const timeMinutes = savedTimeMinutes;

      await createWorkLogPage({
        token: activeAuth.token,
        databaseId: activeAuth.databaseId,
        session,
        note: values.note.trim(),
        focus: values.focus,
        endAt,
        timeMinutes,
      });

      const nextSession = createNextSessionOnSubmit ? finishSessionAndContinue(session, config) : null;

      if (nextSession) {
        await saveSession(nextSession);
      } else {
        await clearSession();
      }

      await syncTimerScheduler(nextSession);
      await onCompleted(nextSession);
      await showToast({
        style: Toast.Style.Success,
        title: "Work log saved to Notion",
        message: successMessage,
      });
      submittedRef.current = true;
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save to Notion",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    await submitWorkLog(values);
  }

  async function submitWithFocus(focusLevel: FocusLevel) {
    if (isSubmitting) {
      return;
    }

    setFocus(focusLevel);
    await submitWorkLog({ note, focus: focusLevel });
  }

  return (
    <Form
      isLoading={isSubmitting || isCheckingAuth}
      navigationTitle={auth ? "Save Work Log" : "Notion is not connected"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {!auth ? (
            <Action
              title="Open Configure Notion"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => void launchCommand({ name: "configure-notion", type: LaunchType.UserInitiated })}
            />
          ) : null}
          <Action
            title="Save with High Focus"
            shortcut={{ modifiers: ["cmd"], key: "1" }}
            onAction={() => void submitWithFocus("High")}
          />
          <Action
            title="Save with Medium Focus"
            shortcut={{ modifiers: ["cmd"], key: "2" }}
            onAction={() => void submitWithFocus("Medium")}
          />
          <Action
            title="Save with Low Focus"
            shortcut={{ modifiers: ["cmd"], key: "3" }}
            onAction={() => void submitWithFocus("Low")}
          />
        </ActionPanel>
      }
    >
      {!auth && authGapMessage ? <Form.Description title="Notion" text={authGapMessage} /> : null}
      {auth ? (
        <Form.Description
          title="Notion"
          text={`Connected via ${auth.source === "oauth" ? "OAuth" : "Advanced preferences"}${auth.databaseTitle ? ` · ${auth.databaseTitle}` : ""}`}
        />
      ) : null}
      <Form.Description
        title="Session"
        text={`Started: ${formatDateTime(session.startedAt)}\nPlanned end: ${formatDateTime(session.plannedEndAt)}`}
      />
      <Form.Description
        title="Focus shortcuts"
        text="⌘1 = save as High / ⌘2 = Medium / ⌘3 = Low (your note is included)"
      />
      <Form.TextArea
        id="note"
        title="Work Note"
        placeholder="What did you work on during this session?"
        value={note}
        onChange={setNote}
      />
      <Form.Dropdown id="focus" title="Focus" value={focus} onChange={(newValue) => setFocus(newValue as FocusLevel)}>
        <Form.Dropdown.Item value="High" title="High" />
        <Form.Dropdown.Item value="Medium" title="Medium" />
        <Form.Dropdown.Item value="Low" title="Low" />
      </Form.Dropdown>
    </Form>
  );
}
