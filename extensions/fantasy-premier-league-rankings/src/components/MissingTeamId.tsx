import { Action, ActionPanel, Form, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import type { ReactElement } from "react";
import { fetchEntry, FplError, SITE } from "../api/fpl";
import { getTeamId, parseTeamId, saveTeamId } from "../hooks";

export function PreferencesAction() {
  return (
    <Action
      title="Change Team ID"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      onAction={openExtensionPreferences}
    />
  );
}

/** Renders the command for the user's Team ID, or a form asking for it when none is set. */
export function RequireTeamId({ children }: { children: (teamId: number) => ReactElement }) {
  const { data: teamId, isLoading, revalidate } = usePromise(getTeamId);
  if (teamId) return children(teamId);
  if (isLoading) return <List isLoading />;
  return <TeamIdForm onSave={revalidate} />;
}

/** Empty view for a "My squad" filter before a Team ID is set, with the Team ID form one Enter away. */
export function SquadNeedsTeamId({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();
  return (
    <List.EmptyView
      icon={Icon.Person}
      title="Set your FPL Team ID to see your squad"
      actions={
        <ActionPanel>
          <Action.Push
            title="Set Team ID"
            icon={Icon.Gear}
            target={
              <TeamIdForm
                onSave={() => {
                  pop();
                  onSave();
                }}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}

function TeamIdForm({ onSave }: { onSave: () => void }) {
  const { handleSubmit, itemProps, setValidationError } = useForm<{ teamId: string }>({
    async onSubmit(values) {
      const teamId = parseTeamId(values.teamId);
      if (!teamId) return;
      try {
        await fetchEntry(teamId);
      } catch (error) {
        if (error instanceof FplError && error.status === 404) {
          setValidationError("teamId", `No FPL team with ID ${teamId}`);
        } else {
          await showFailureToast(error, { title: "Could not check the Team ID" });
        }
        return;
      }
      await saveTeamId(teamId);
      onSave();
    },
    validation: {
      teamId: (value) => (parseTeamId(value) ? undefined : "Enter the number after /entry/, or paste the whole URL"),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Team ID" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open FPL Website" url={SITE} />
        </ActionPanel>
      }
    >
      <Form.Description text="Open fantasy.premierleague.com, go to Points, and copy the number after /entry/ in the URL. Pasting the whole URL works too." />
      <Form.TextField title="Team ID" placeholder="1234567" {...itemProps.teamId} />
    </Form>
  );
}

export function EntryNotFound({ entryId }: { entryId: number }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.QuestionMarkCircle}
        title={`No FPL team with ID ${entryId}`}
        description="Check the Team ID in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
