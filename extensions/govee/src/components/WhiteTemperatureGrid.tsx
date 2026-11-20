import { colord } from "colord";
import { useState } from "react";

import { Action, ActionPanel, Grid, Toast, showToast, useNavigation } from "@raycast/api";

import { kelvinToRgb } from "@/lib/kelvin";

/** Whites by temperature, using the light's own temperature mode (white LEDs where it has them). */
const WhiteTemperatureGrid = ({
  range,
  apply,
}: {
  range: { min: number; max: number };
  apply: (kelvin: number) => Promise<unknown>;
}) => {
  const { pop } = useNavigation();
  const [search, setSearch] = useState("");
  const steps: number[] = [];
  for (let k = Math.ceil(range.min / 500) * 500; k <= range.max; k += 500) steps.push(k);
  const typed = parseInt(search.replace(/k$/i, ""), 10);
  const shown =
    Number.isFinite(typed) && typed >= range.min && typed <= range.max
      ? [typed, ...steps.filter((k) => k !== typed && String(k).startsWith(search.replace(/k$/i, "")))]
      : search
        ? steps.filter((k) => String(k).startsWith(search.replace(/k$/i, "")))
        : steps;

  const run = async (kelvin: number, close: boolean) => {
    try {
      await apply(kelvin);
      if (close) pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't set white",
        message: String((err as Error)?.message ?? err),
      });
    }
  };

  return (
    <Grid
      columns={8}
      aspectRatio="16/9"
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder={`Temperature, ${range.min}–${range.max}K (e.g. 4200)…`}
    >
      {shown.map((k) => (
        <Grid.Item
          key={k}
          title={`${k}K`}
          content={{ color: colord(kelvinToRgb(k)).toHex() }}
          actions={
            <ActionPanel>
              <Action title="Set White" onAction={() => run(k, true)} />
              <Action title="Test White" onAction={() => run(k, false)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};

export default WhiteTemperatureGrid;
