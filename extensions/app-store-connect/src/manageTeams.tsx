import { List, ActionPanel, Action, Color, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useTeams, Team, keyDisplayName } from "./Model/useTeams";
import { API_KEYS_URL } from "./Utils/appStoreConnect";
import { isSameCredential } from "./Utils/credentials";
import { showFailureToast } from "@raycast/utils";
import { confirmAlert, Alert } from "@raycast/api";
import AddTeam from "./Components/AddTeam";
import RenameKey from "./Components/RenameKey";

export default function Command() {
  // Rendered straight from the hook, with no mirrored copy. A local `useState` shadow of
  // this list is how a pushed form's callback captured an EMPTY array — the command
  // renders before storage has been read — and adding a key then replaced the real list
  // with just that one key until the command was relaunched.
  const { isLoading, teams, deleteTeam, deleteAllTeams, currentTeam, selectCurrentTeam, renameTeam, reload } =
    useTeams();

  // "Are you sure?" told you nothing about the blast radius, and "Delete Team" reads as
  // deleting the team at Apple. This removes a stored key from Raycast and nothing else:
  // no API call is made, the key stays valid, and it can be added again.
  const _deleteTeam = (team: Team) => {
    (async () => {
      if (
        await confirmAlert({
          title: `Remove ${keyDisplayName(team)} from Raycast?`,
          message:
            "Only the stored key is removed. Your App Store Connect team and the key itself are unchanged, and you can add it again at any time.",
          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
        })
      ) {
        deleteTeam(team);
      }
    })();
  };

  const _signOut = () => {
    (async () => {
      if (
        await confirmAlert({
          title: teams.length === 1 ? "Remove the Stored Key?" : `Remove All ${teams.length} Keys?`,
          message:
            "Only the stored keys are removed. Your App Store Connect teams and the keys themselves are unchanged, and you can add them again at any time.",
          primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
        })
      ) {
        await deleteAllTeams();
        showToast({ style: Toast.Style.Success, title: "All Keys Removed" });
      }
    })();
  };

  const signOutAction = () =>
    teams.length > 0 ? (
      <Action title="Remove All Keys" icon={Icon.Trash} style={Action.Style.Destructive} onAction={_signOut} />
    ) : null;

  // Whole-record identity: two credentials can share a Key ID (a key re-added under a
  // corrected Issuer ID), and comparing Key IDs alone marks both rows as current and
  // leaves neither offering "Use Team".
  const isCurrentTeam = (team: Team) => {
    return currentTeam !== undefined && isSameCredential(currentTeam, team);
  };

  // The Key ID is only an accessory when it is not already the title: an unnamed key is
  // DISPLAYED as its Key ID, and showing it twice on one row is what the previous pass
  // was reported for. The key type is not repeated here at all — the section says it.
  const accessoriesForTeam = (team: Team): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];
    if (keyDisplayName(team) !== team.apiKey) {
      accessories.push({ text: team.apiKey, tooltip: "Key ID" });
    }
    if (isCurrentTeam(team)) {
      accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Selected key" });
    }
    return accessories;
  };

  // An individual key is scoped to one person and an issuer-backed key to a whole team —
  // the difference decides what a credential can reach, so it heads the group rather than
  // being repeated on every row.
  // Position in STORED order is carried through the split, because the sections are
  // filtered views: an index within "Team Keys" is not the index renameTeam needs.
  const entries = teams.map((team, position) => ({ team, position }));
  const individualKeys = entries.filter(({ team }) => !team.issuerID);
  const teamKeys = entries.filter(({ team }) => team.issuerID);

  const addKeyAction = (shortcut?: Keyboard.Shortcut) => (
    <Action.Push
      title="Add API Key"
      icon={Icon.Plus}
      shortcut={shortcut}
      target={
        <AddTeam
          // AddTeam runs its own useTeams instance, so its write is invisible here
          // until we look again.
          didSignIn={() => {
            reload().catch((error) => showFailureToast(error, { title: "Couldn't Reload Keys" }));
          }}
        />
      }
    />
  );
  const keyRow = ({ team, position }: { team: Team; position: number }) => (
    <List.Item
      title={keyDisplayName(team)}
      accessories={accessoriesForTeam(team)}
      key={`${team.apiKey}-${team.issuerID ?? "individual"}-${position}`}
      actions={
        <ActionPanel>
          {/* ⏎ is whatever this row is FOR: switching to a key you are not using, and —
              when you are already using it — adding another. Never a removal. */}
          <ActionPanel.Section title={keyDisplayName(team)}>
            {!isCurrentTeam(team) && (
              <Action
                title="Use This Key"
                icon={Icon.CheckCircle}
                onAction={() => {
                  selectCurrentTeam(team);
                  showToast({ style: Toast.Style.Success, title: `Switched to ${keyDisplayName(team)}` });
                }}
              />
            )}
            {addKeyAction()}
            <Action.CopyToClipboard
              title="Copy Key Id"
              content={team.apiKey}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.Push
              title="Rename Key"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RenameKey team={team} position={position} renameTeam={renameTeam} />}
            />
          </ActionPanel.Section>
          {/* Leaving Raycast for the browser is its own kind of action, so it sits alone
              rather than among the things that act on the stored key. */}
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open API Keys" icon={Icon.Globe} url={API_KEYS_URL} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove"
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
              icon={Icon.MinusCircle}
              onAction={() => {
                _deleteTeam(team);
              }}
            />
            {signOutAction()}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} actions={<ActionPanel>{addKeyAction(Keyboard.Shortcut.Common.New)}</ActionPanel>}>
      {teams.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Key}
          title="No API Keys"
          description="Add an App Store Connect API key to use this extension."
        />
      )}
      {individualKeys.length > 0 && <List.Section title="Individual Keys">{individualKeys.map(keyRow)}</List.Section>}
      {teamKeys.length > 0 && <List.Section title="Team Keys">{teamKeys.map(keyRow)}</List.Section>}
    </List>
  );
}
