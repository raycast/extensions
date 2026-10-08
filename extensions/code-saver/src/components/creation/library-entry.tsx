import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { upsertLibrary, useDataFetch } from "../../lib/hooks/use-data-ops";
import { Library } from "../../lib/types/dto";
import InitError from "../init/init-error";
import { useState } from "react";

export interface LibraryValues {
  uuid?: string;
  name: string;
}

export default function UpsertLibraryEntry({
  uuid,
  name,
  onSuccess,
}: {
  uuid?: string;
  name?: string;
  onSuccess: () => void;
}) {
  const { isLoading, data: allLibs, error: loadLibErr } = useDataFetch<Library>("library");
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { push, pop } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  async function handleSubmit(values: LibraryValues) {
    if (values.name.length === 0) {
      setNameError("Library name is required");
      return;
    }
    setIsSubmitting(true);
    const response = await upsertLibrary({
      name: values.name,
      uuid,
    });

    if (response === undefined) {
      showToast({
        style: Toast.Style.Success,
        title: "Library saved",
        message: `"${values.name}" was saved.`,
      });
      onSuccess();
      pop();
    } else {
      push(<InitError errMarkdown={response} />);
    }

    setIsSubmitting(false);
  }

  const errMsg = loadLibErr
    ? `# Something wrong
Some errors happened when fetching libraries from database. 
Error details are as follows:
\`\`\`
${loadLibErr instanceof Error ? loadLibErr.stack : String(loadLibErr)}
\`\`\`
`
    : undefined;

  return errMsg ? (
    <InitError errMarkdown={errMsg} />
  ) : (
    <Form
      enableDrafts
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Library" />
        </ActionPanel>
      }
      navigationTitle={uuid ? "Update Library" : "Create New Library"}
    >
      <Form.TextField
        id="name"
        title="Library Name"
        placeholder="Give one unique name for snippet collection"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setNameError("Library name is required");
          } else if (
            allLibs !== undefined &&
            allLibs.filter((lib) => lib.name == event.target.value && lib.uuid !== uuid).length > 0
          ) {
            setNameError("Library name is duplicated");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
        autoFocus={true}
        defaultValue={name ?? ""}
      />
    </Form>
  );
}
