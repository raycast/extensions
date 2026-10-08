import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { readCachedState } from "../lib/cache";
import { BRANDS, NONE_BRAND, NONE_SWITCH } from "../lib/constants";
import { reportError } from "../lib/errors";
import { klack } from "../lib/klack";
import type { Brand, SwitchName } from "../lib/types";

export function SwitchList() {
  const [searchText, setSearchText] = useState("");

  const {
    data: current,
    isLoading,
    mutate,
  } = useCachedPromise(klack.currentSwitch, [], {
    keepPreviousData: true,
    initialData: readCachedState()?.switch,
  });

  const sections = useMemo(() => filterBrands([NONE_BRAND, ...BRANDS], searchText), [searchText]);

  async function selectSwitch(name: SwitchName) {
    if (current?.toLowerCase() === name.toLowerCase()) {
      await showHUD(name === NONE_SWITCH ? "Klack is already off" : `Klack is already using ${name}`);
      return;
    }
    try {
      await mutate(klack.setSwitch(name), { optimisticUpdate: () => name, shouldRevalidateAfter: false });
      await showHUD(name === NONE_SWITCH ? "Klack switched off" : `Selected ${name}`);
    } catch (err) {
      await reportError(err);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Set Switch Set"
      searchBarPlaceholder="Search switch sets"
    >
      {sections.map((brand) => (
        <List.Section key={brand.name} title={brand === NONE_BRAND ? brand.name : `${brand.name}™`}>
          {brand.switches.map((s) => (
            <List.Item
              key={s.name}
              title={s.name}
              accessories={current?.toLowerCase() === s.name.toLowerCase() ? [{ tag: "Current" }] : undefined}
              icon={s.icon ? { source: s.icon } : { source: Icon.MinusCircle, tintColor: s.tint }}
              actions={
                <ActionPanel>
                  <Action title="Select" icon={Icon.Check} onAction={() => selectSwitch(s.name)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function filterBrands(brands: readonly Brand[], query: string): readonly Brand[] {
  const q = query.trim().toLowerCase();
  if (!q) return brands;
  return brands.flatMap((b) => {
    if (b.name.toLowerCase().includes(q)) return [b];
    const switches = b.switches.filter((s) => s.name.toLowerCase().includes(q));
    return switches.length ? [{ ...b, switches }] : [];
  });
}
