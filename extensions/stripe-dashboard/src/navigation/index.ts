import { Icon, Color } from "@raycast/api";
import { Balance, BalanceTransactions, Charges, PaymentIntents, ConnectedAccounts, Events } from "../views";
import { PageProps } from "./../types";
import { theme } from "../theme";

type NavItem = {
  label: string;
  icon: Icon;
  iconColor?: string;
  Page: React.FC<PageProps>;
};

export const navItems: Array<NavItem> = [
  {
    label: "Balance",
    icon: Icon.BarChart,
    iconColor: Color.Green,
    Page: Balance,
  },
  {
    label: "Balance Transactions",
    icon: Icon.List,
    iconColor: theme.colors.stripeBlue,
    Page: BalanceTransactions,
  },
  {
    label: "Charges",
    icon: Icon.CreditCard,
    iconColor: Color.Red,
    Page: Charges,
  },
  {
    label: "Payment Intents",
    icon: Icon.BarCode,
    Page: PaymentIntents,
  },
  {
    label: "Connected Accounts",
    icon: Icon.TwoPeople,
    iconColor: Color.Yellow,
    Page: ConnectedAccounts,
  },
  {
    label: "Events",
    icon: Icon.Network,
    iconColor: Color.Orange,
    Page: Events,
  },
];
