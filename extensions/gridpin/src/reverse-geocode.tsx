import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { CountryDropdown, HitItem, NoSheetItems, QueryErrorView, SetupView, useSetup } from "./common";
import { parsePoint, reverse, run } from "./gridpin";

export default function Command() {
  const { setup, setCountry } = useSetup();
  const [text, setText] = useState("");
  const ready = setup.kind === "ready" ? setup : undefined;
  const abortable = useRef<AbortController>(null);
  const {
    data: hits,
    error,
    isLoading,
    revalidate,
  } = usePromise(
    async (q: string, bin?: string, sheet?: string, env?: NodeJS.ProcessEnv) =>
      bin && sheet && env ? reverse(bin, sheet, q, env, run, abortable.current?.signal) : [],
    [text, ready?.bin, ready?.sheet.path, ready?.env],
    { abortable },
  );
  const empty = SetupView({ setup });
  const valid = parsePoint(text) !== undefined;
  return (
    <List
      isLoading={setup.kind === "loading" || isLoading}
      searchBarPlaceholder="A point: latitude, longitude, e.g. 48.8685, 2.3303"
      onSearchTextChange={setText}
      throttle
      searchBarAccessory={<CountryDropdown setup={setup} onChange={setCountry} />}
    >
      {setup.kind === "no-sheet" ? (
        <NoSheetItems sheets={setup.sheets} />
      ) : !ready ? (
        (empty ?? <List.EmptyView title="Looking for GridPin…" />)
      ) : !valid ? (
        <List.EmptyView
          title={text.trim() ? "Not a point" : "Type a point"}
          description="Latitude and longitude in degrees, separated by a comma: 48.8685, 2.3303"
        />
      ) : error ? (
        <QueryErrorView error={error} retry={revalidate} />
      ) : hits && hits.length ? (
        hits.map((h, i) => <HitItem key={`${h.lat},${h.lon},${i}`} hit={h} index={i} />)
      ) : (
        <List.EmptyView
          title="No address near this point"
          description={
            isLoading ? "Looking…" : `The point is outside the ${ready.sheet.name} sheet or far from its addresses.`
          }
        />
      )}
    </List>
  );
}
