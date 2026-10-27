import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  accountStageColor,
  adminUrl,
  formatDate,
  formatMoney,
  formatSubscriptionPrice,
  personName,
  primaryAccount,
  stripeCustomerUrl,
} from "../lib/outseta/format";
import { Account, Person } from "../lib/outseta/types";
import { getClient, getSubdomain, showErrorToast, toRaycastColor } from "../lib/raycast";

// Detail.Metadata and List.Item.Detail.Metadata share an API, so metadata is written once and
// rendered by both the list side panel and the pushed detail views.
type Metadata = typeof Detail.Metadata;

function shortcut(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  const extra: Keyboard.KeyModifier[] = shift ? ["shift"] : [];
  return { macOS: { modifiers: ["cmd", ...extra], key }, Windows: { modifiers: ["ctrl", ...extra], key } };
}

export function PersonMetadata({ person, M }: { person: Person; M: Metadata }) {
  const account = primaryAccount(person);
  return (
    <M>
      <M.Label title="Name" text={personName(person)} />
      <M.Label title="Email" text={person.Email ?? "—"} />
      {person.Title ? <M.Label title="Title" text={person.Title} /> : null}
      <M.Separator />
      <M.Label title="Account" text={account?.Name ?? "—"} />
      {account ? <AccountStageTag account={account} M={M} /> : null}
      <M.Label title="Plan" text={account?.CurrentSubscription?.Plan?.Name ?? "—"} />
      <M.Label title="Price" text={formatSubscriptionPrice(account?.CurrentSubscription)} />
      <M.Separator />
      <M.Label title="Last Login" text={formatDate(person.LastLoginDateTime)} />
      <M.Label title="Created" text={formatDate(person.Created)} />
    </M>
  );
}

export function AccountMetadata({ account, M }: { account: Account; M: Metadata }) {
  const subscription = account.CurrentSubscription;
  const members = (account.PersonAccount ?? []).map((link) => link.Person).filter((p): p is Person => !!p);
  return (
    <M>
      <M.Label title="Name" text={account.Name ?? "—"} />
      <AccountStageTag account={account} M={M} />
      <M.Separator />
      <M.Label title="Plan" text={subscription?.Plan?.Name ?? "—"} />
      <M.Label title="Price" text={formatSubscriptionPrice(subscription)} />
      <M.Label title="Renews" text={formatDate(subscription?.RenewalDate)} />
      <M.Label title="Lifetime Revenue" text={formatMoney(account.LifetimeRevenue)} />
      {account.StripeId ? <M.Label title="Stripe Customer" text={account.StripeId} /> : null}
      <M.Separator />
      {members.length ? (
        <M.TagList title={`Members (${members.length})`}>
          {members.map((member) => (
            <M.TagList.Item key={member.Uid} text={personName(member)} />
          ))}
        </M.TagList>
      ) : (
        <M.Label title="Members" text="—" />
      )}
      <M.Label title="Last Login" text={formatDate(account.LastLoginDateTime)} />
      <M.Label title="Created" text={formatDate(account.Created)} />
    </M>
  );
}

function AccountStageTag({ account, M }: { account: Account; M: Metadata }) {
  return (
    <M.TagList title="Status">
      <M.TagList.Item
        text={account.AccountStageLabel ?? "Unknown"}
        color={toRaycastColor(accountStageColor(account.AccountStage))}
      />
    </M.TagList>
  );
}

export function PersonActions({ person, onDetailToggle }: { person: Person; onDetailToggle?: () => void }) {
  const account = primaryAccount(person);
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Outseta" url={adminUrl(getSubdomain(), "person", person.Uid)} />
      {onDetailToggle ? (
        <Action title="Toggle Details" icon={Icon.Sidebar} shortcut={shortcut("d")} onAction={onDetailToggle} />
      ) : null}
      {account ? (
        <Action.Push
          title="Show Account"
          icon={Icon.Building}
          shortcut={shortcut("a", true)}
          target={<AccountView uid={account.Uid} />}
        />
      ) : null}
      <ActionPanel.Section>
        {person.Email ? (
          <Action.CopyToClipboard title="Copy Email" content={person.Email} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        <Action.CopyToClipboard title="Copy Uid" content={person.Uid} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function AccountActions({ account, onDetailToggle }: { account: Account; onDetailToggle?: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Outseta" url={adminUrl(getSubdomain(), "account", account.Uid)} />
      {onDetailToggle ? (
        <Action title="Toggle Details" icon={Icon.Sidebar} shortcut={shortcut("d")} onAction={onDetailToggle} />
      ) : null}
      {account.StripeId ? (
        <Action.OpenInBrowser
          title="Open in Stripe"
          icon={Icon.CreditCard}
          shortcut={shortcut("s", true)}
          url={stripeCustomerUrl(account.StripeId)}
        />
      ) : null}
      <MembersSubmenu account={account} />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Account Name"
          content={account.Name ?? ""}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard title="Copy Uid" content={account.Uid} />
        {account.StripeId ? <Action.CopyToClipboard title="Copy Stripe ID" content={account.StripeId} /> : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function MembersSubmenu({ account }: { account: Account }) {
  const members = (account.PersonAccount ?? []).map((link) => link.Person).filter((p): p is Person => !!p);
  if (!members.length) return null;
  return (
    <ActionPanel.Submenu title="Show Member" icon={Icon.Person} shortcut={shortcut("p", true)}>
      {members.map((member) => (
        <Action.Push key={member.Uid} title={personName(member)} target={<PersonView uid={member.Uid} />} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function usePerson(uid: string | undefined) {
  return useCachedPromise((id: string) => getClient().getPerson(id), [uid ?? ""], {
    execute: !!uid,
    onError: (error) => showErrorToast(error, "Couldn't load person"),
  });
}

export function useAccount(uid: string | undefined) {
  return useCachedPromise((id: string) => getClient().getAccount(id), [uid ?? ""], {
    execute: !!uid,
    onError: (error) => showErrorToast(error, "Couldn't load account"),
  });
}

export function PersonView({ uid }: { uid: string }) {
  const { data: person, isLoading } = usePerson(uid);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={person ? personName(person) : "Person"}
      markdown={person ? `# ${personName(person)}\n\n${person.Email ?? ""}` : ""}
      metadata={person ? <PersonMetadata person={person} M={Detail.Metadata} /> : undefined}
      actions={person ? <PersonActions person={person} /> : undefined}
    />
  );
}

export function AccountView({ uid }: { uid: string }) {
  const { data: account, isLoading } = useAccount(uid);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={account?.Name ?? "Account"}
      markdown={account ? `# ${account.Name ?? "Account"}` : ""}
      metadata={account ? <AccountMetadata account={account} M={Detail.Metadata} /> : undefined}
      actions={account ? <AccountActions account={account} /> : undefined}
    />
  );
}
