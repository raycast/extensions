import { Action, ActionPanel, Clipboard, Detail, Form, Icon, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import AuthorizedView from "./components/AuthorizedView";
import WorkItemDetail from "./components/WorkItemDetail";
import ChangeWorkspaceAction from "./components/actions/ChangeWorkspaceAction";
import { getWorkItemByIdentifier } from "./api/work-items";
import { assertReferenceInWorkspace, parseWorkItemReference } from "./helpers/identifiers";
import { describePlaneError, getErrorStatus } from "./helpers/errors";
import { planeClient } from "./api/auth";

type Resolved = { projectId: string; workItemId: string };

/** Resolves free text (argument, clipboard, or form) to a work item. */
async function resolveWorkItem(text: string): Promise<Resolved> {
  const reference = parseWorkItemReference(text);
  if (!reference) {
    throw new Error(`"${text.trim().slice(0, 60)}" is not a work item ID like ENG-123 or a Plane work item URL.`);
  }
  // A link from another workspace would otherwise resolve ENG-123 (or fail) in the current one.
  assertReferenceInWorkspace(reference, planeClient?.workspaceSlug);
  if (reference.type === "uuid") {
    return { projectId: reference.projectId, workItemId: reference.workItemId };
  }
  const workItem = await getWorkItemByIdentifier(reference.projectIdentifier, reference.sequenceId);
  if (!workItem.id || !workItem.project) {
    throw new Error(`${reference.projectIdentifier}-${reference.sequenceId} not found.`);
  }
  return { projectId: workItem.project, workItemId: workItem.id };
}

function OpenWorkItemForm({
  error,
  defaultValue,
  onSubmit,
}: {
  error?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
}) {
  const [fieldError, setFieldError] = useState<string | undefined>(error);
  return (
    <Form
      navigationTitle="Open Work Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Work Item"
            icon={Icon.ArrowRight}
            onSubmit={(values: { identifier: string }) => {
              if (!parseWorkItemReference(values.identifier)) {
                setFieldError("Enter an ID such as ENG-123 or paste a Plane URL");
                return;
              }
              onSubmit(values.identifier);
            }}
          />
          <ChangeWorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="identifier"
        title="Work Item"
        placeholder="ENG-123 or https://app.plane.so/acme/browse/ENG-123"
        defaultValue={defaultValue}
        error={fieldError}
        onChange={() => setFieldError(undefined)}
      />
      {error ? <Form.Description title="Can't Open" text={error} /> : null}
    </Form>
  );
}

function OpenWorkItem({ identifier }: { identifier?: string }) {
  const [input, setInput] = useState<string | undefined>(identifier?.trim() || undefined);

  const { data, isLoading, error } = usePromise(
    async (text: string | undefined) => {
      // No argument: try the clipboard. Only use it when it actually looks like a work item.
      const value = text ?? (await Clipboard.readText())?.trim();
      if (!value || !parseWorkItemReference(value)) {
        return { value, resolved: undefined };
      }
      return { value, resolved: await resolveWorkItem(value) };
    },
    [input],
    { onError: () => undefined },
  );

  if (isLoading && !data) {
    return <Detail isLoading markdown="" navigationTitle="Open Work Item" />;
  }

  if (data?.resolved && !error) {
    return (
      <WorkItemDetail
        slug={planeClient?.workspaceSlug ?? ""}
        projectId={data.resolved.projectId}
        workItemId={data.resolved.workItemId}
        mutateWorkItemList={() => {}}
      />
    );
  }

  const message = error
    ? getErrorStatus(error) === 404
      ? `${input ?? "That work item"} was not found in workspace "${planeClient?.workspaceSlug}".`
      : describePlaneError(error).message
    : input
      ? `"${input}" is not a work item ID.`
      : undefined;

  return <OpenWorkItemForm key={input} error={message} defaultValue={input} onSubmit={setInput} />;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenWorkItem }>) {
  return (
    <AuthorizedView>
      <OpenWorkItem identifier={props.arguments.identifier} />
    </AuthorizedView>
  );
}
