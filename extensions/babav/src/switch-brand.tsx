import { Action, ActionPanel, Color, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, Brand, setActiveBrand, showError } from "./api";
import { withConnection } from "./connect";

function SwitchBrand() {
  const { data, isLoading } = usePromise(
    async () => api<{ brands: Brand[]; active_customer_id: string }>("/brands"),
    [],
    {
      onError: (e) => showError(e, "Could not load your brands"),
    },
  );
  async function pick(b: Brand) {
    try {
      const r = await api<{ brand: Brand }>("/brands/switch", { method: "POST", body: { customer_id: b.customer_id } });
      await setActiveBrand(r.brand.customer_id, r.brand.name);
      await showHUD(`BABAV: ${r.brand.name}`);
      await popToRoot();
    } catch (e) {
      await showError(e, "Could not switch brand");
    }
  }
  const brands = data?.brands || [];
  return (
    <List isLoading={isLoading}>
      {brands.length === 1 ? (
        <List.Section title="This key belongs to one brand. Use your main brand's key to switch between brands." />
      ) : null}
      {brands.map((b) => (
        <List.Item
          key={b.customer_id}
          icon={{
            source: b.is_active ? Icon.CheckCircle : Icon.Circle,
            tintColor: b.is_active ? Color.Green : Color.SecondaryText,
          }}
          title={b.name}
          accessories={b.is_master ? [{ tag: "Main" }] : []}
          actions={
            <ActionPanel>
              <Action title="Use This Brand" icon={Icon.Switch} onAction={() => pick(b)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withConnection(SwitchBrand);
