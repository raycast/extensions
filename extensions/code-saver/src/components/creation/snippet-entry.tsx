import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { upsertSnippet, useDataFetch } from "../../lib/hooks/use-data-ops";
import { Label, Library } from "../../lib/types/dto";
import InitError from "../init/init-error";
import { SnippetMarkdownFormatType } from "../../lib/constants/db-name";
import { useState } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { labelIcon } from "../../lib/utils/snippet-utils";
import UpsertLibraryEntry from "./library-entry";
import UpsertLabelEntry from "./label-entry";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { process } from "../../lib/utils/tldr-linter";

export interface SnippetValues {
  snippetUUID?: string;
  title: string;
  fileName: string;
  content: string;
  formatType: SnippetMarkdownFormatType;
  libraryUUID: string;
  labelsUUID: string[];
  onUpdateSuccess?: () => void;
}

export default function UpsertSnippetEntry({ props }: { props?: SnippetValues }) {
  const {
    isLoading: isLibLoading,
    data: allLibs,
    error: loadLibErr,
    revalidate: revalidateLib,
  } = useDataFetch<Library>("library");
  const {
    isLoading: isLabelLoading,
    data: allLabels,
    error: loadLabelErr,
    revalidate: revalidateLabel,
  } = useDataFetch<Label>("label");

  const isLoading = isLibLoading || isLabelLoading;
  const [labelsUUID, setLabels] = useState<string[]>(props?.labelsUUID ?? []);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [fileNameError, setFileNameError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();
  const [libraryError, setLibraryError] = useState<string | undefined>();
  const [libraryUUID, setLibraryUUID] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { push, pop } = useNavigation();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropFileNameErrorIfNeeded() {
    if (fileNameError && fileNameError.length > 0) {
      setFileNameError(undefined);
    }
  }

  function dropContentErrorIfNeeded() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  function dropLibraryErrorIfNeeded() {
    if (libraryError && libraryError.length > 0) {
      setLibraryError(undefined);
    }
  }

  async function handleSubmit(values: SnippetValues) {
    if (values.title.length === 0) {
      setTitleError("Snippet title is required");
      return;
    }
    if (values.fileName.length === 0) {
      setFileNameError("Filename is required");
      return;
    }
    if (values.content.length === 0) {
      setContentError("File content is required");
      return;
    }
    if (values.formatType == "tldr") {
      const res = process("Some thing wrong with your input", values.content, true, false);
      console.log(res);
      if (!res.success) {
        push(
          <InitError
            errMarkdown={`# There are some syntax error for your input.
You can visit following link to have one look about the syntax of \`tldr\`.

Ref link: https://github.com/tldr-pages/tldr/blob/main/contributing-guides/style-guide.md

We found the error here:
\`\`\`
${res.errorMsg.map((l) => (l.endsWith("\n") ? l : l + "\n")).join("")}
\`\`\`
`}
          />
        );
        return;
      }
    }

    setIsSubmitting(true);
    const response = await upsertSnippet({
      uuid: props?.snippetUUID,
      title: values.title,
      fileName: values.fileName,
      content: values.content,
      formatType: values.formatType,
      libraryUUID: values.libraryUUID,
      labelsUUID: values.labelsUUID,
    });

    if (response === undefined) {
      showToast({
        style: Toast.Style.Success,
        title: "Snippet saved",
        message: `"${values.title}" was saved.`,
      });
      if (props?.snippetUUID !== undefined) {
        pop();
        if (props.onUpdateSuccess) {
          props.onUpdateSuccess();
        }
      } else {
        popToRoot();
      }
    } else {
      push(<InitError errMarkdown={response} />);
    }

    setIsSubmitting(false);
  }

  const errMsg = (function (err) {
    if (err !== undefined) {
      return `# Something wrong
Some errors happened when fetching labels or libraries from database. 
Error details are as follows:
\`\`\`
${err instanceof Error ? err.stack : String(err)}
\`\`\`
`;
    }
    return null;
  })(loadLabelErr || loadLibErr);

  return errMsg ? (
    <InitError errMarkdown={errMsg} />
  ) : (
    <Form
      enableDrafts={props?.snippetUUID === undefined}
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} title="Save Snippet" />
          <Action.Push
            icon={Icon.Plus}
            target={<UpsertLibraryEntry onSuccess={() => revalidateLib()} />}
            title="Create Library"
          />
          <Action.Push
            icon={Icon.Plus}
            target={<UpsertLabelEntry onSuccess={() => revalidateLabel()} />}
            title="Create Label"
          />
          <Action.Push
            icon={Icon.Brush}
            target={
              <UpsertLibraryEntry
                uuid={libraryUUID}
                name={allLibs?.filter((lib) => lib.uuid == libraryUUID)[0]?.name ?? ""}
                onSuccess={() => revalidateLib()}
              />
            }
            title="Update Selected Library"
          />
        </ActionPanel>
      }
      navigationTitle={props?.snippetUUID ? "Update Snippet" : "Create New Snippet"}
    >
      <Form.TextField
        id="title"
        title="Snippet Title"
        placeholder="Give one brief description for this snippet"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTitleError("Snippet title is required");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
        autoFocus={true}
        defaultValue={props?.title ?? ""}
        info="Title is the summary of usage of this snippet"
      />
      <Form.TextField
        id="fileName"
        title="Filename"
        placeholder="useful-commands.sh"
        onChange={dropFileNameErrorIfNeeded}
        error={fileNameError}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setFileNameError("Filename is required");
          } else {
            dropFileNameErrorIfNeeded();
          }
        }}
        defaultValue={props?.fileName ?? ""}
        info="File name will be used to export snippet"
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
        defaultValue={props?.content ?? ""}
      />
      <Form.Dropdown
        id="formatType"
        title="Snippet Content Format"
        defaultValue={props?.formatType}
        info="You can fill anything you want for freestyle format. There will be format check for tldr one."
      >
        <Form.Dropdown.Item value="freestyle" key="freestyle" title="Freestyle" icon={Icon.Person} />
        <Form.Dropdown.Item value="tldr" key="tldr" title="TLDR" icon={Icon.BulletPoints} />
      </Form.Dropdown>
      <Form.Dropdown
        id="libraryUUID"
        title="Library"
        error={libraryError}
        defaultValue={props?.libraryUUID}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setLibraryError("Library is required");
          } else {
            dropLibraryErrorIfNeeded();
          }
        }}
        onChange={setLibraryUUID}
        info="Library is the collection or album of snippets. `Cmd + K` to create new one."
      >
        {allLibs?.map((lib) => (
          <Form.Dropdown.Item value={lib.uuid} key={lib.uuid} title={lib.name} icon={getAvatarIcon(lib.name)} />
        ))}
      </Form.Dropdown>
      {allLabels && (
        <Form.TagPicker
          id="labelsUUID"
          title="Labels"
          value={labelsUUID}
          onChange={setLabels}
          info="Tag is used to classify snippets. `Cmd + K` to create new one."
        >
          {allLabels?.map((label) => (
            <Form.TagPicker.Item key={label.uuid} title={label.title} value={label.uuid} icon={labelIcon(label)} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
