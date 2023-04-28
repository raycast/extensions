import { List, Detail, Icon } from "@raycast/api";
import dateFormat from "dateformat";
import { Account } from "./accountEnvato";
import { SaleItem, PayoutItem } from "./saleItem";
import { useFetch, fullDate } from "./utils";

/*-----------------------------------*/
/*------ INDEX
/*-----------------------------------*/
export default function Command() {
  const state = useFetch();

  // IF EMPTY
  if (state.errors.reason !== undefined && state.errors.empty !== true) {
    return (
      <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />
    );
  }

  const statementItems = [];
  let resultItems = [];
  const sales = state.sales;

  return (
    <List
      isShowingDetail={state.showdetail}
      isLoading={Object.keys(sales).length === 0 && state.errors.reason == undefined && state.errors.empty !== true}
    >
      <Account state={state} />
      <List.Section title="Sales">
        {state.user.username === "" || state.user.username == undefined ? (
          <List.EmptyView icon={{ source: Icon.TwoArrowsClockwise }} title="Loading..." />
        ) : (
          (state.statement.results.map((item, index) => {
            if (item.type == "Payout") {
              statementItems.push(item);
            }
          }),
          (resultItems = statementItems.concat(state.sales).sort((a, b) => b.date - a.sold_at)),
          resultItems.map((sale, index) => {
            const saleDate = String(dateFormat(sale["sold_at"], "d, m, yyyy"));
            if (sale.type == "Payout" && state.errors !== []) return <PayoutItem sale={sale} />;
            if (saleDate == fullDate && sale.type === undefined && state.errors !== [])
              return <SaleItem sale={sale} key={index} todey={true} item={true} />;
            if (saleDate != fullDate && sale.type === undefined && state.errors !== [])
              return <SaleItem sale={sale} key={index} todey={false} item={true} />;
          }))
        )}
      </List.Section>
    </List>
  );
}
