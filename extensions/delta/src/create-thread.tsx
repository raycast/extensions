import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, popToRoot } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { withDelta } from "./components/with-delta";
import { createThread, listOrganizations } from "./lib/delta";
import { openThreadInDelta, runWithToast, showDeltaFailure } from "./lib/feedback";
import { Visibility } from "./lib/types";

interface FormValues {
  prompt: string;
  organizationId: string;
  // Form.Dropdown values are plain strings; narrowed to Visibility on submit.
  visibility: string;
}

/** Set by Create Thread from Answer, which opens this command with the answer as the prompt. */
interface LaunchContext {
  prompt?: string;
}

function CreateThread(props: LaunchProps<{ draftValues: Partial<FormValues>; launchContext: LaunchContext }>) {
  const { draftValues, fallbackText, launchContext } = props;
  const { defaultVisibility } = getPreferenceValues<Preferences.CreateThread>();
  const { data: organizations, isLoading } = useCachedPromise(listOrganizations, [], {
    // The form still works without the list: Delta then uses its current organization.
    onError: (error) => showDeltaFailure(error, "Couldn't load Delta organizations"),
  });

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      // A prompt handed over on launch is what the user just asked for, so it wins over an older draft.
      prompt: launchContext?.prompt ?? draftValues?.prompt ?? fallbackText ?? "",
      organizationId: draftValues?.organizationId ?? "",
      visibility: draftValues?.visibility ?? defaultVisibility,
    },
    validation: {
      prompt: FormValidation.Required,
    },
    async onSubmit(form) {
      const created = await runWithToast(
        { progress: "Creating thread", success: "Thread created", failure: "Couldn't create thread" },
        async () => {
          const threadId = await createThread({
            prompt: form.prompt.trim(),
            organizationId: form.organizationId || undefined,
            visibility: form.visibility as Visibility,
          });
          await openThreadInDelta({ id: threadId });
        },
      );
      if (created) {
        // Leave an empty form behind, not the prompt that was just used.
        await popToRoot({ clearSearchBar: true });
      }
    },
  });

  // Preselect the organization Delta currently uses once the list arrives.
  useEffect(() => {
    if (!organizations?.length) {
      return;
    }
    const isKnown = organizations.some((org) => org.id === values.organizationId);
    if (!isKnown) {
      setValue("organizationId", (organizations.find((org) => org.current) ?? organizations[0]).id);
    }
  }, [organizations]);

  const organizationName = organizations?.find((org) => org.id === values.organizationId)?.name;

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Thread" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Prompt"
        placeholder="Describe what the agent should work on"
        info="Delta saves the prompt as a draft. Review it and send it from Delta."
        enableMarkdown
        {...itemProps.prompt}
      />
      <Form.Separator />
      <Form.Dropdown
        title="Organization"
        placeholder="Search organizations"
        info="The organization that owns the thread"
        {...itemProps.organizationId}
      >
        {(organizations ?? []).map((org) => (
          <Form.Dropdown.Item key={org.id} value={org.id} title={org.name} icon={Icon.Building} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="General Access"
        placeholder="Search access options"
        info="Who can open the thread besides the people you invite. Delta's “Anyone with the Link” option is only in the app."
        {...itemProps.visibility}
      >
        <Form.Dropdown.Item value="private" title="Only People Invited" icon={Icon.Lock} />
        <Form.Dropdown.Item
          value="organization"
          title={organizationName ? `Everyone at ${organizationName}` : "Everyone in the Organization"}
          icon={Icon.Building}
        />
      </Form.Dropdown>
    </Form>
  );
}

export default withDelta(CreateThread, <Form isLoading />);
