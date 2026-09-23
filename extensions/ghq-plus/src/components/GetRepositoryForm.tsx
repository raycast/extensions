import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { createGhqGetExecutor, getRepository, type GetOptions, type GetResult } from "../lib/get";
import { describeGetError, describeGetResult } from "../lib/get-feedback";
import { createGhqExecutor } from "../lib/ghq";
import { detectGitHubRepository, normalizeRepositoryInput, validateRepositoryInput } from "../lib/repository-input";
import { GhqPathNotConfigured } from "./EmptyState";
import { RepositoryResultList } from "./RepositoryResultList";
import { useGhqPreferences } from "./useGhqPreferences";

type FormValues = { repository: string; ssh: boolean };

// Long enough for Raycast to have put the form back on screen after a pop, short enough to beat the next key press.
const REFOCUS_DELAY_MS = 100;

/**
 * Form that clones a repository with `ghq get` and then lists what it produced.
 * `onGet` is called once a run has succeeded, whether or not the form is still on screen.
 */
export function GetRepositoryForm({ onGet }: { onGet?: () => void }) {
  // Neither application is required here: without them the result list still offers Show in Finder and Copy Path.
  const { preferences, openers, ghqBinary } = useGhqPreferences();

  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  // A ref, because a second submit can arrive before the isLoading state has been committed.
  const isRunning = useRef(false);
  // The clone outlives the form when the user leaves: a result list must not be pushed on top of another view then.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { handleSubmit, itemProps, setValue, focus } = useForm<FormValues>({
    initialValues: { repository: "", ssh: preferences.cloneWithSSH ?? false },
    validation: { repository: (value) => validateRepositoryInput(value ?? "") },
    async onSubmit(values) {
      if (!ghqBinary || isRunning.current) {
        return;
      }
      isRunning.current = true;
      setIsLoading(true);
      try {
        const repository = normalizeRepositoryInput(values.repository);
        const result = await getWithToast(ghqBinary, { repository, ssh: values.ssh });
        if (result) {
          onGet?.();
        }
        if (result && result.repositories.length > 0 && isMounted.current) {
          // Raycast does not hand the keyboard focus back to a form it returns to: with no focused item Escape goes
          // nowhere (system beep) until the window is clicked. So the field is focused before the form gets covered,
          // in case the focus was lost during the clone (e.g. to an SSH agent prompt), and again once it is back.
          focus("repository");
          push(<RepositoryResultList repositories={result.repositories} openers={openers} />, () => {
            // onPop runs before the form is on screen again, and a focus request for a covered form is lost.
            setTimeout(() => {
              if (isMounted.current) {
                focus("repository");
              }
            }, REFOCUS_DELAY_MS);
          });
        }
      } finally {
        isRunning.current = false;
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        const detected = text === undefined ? undefined : detectGitHubRepository(text);
        if (detected !== undefined) {
          // The form is usable while the clipboard is being read: never overwrite what has been typed meanwhile.
          setValue("repository", (current) => (current ? current : detected));
        }
      })
      .catch(() => {
        // The auto-fill is a convenience, the form works without it.
      });
  }, [setValue]);

  if (!ghqBinary) {
    return <GhqPathNotConfigured />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Repository" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Repository"
        placeholder="https://github.com/owner/repo, owner/repo, or any URL ghq accepts"
        {...itemProps.repository}
      />
      <Form.Checkbox label="Clone with SSH" {...itemProps.ssh} />
    </Form>
  );
}

/** Runs `ghq get` behind a cancellable toast and resolves with its result, or `undefined` when it did not succeed. */
async function getWithToast(binary: string, options: GetOptions): Promise<GetResult | undefined> {
  const controller = new AbortController();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Getting repository",
    message: options.repository,
    primaryAction: { title: "Cancel", onAction: () => controller.abort() },
  });

  try {
    const result = await getRepository(
      { list: createGhqExecutor(binary), get: createGhqGetExecutor(binary) },
      options,
      controller.signal,
    );
    const feedback = describeGetResult(result, options.repository);
    toast.primaryAction = undefined;
    toast.style = Toast.Style.Success;
    toast.title = feedback.title;
    toast.message = feedback.message;
    return result;
  } catch (error) {
    const { title, message, logs } = describeGetError(error, options.repository);
    toast.primaryAction = logs === undefined ? undefined : { title: "Copy Logs", onAction: () => copyLogs(logs) };
    toast.style = Toast.Style.Failure;
    toast.title = title;
    toast.message = message;
    return undefined;
  }
}

async function copyLogs(logs: string): Promise<void> {
  await Clipboard.copy(logs);
  await showToast({ style: Toast.Style.Success, title: "Copied logs to clipboard" });
}
