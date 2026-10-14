import { useEffect, useRef, useState } from "react";
import { JSX } from "react/jsx-runtime";
import { Action, ActionPanel, Detail, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { getFolders } from "../utils/entry-helper";
import { KeePassLoader } from "../utils/keepass-loader";

const ROOT_GROUP = "root";
const GROUP_PREFIX = "group:";

interface CreateEntryFormValues {
  title: string;
  group: string;
  username: string;
  password: string;
  url: string;
}

export default function CreateEntryForm({
  setIsUnlocked,
}: {
  setIsUnlocked: (isUnlocked: boolean) => void;
}): JSX.Element {
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>();
  const isMounted = useRef(true);
  const isSavingRef = useRef(false);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      // Form state is released on unmount; no form values are persisted separately.
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasLoadError(false);

    KeePassLoader.refreshEntriesCache()
      .then((entries) => {
        if (active) {
          setFolders(getFolders(entries));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setHasLoadError(true);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const { handleSubmit, itemProps, setValue } = useForm<CreateEntryFormValues>({
    initialValues: { title: "", group: ROOT_GROUP, username: "", password: "", url: "" },
    validation: {
      title: (value) => {
        if (!value || !value.trim()) return "Enter a title.";
        if (value.includes("/") || /[\r\n]/.test(value)) return "The title cannot contain / or a line break.";
      },
      group: (value) => {
        if (
          value !== ROOT_GROUP &&
          (!value?.startsWith(GROUP_PREFIX) || !folders.includes(value.slice(GROUP_PREFIX.length)))
        ) {
          return "Choose an available group.";
        }
      },
      password: (value) => {
        if (!value) return "Enter a password.";
        if (/[\r\n]/.test(value)) return "The password cannot contain a line break.";
      },
    },
    onSubmit: async (values) => {
      if (isSavingRef.current || hasSavedRef.current || !isMounted.current) return false;
      isSavingRef.current = true;
      setIsSaving(true);

      let result;
      try {
        result = await KeePassLoader.createEntry({
          groupPath: values.group === ROOT_GROUP ? "" : values.group.slice(GROUP_PREFIX.length),
          title: values.title,
          username: values.username,
          password: values.password,
          url: values.url,
        });
      } catch (error) {
        isSavingRef.current = false;
        if (isMounted.current) {
          setIsSaving(false);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Create Entry",
            message: error instanceof Error ? error.message : "The entry could not be saved.",
          }).catch(() => undefined);
        }
        return false;
      }

      // Once saved, feedback or navigation failures must never allow another create.
      hasSavedRef.current = true;
      isSavingRef.current = false;
      if (isMounted.current) {
        setValue("password", "");
        setIsSaving(false);
        const message = result.cacheInvalidated
          ? "Reopen Search to see the new entry."
          : "Entry saved. Reopen Search to refresh the list.";
        setSavedMessage(message);

        await showToast({ style: Toast.Style.Success, title: "Entry Saved", message }).catch(() => undefined);
        if (isMounted.current) {
          await popToRoot().catch(() => undefined);
        }
      }
      return true;
    },
  });

  const closeForm = async () => {
    setValue("password", "");
    try {
      await popToRoot();
    } catch {
      if (isMounted.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Close Form",
          message: "Press Escape to close this command.",
        }).catch(() => undefined);
      }
    }
  };

  if (isLoading) {
    return <Detail isLoading markdown="Loading groups…" />;
  }

  if (hasLoadError) {
    return (
      <Detail
        markdown="# Could Not Load Groups\n\nCheck your database and KeePassXC installation, then retry or unlock again."
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => setLoadAttempt((attempt) => attempt + 1)} />
            <Action title="Unlock Database" onAction={() => setIsUnlocked(false)} />
          </ActionPanel>
        }
      />
    );
  }

  if (savedMessage) {
    return (
      <Detail
        markdown={`# Entry Saved\n\n${savedMessage}`}
        actions={
          <ActionPanel>
            <Action title="Done" onAction={closeForm} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isSaving}
      enableDrafts={false}
      actions={
        <ActionPanel>
          {!isSaving && (
            <>
              <Action.SubmitForm title="Create Entry" onSubmit={handleSubmit} />
              <Action title="Cancel" onAction={closeForm} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="Close this database in KeePassXC before saving. Avoid other writers." />
      <Form.TextField title="Title" autoFocus {...itemProps.title} />
      <Form.Dropdown title="Group" {...itemProps.group}>
        <Form.Dropdown.Item title="Root" value={ROOT_GROUP} />
        {folders.map((folder) => (
          <Form.Dropdown.Item key={folder} title={folder} value={`${GROUP_PREFIX}${folder}`} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Only groups with entries visible in Search are listed. Empty groups are not shown." />
      <Form.Separator />
      <Form.TextField title="Username" {...itemProps.username} />
      <Form.PasswordField title="Password" storeValue={false} {...itemProps.password} />
      <Form.TextField title="URL" {...itemProps.url} />
      {isSaving && (
        <Form.Description text="Saving entry… If you close this command, check the database before trying again." />
      )}
    </Form>
  );
}
