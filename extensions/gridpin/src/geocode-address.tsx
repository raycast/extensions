import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CountryDropdown, HitItem, NoSheetItems, SetupView, useSetup } from "./common";
import { geocode } from "./gridpin";

export default function Command() {
  const { setup, setCountry } = useSetup();
  const [text, setText] = useState("");
  const ready = setup.kind === "ready" ? setup : undefined;
  const { data: hits, isLoading } = usePromise(
    async (q: string, bin?: string, sheet?: string, env?: NodeJS.ProcessEnv) =>
      bin && sheet && env ? geocode(bin, sheet, q, env) : [],
    [text, ready?.bin, ready?.sheet.path, ready?.env],
  );
  const empty = SetupView({ setup });
  return (
    <List
      isLoading={setup.kind === "loading" || isLoading}
      searchBarPlaceholder="An address, e.g. 1 rue de la Paix, Paris"
      onSearchTextChange={setText}
      throttle
      searchBarAccessory={<CountryDropdown setup={setup} onChange={setCountry} />}
    >
      {setup.kind === "no-sheet" ? (
        <NoSheetItems sheets={setup.sheets} />
      ) : !ready ? (
        (empty ?? <List.EmptyView title="Looking for GridPin…" />)
      ) : !text.trim() ? (
        <List.EmptyView
          title="Type an address"
          description={`Answers come from the ${ready.sheet.name} sheet on this Mac.`}
        />
      ) : hits && hits.length ? (
        hits.map((h, i) => <HitItem key={`${h.lat},${h.lon},${i}`} hit={h} index={i} />)
      ) : (
        <List.EmptyView
          title="No answer"
          description={isLoading ? "Looking…" : `The ${ready.sheet.name} sheet has no address like this one.`}
        />
      )}
    </List>
  );
}
