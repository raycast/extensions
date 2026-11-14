import { List, Action, ActionPanel } from "@raycast/api";
import type { JSX } from "react";
import { useWallet } from "./hooks/useWallet";
import { WalletView } from "./views/WalletView";
import { BalancesView } from "./views/BalancesView";
import { LendFormView } from "./views/LendFormView";
import { LendPositionsView } from "./views/LendPositionsView";
import { BorrowFormView } from "./views/BorrowFormView";
import { BorrowPositionsView } from "./views/BorrowPositionsView";
import { TransferView } from "./views/TransferView";
import { WithdrawView } from "./views/WithdrawView";
import { MyLoansView } from "./views/MyLoansView";
import { TransactionsView } from "./views/TransactionsView";
import { ShieldedAddressView } from "./views/ShieldedAddressView";
import { ProfileView } from "./views/ProfileView";
import { showToast, Toast, Icon } from "@raycast/api";

export default function NoctrumCommand() {
  const { wallet, isLoading, refresh } = useWallet();

  function guardedAction(title: string, renderTarget: () => JSX.Element) {
    if (wallet) {
      return <Action.Push title={title} target={renderTarget()} />;
    }
    return (
      <Action.Push
        title={title}
        target={<WalletView onDone={refresh} />}
        onPush={() => showToast(Toast.Style.Animated, "Setup wallet first")}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search actions...">
      <List.Section title="Wallet">
        <List.Item
          title="Manage Wallet"
          subtitle="Setup, view, or import"
          icon={{ source: "list-icons/wallet.png" }}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Wallet" target={<WalletView onDone={refresh} />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Balances">
        <List.Item
          title="View Balances"
          subtitle="Private vault + on-chain"
          icon={{ source: "list-icons/balance.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("View Balances", () => (
                <BalancesView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Lending">
        <List.Item
          title="Create Lend Intent"
          subtitle="Deposit & lend with rate"
          icon={{ source: "list-icons/lend.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Create Lend Intent", () => (
                <LendFormView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
        <List.Item
          title="My Lend Positions"
          subtitle="Active lends & loans"
          icon={{ source: "list-icons/money.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("My Lend Positions", () => (
                <LendPositionsView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Borrowing">
        <List.Item
          title="Create Borrow Intent"
          subtitle="Borrow with collateral"
          icon={{ source: "list-icons/money-bundle.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Create Borrow Intent", () => (
                <BorrowFormView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
        <List.Item
          title="My Borrow Positions"
          subtitle="Intents, proposals, loans"
          icon={{ source: "list-icons/box.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("My Borrow Positions", () => (
                <BorrowPositionsView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Loans">
        <List.Item
          title="My Loans"
          subtitle="All active & completed loans"
          icon={{ source: "list-icons/bank.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("My Loans", () => (
                <MyLoansView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Privacy">
        <List.Item
          title="Private Transfer"
          subtitle="Send tokens privately"
          icon={{ source: "list-icons/transfer.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Private Transfer", () => (
                <TransferView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
        <List.Item
          title="Generate Shielded Address"
          subtitle="Get a shielded address"
          icon={{ source: "list-icons/privacy.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Generate Shielded Address", () => (
                <ShieldedAddressView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Funds">
        <List.Item
          title="Withdraw"
          subtitle="Withdraw to on-chain"
          icon={{ source: "list-icons/rocket.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Withdraw", () => (
                <WithdrawView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="History">
        <List.Item
          title="Transactions"
          subtitle="View transaction history"
          icon={{ source: "list-icons/profile.png" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Transactions", () => (
                <TransactionsView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Profile">
        <List.Item
          title="Credit Score & Profile"
          subtitle="Tier, stats, multiplier"
          icon={{ source: "pfp.jpg" }}
          accessories={!wallet ? [{ icon: Icon.Lock }] : []}
          actions={
            <ActionPanel>
              {guardedAction("Credit Score & Profile", () => (
                <ProfileView wallet={wallet!} />
              ))}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
