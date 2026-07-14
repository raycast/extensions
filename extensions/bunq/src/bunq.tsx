import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession } from "./hooks/useBunqSession";
import AccountsCommand from "./accounts";
import CardsCommand from "./cards";
import SendCommand from "./send";
import ReceiveCommand from "./receive";
import ProfileCommand from "./profile";
import InvoicesCommand from "./invoices";
import EventsCommand from "./events";
import WiseCommand from "./wise";
import WebhooksCommand from "./webhooks";
import SharesCommand from "./shares";
import CurrencyCommand from "./currency";
import AutoAllocateCommand from "./auto-allocate";
import DirectDebitsCommand from "./direct-debits";
import DevicesCommand from "./devices";
import SubscriptionCommand from "./subscription";

export default function BunqCommand() {
  const { push } = useNavigation();
  const session = useBunqSession();

  // Show loading state
  if (session.isLoading) {
    return <List isLoading />;
  }

  // Show logged-out state with reconnect option
  if (session.isLoggedOut || (!session.isConfigured && !session.error)) {
    const description = session.isLoggedOut
      ? "You are logged out. Click the button below to reconnect to bunq."
      : "Configure your bunq API key in extension preferences to get started.";
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
          title="Not Connected"
          description={description}
          actions={
            <ActionPanel>
              <Action title="Connect to Bunq" icon={Icon.Link} onAction={session.reconnect} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show error state with retry option
  if (session.error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Connection Failed"
          description={session.error.message}
          actions={
            <ActionPanel>
              <Action title="Retry Connection" icon={Icon.ArrowClockwise} onAction={session.reconnect} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      <List.Section title="Banking">
        <List.Item
          title="Accounts"
          subtitle="View accounts, transactions, and insights"
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Open Accounts" icon={Icon.BankNote} onAction={() => push(<AccountsCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Cards"
          subtitle="Manage your bunq cards and view CVC2"
          icon={{ source: Icon.CreditCard, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Open Cards" icon={Icon.CreditCard} onAction={() => push(<CardsCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Events"
          subtitle="View your activity feed"
          icon={{ source: Icon.Calendar, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Open Events" icon={Icon.Calendar} onAction={() => push(<EventsCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Account Sharing"
          subtitle="Share accounts with others"
          icon={{ source: Icon.TwoPeople, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Open Account Sharing" icon={Icon.TwoPeople} onAction={() => push(<SharesCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Auto Allocation"
          subtitle="Automatic payment splitting rules"
          icon={{ source: Icon.Shuffle, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Open Auto Allocation" icon={Icon.Shuffle} onAction={() => push(<AutoAllocateCommand />)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Payments">
        <List.Item
          title="Send Money"
          subtitle="Payments, drafts, batches, and scheduled transfers"
          icon={{ source: Icon.ArrowUp, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Open Send Money" icon={Icon.ArrowUp} onAction={() => push(<SendCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Receive Money"
          subtitle="Payment requests, incoming requests, and bunq.me links"
          icon={{ source: Icon.ArrowDown, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action title="Open Receive Money" icon={Icon.ArrowDown} onAction={() => push(<ReceiveCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="International Transfers"
          subtitle="Wise quotes and transfer history"
          icon={{ source: Icon.Globe, tintColor: Color.Magenta }}
          actions={
            <ActionPanel>
              <Action title="Open International Transfers" icon={Icon.Globe} onAction={() => push(<WiseCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Currency Converter"
          subtitle="Convert between currencies"
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Open Currency Converter" icon={Icon.Coins} onAction={() => push(<CurrencyCommand />)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Account">
        <List.Item
          title="Profile"
          subtitle="View your bunq profile and settings"
          icon={{ source: Icon.Person, tintColor: Color.Magenta }}
          actions={
            <ActionPanel>
              <Action title="Open Profile" icon={Icon.Person} onAction={() => push(<ProfileCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Subscription"
          subtitle="View your bunq plan"
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Open Subscription" icon={Icon.Star} onAction={() => push(<SubscriptionCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Direct Debits"
          subtitle="Manage SEPA direct debit mandates"
          icon={{ source: Icon.Repeat, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Open Direct Debits" icon={Icon.Repeat} onAction={() => push(<DirectDebitsCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Invoices"
          subtitle="View subscription invoices"
          icon={{ source: Icon.Receipt, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action title="Open Invoices" icon={Icon.Receipt} onAction={() => push(<InvoicesCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Devices"
          subtitle="Manage registered API devices"
          icon={{ source: Icon.Mobile, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action title="Open Devices" icon={Icon.Mobile} onAction={() => push(<DevicesCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Webhooks"
          subtitle="Manage notification filters"
          icon={{ source: Icon.Bell, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Open Webhooks" icon={Icon.Bell} onAction={() => push(<WebhooksCommand />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Logout"
          subtitle="Clear credentials and disconnect"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Logout"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={session.logout}
              />
              <Action title="Reconnect" icon={Icon.ArrowClockwise} onAction={session.reconnect} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
