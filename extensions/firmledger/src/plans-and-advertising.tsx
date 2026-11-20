import { FooterActions } from "./components/Footer";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ToolAction } from "./components/actions";
import { Obj, extractArray, pick } from "./lib/format";
import { eyebrow, sectionLabel } from "./lib/theme";
import { structured } from "./lib/render";
import { read, reportError } from "./lib/mcp";

function Block({ title, tool, keys, kind }: { title: string; tool: string; keys: string[]; kind: "plan" | "package" }) {
  const { data, isLoading } = usePromise(read, [tool, {}], { onError: reportError });
  const items = data ? extractArray(data.data, keys) : [];
  return (
    <List.Section title={sectionLabel(title)}>
      {items.map((o: Obj, i) => {
        const id = pick(o, ["id", "plan", "package", "slug", "name"]);
        const name = pick(o, ["name", "title", "label", "id"]) ?? `${kind} ${i + 1}`;
        const price = pick(o, ["price", "price_display", "amount", "price_usd"]);
        return (
          <List.Item
            key={`${kind}-${id ?? i}`}
            title={name}
            subtitle={pick(o, ["billing", "duration", "description"])}
            accessories={price ? [{ tag: price }] : []}
            detail={
              <List.Item.Detail markdown={`${eyebrow(kind === "plan" ? "Pro plan" : "Ad package")}\n\n# ${name}\n\n${structured(o)}`} />
            }
            actions={
              <ActionPanel>
                {kind === "plan" ? (
                  <ToolAction
                    tool="prepare_upgrade"
                    preset={id ? { plan: id } : {}}
                    form
                    title="Prepare Checkout Link…"
                    icon={Icon.CreditCard}
                  />
                ) : (
                  <ToolAction
                    tool="prepare_advertising"
                    preset={id ? { package: id } : {}}
                    form
                    title="Prepare Advertising Checkout…"
                    icon={Icon.Rocket}
                  />
                )}
                <Action.CopyToClipboard title="Copy Details" content={JSON.stringify(o, null, 2)} />
                <FooterActions />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && items.length === 0 && <List.Item title="Nothing listed" icon={Icon.Info} />}
    </List.Section>
  );
}

export default function Command() {
  return (
    <List isShowingDetail searchBarPlaceholder="Plans and packages…">
      <Block title="FirmLedger Pro plans" tool="list_plans" keys={["plans", "items", "offers"]} kind="plan" />
      <Block title="Advertising packages" tool="list_ad_packages" keys={["packages", "items"]} kind="package" />
      <List.Section title={sectionLabel("Notes")}>
        <List.Item
          title="Checkout links never charge anything"
          icon={Icon.Lock}
          detail={
            <List.Item.Detail
              markdown={`${eyebrow("Checkout")}\n\n# Checkout links never charge anything\n\nLinks are personal, last 24 hours and open a review page on FirmLedger. You complete payment yourself on Lemon Squeezy. Nothing in this extension can buy anything.`}
            />
          }
        />
      </List.Section>
    </List>
  );
}
