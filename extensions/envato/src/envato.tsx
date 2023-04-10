import {
  ActionPanel,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import Envato from "envato";
import dateFormat from "dateformat";

const token = getPreferenceValues().token;
const client = new Envato.Client(token);

const date = new Date();
const day = date.getDate();
const month = date.getMonth() + 1;
const year = date.getFullYear();
const fullDate = `${day}, ${month}, ${year}`;

type envatoErrors = {
  empty?: boolean;
  reason?: string;
  description?: string;
};

export default function Command() {
  const [state, setState] = useState<{ sales: []; errors: envatoErrors }>({ sales: [], errors: [] as envatoErrors });

  useEffect(() => {
    async function fetch() {
      try {
        const salesInfo = await client.private.getSales();
        const salesEmpty: any = salesInfo.length === 0 ? { empty: true } : [];
        setState((oldState) => ({
          ...oldState,
          sales: salesInfo as [],
          errors: salesEmpty as envatoErrors,
        }));
      } catch (error: any) {
        const reason = error.response.reason ?? "Error";
        const description = error.response.error ?? "An unknown error has occurred.";
        const out: { [key: string]: any } = { reason, description };
        setState((oldState) => ({
          ...oldState,
          errors: out as envatoErrors,
        }));
        showToast(ToastStyle.Failure, reason, description);
        return;
      }
    }
    fetch();
  }, []);

  if (state.errors.reason !== undefined && state.errors.empty !== true) {
    return (
      <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />
    );
  }

  function price(price: "", support: "") {
    let support_out = "";
    if (parseInt(support) != 0) {
      support_out = " ($" + support + ")";
    }
    return "$" + price + support_out;
  }

  function SaleItem(props: { sale: any; key: number }) {
    return (
      <List.Item
        icon={props.sale.item.previews.icon_preview.icon_url ?? "/"}
        title={String(props.sale.item.name ?? "")}
        subtitle={String(dateFormat(props.sale.sold_at, "dd.mm.yyyy")) ?? ""}
        accessoryIcon="💵"
        accessoryTitle={`${price(props.sale.amount, props.sale.support_amount)}`}
        actions={
          <ActionPanel>
            <OpenInBrowserAction url={`${props.sale.item.url}`} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={state.sales.length === 0 && state.errors.reason == undefined && state.errors.empty !== true}>
      <List.Section title="Today">
        {state.sales.map((sale, index) => {
          const saleDate = String(dateFormat(sale["sold_at"], "dd, mm, yyyy"));
          if (saleDate == fullDate && state.errors !== []) return <SaleItem sale={sale} key={index} />;
        })}
      </List.Section>
      <List.Section title="Sales">
        {state.sales.map((sale, index) => {
          const saleDate = String(dateFormat(sale["sold_at"], "dd, mm, yyyy"));
          if (saleDate != fullDate && state.errors !== []) return <SaleItem sale={sale} key={index} />;
        })}
      </List.Section>
    </List>
  );
}
