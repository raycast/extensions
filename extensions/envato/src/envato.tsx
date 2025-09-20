import { List, Detail, Cache } from "@raycast/api";
import dateFormat from "dateformat";
import { Account } from "./accountEnvato";
import { SaleItem, PayoutItem } from "./saleItem";
import { useFetch, fullDate } from "./utils";
import { GetData } from "./types";

/*-----------------------------------*/
/*------ INDEX
/*-----------------------------------*/
export default function Command() {
  const cache = new Cache();
  const cached = cache.get("state") ?? "";
  const stateFetch = useFetch();
  const state: GetData = stateFetch.isLoading ? JSON.parse(cached) : stateFetch;

  // IF EMPTY
  if (state.errors?.reason !== undefined && state.errors.empty !== true) {
    return (
      <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />
    );
  }

  const statementItems: any = [];
  let resultItems = [];
  state.statement?.results.map((item) => {
    if (item.type == "Payout") {
      statementItems.push(item);
    }
  }),
    (resultItems = statementItems.concat(state.sales).sort(({ a, b }: any) => b?.date - a?.sold_at));

  return (
    <List
      isShowingDetail={state.showdetail}
      isLoading={stateFetch.isLoading && state.errors?.reason == undefined && state.errors?.empty !== true}
    >
      <Account state={state} />
      <List.Section title="Sales">
        {resultItems.map((sale: any, index: any) => {
          const saleDate = sale?.sold_at !== undefined ? String(dateFormat(sale.sold_at, "d, m, yyyy")) : "";
          if (sale?.type == "Payout" && state.errors !== undefined) return <PayoutItem key={index} sale={sale} />;
          if (saleDate == fullDate && sale?.type === undefined && state.errors !== undefined)
            return <SaleItem sale={sale} key={index} todey={true} item={true} />;
          if (saleDate != fullDate && sale?.type === undefined && state.errors !== undefined)
            return <SaleItem sale={sale} key={index} todey={false} item={true} />;
        })}
      </List.Section>
    </List>
  );
}
