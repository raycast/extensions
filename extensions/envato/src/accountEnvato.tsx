import { ActionPanel, Action, List, Detail, Icon, Color, Cache } from "@raycast/api";
import { AccountBadges } from "./badgesEnvato";
import { SaleItemDetail } from "./saleItem";
import dateFormat from "dateformat";
import { useFetch } from "./utils";
import { saleItem, envatoUser, GetData, PortfolioItems } from "./types";

/*-----------------------------------*/
/*------ INDEX ACCOUNT
 /*-----------------------------------*/
export default function accountEnvato() {
  const cache = new Cache();
  const cached = cache.get("state") ?? "";
  const stateFetch = useFetch();
  const state = stateFetch.isLoading ? JSON.parse(cached) : stateFetch;

  const outPortfolio = state.portfolio !== undefined ? state.portfolio.matches : [];

  if (state.errors?.reason !== undefined && state.errors.empty !== true) {
    return (
      <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />
    );
  }

  return (
    <List isLoading={outPortfolio && state.isLoading}>
      <Account state={state} />
      <List.Section title="My Portfolio">
        {outPortfolio.map((item: any, index: any) => {
          return <PortfolioItem item={item} key={index} />;
        })}
      </List.Section>
    </List>
  );
}

/*-----------------------------------*/
/*------ ACCOUNT
/*-----------------------------------*/
export function Account(props: { state: GetData }) {
  return (
    <List.Section title="Account">
      <AccountItem
        infoUser={props.state.user ?? ([] as envatoUser)}
        infoAccount={props.state.account ?? []}
        portfolio={props.state.portfolio?.matches ?? ([] as PortfolioItems[])}
        badges={props.state.badges ?? []}
      />
    </List.Section>
  );
}

/*-----------------------------------*/
/*------ ACCOUNT ITEM
/*-----------------------------------*/
export function AccountItem(props: {
  infoUser: envatoUser;
  infoAccount: any;
  portfolio: PortfolioItems[];
  badges: any;
}) {
  return (
    <List.Item
      icon={props.infoUser.image ?? "🔍"}
      title={String(props.infoUser.username ?? "Loading..")}
      subtitle={String(`${props.infoAccount.firstname ?? ""} ${props.infoAccount.surname ?? ""}`) ?? ""}
      accessories={[
        { text: `${props.infoUser.sales ?? "0"}`, icon: { source: Icon.BarChart, tintColor: Color.Green } },
        {
          text: `${props.infoAccount.balance ? "$" + props.infoAccount.balance : "$0.00"}`,
          icon: { source: Icon.BankNote, tintColor: Color.Green },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Portfolio"
            target={<AccountPortfolio portfolio={props.portfolio} badges={props.badges} />}
          />
        </ActionPanel>
      }
    />
  );
}

/*-----------------------------------*/
/*------ PORTFOLIO ITEM
/*-----------------------------------*/
export function PortfolioItem(props: { item: saleItem; key: number }) {
  const accessories = [
    { text: `${props.item.number_of_sales} Purchases` },
    {
      text: `${props.item.rating?.rating} (${props.item.rating?.count})`,
      icon: { source: Icon.Star, tintColor: Color.Yellow },
    },
  ];
  const icon = props.item.previews?.icon_with_landscape_preview?.icon_url ?? "/";
  const title = props.item.name ?? "/";

  return (
    <List.Item
      icon={icon ?? "/"}
      title={String(title ?? "")}
      subtitle={String(dateFormat(props.item.updated_at, "dd.mm.yyyy")) ?? ""}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Details" target={<SaleItemDetail sale={props.item} todey={false} />} />
        </ActionPanel>
      }
    />
  );
}

/*-----------------------------------*/
/*------ PORTFOLIO
 /*-----------------------------------*/
export function AccountPortfolio(props: { portfolio: PortfolioItems[]; badges: any }) {
  return (
    <List isLoading={props.portfolio.length === 0}>
      <AccountBadges badges={props.badges} />
      <List.Section title="My Portfolio">
        {props.portfolio.map((item, index) => {
          return <PortfolioItem item={item} key={index} />;
        })}
      </List.Section>
    </List>
  );
}
