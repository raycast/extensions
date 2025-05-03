import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  Toast,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { authFetch, useAuthFetch } from "./lib/hooks/use-auth-fetch";
import { SnippetsResponse } from "./lib/types/snippets-response";
import { isForbidden } from "./lib/utils/errors";
import AuthError from "./components/auth-error";
import { labelIcon } from "./lib/utils/snippet-utils";
import { Label } from "./lib/types/label";
import { getFiletype } from "./lib/utils/file-types";
import { CONFIG } from "./config";

interface SnippetValues {
  title: string;
  description: string;
  filename: string;
  content: string;
  private: boolean;
  library: string;
  labels: string[];
}

function LabelItem({ label }: { label: Label }) {
  return <Form.TagPicker.Item key={label.guid} title={label.title} value={label.guid} icon={labelIcon(label)} />;
}

function UpgradeMessage() {
  const url = `${CONFIG.appURL}/enter?action=view_plans`;
  const message = `
  # Private snippets limit reached
  [Upgrade your Cacher plan](${url}) to create more private snippets and gain access to Pro/Team features.
  `;

  return (
    <Detail
      markdown={message}
      actions={
        <ActionPanel>
          <Action.Open title="View Cacher Plans" target={url} />
        </ActionPanel>
      }
    />
  );
}

export default function CreateSnippet(props: LaunchProps<{ draftValues: SnippetValues }>) {
  const {
    data: response,
    error,
    isLoading,
  } = useAuthFetch<SnippetsResponse>("snippets", {
    keepPreviousData: false,
  });

  const { draftValues } = props;

  const { push } = useNavigation();

  const [titleError, setTitleError] = useState<string | undefined>();
  const [filenameError, setFilenameError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();
  const [library, setLibrary] = useState<string>(draftValues?.library ?? "personal");
  const [labels, setLabels] = useState<string[]>(draftValues?.labels ?? []);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const personalLibrary = response?.personalLibrary;
  const teams = useMemo(() => response?.teams ?? [], [response?.teams]);

  const libraryLabels = useMemo(() => {
    return library === "personal"
      ? personalLibrary?.labels
      : teams.find((team) => team.guid === library)?.library.labels;
  }, [library, personalLibrary, teams]);

  if (isForbidden(error)) {
    return <AuthError />;
  }

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropFilenameErrorIfNeeded() {
    if (filenameError && filenameError.length > 0) {
      setFilenameError(undefined);
    }
  }

  function dropContentErrorIfNeeded() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  async function handleSubmit(values: SnippetValues) {
    const libraryGuid =
      values.library === "personal" ? personalLibrary?.guid : teams.find((team) => team.guid === library)?.library.guid;

    const requestBody = {
      libraryGuid,
      labels: values.labels,
      snippet: {
        title: values.title,
        description: values.description,
        isPrivate: values.private,
        files: [
          {
            filename: values.filename,
            filetype: getFiletype(values.filename),
            content: values.content,
            isShared: false,
          },
        ],
      },
    };

    setIsSubmitting(true);
    const response = await authFetch("snippets", { method: "POST", data: requestBody });

    if (response.status === 200) {
      showToast({
        style: Toast.Style.Success,
        title: "Snippet saved",
        message: `"${values.title}" was saved.`,
      });
      popToRoot();
    } else {
      const error = (await response.json()) as { message: string };

      if (error.message.includes("does not allow user to create public snippet")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save",
          message: "Cannot create public snippets in this team library.",
        });
      } else if (error.message.includes("has reached private snippet limit")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Reached plan limit",
          message: "Please upgrade Cacher to create more private snippets.",
        });
        push(<UpgradeMessage />);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save",
          message: "Please try again.",
        });
      }
    }

    setIsSubmitting(false);
  }

  function handleChangeLibrary(guid: string) {
    // Remove any selected labels
    setLabels([]);
    setLibrary(guid);
  }

  return (
    <Form
      enableDrafts
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Snippet" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Snippet Title"
        placeholder="Useful commands for project"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTitleError("Snippet title is required");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
        defaultValue={draftValues?.title ?? ""}
      />
      <Form.TextArea
        id="description"
        title="Description"
        enableMarkdown
        placeholder="(optional)"
        defaultValue={draftValues?.description ?? ""}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        placeholder="useful-commands.sh"
        onChange={dropFilenameErrorIfNeeded}
        error={filenameError}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setFilenameError("Filename is required");
          } else {
            dropFilenameErrorIfNeeded();
          }
        }}
        defaultValue={draftValues?.filename ?? ""}
      />
      <Form.TextArea
        id="content"
        error={contentError}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setContentError("File content is required");
          } else {
            dropContentErrorIfNeeded();
          }
        }}
        title="File content"
        defaultValue={draftValues?.content ?? ""}
      />
      <Form.Checkbox id="private" label="Private" defaultValue={draftValues?.private ?? true} />
      <Form.Dropdown id="library" title="Library" value={library} onChange={handleChangeLibrary}>
        <Form.Dropdown.Item value="personal" title="Personal" icon={Icon.Person} />
        {teams.map((team) => (
          <Form.Dropdown.Item value={team.guid} key={team.guid} title={team.name} icon={Icon.Building} />
        ))}
      </Form.Dropdown>
      {libraryLabels && libraryLabels.length && (
        <Form.TagPicker id="labels" title="Labels" value={labels} onChange={setLabels}>
          {libraryLabels?.map((label) => (
            <LabelItem label={label} key={label.guid} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
