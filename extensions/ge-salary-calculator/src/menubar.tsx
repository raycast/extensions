import { MenuBarExtra, Clipboard, Icon, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type LastCalc, calcGross, applyTax } from "./utils";

export default function MenuBar() {
  const { data, isLoading } = usePromise(async () => {
    const raw = await LocalStorage.getItem<string>("lastCalc");
    return raw ? (JSON.parse(raw) as LastCalc) : null;
  });

  const title = data ? `${data.net.toFixed(0)} GEL net` : "GE Salary";

  const periods = data
    ? (() => {
        const g = calcGross(data.gross, data.hoursPerDay, data.daysPerWeek);
        return [
          { label: "Hourly", net: applyTax(g.hourly, data.regime) },
          { label: "Daily", net: applyTax(g.daily, data.regime) },
          { label: "Weekly", net: applyTax(g.weekly, data.regime) },
          { label: "Monthly", net: applyTax(g.monthly, data.regime) },
          { label: "Yearly", net: applyTax(g.yearly, data.regime) },
        ];
      })()
    : [];

  return (
    <MenuBarExtra title={title} icon={Icon.BankNote} isLoading={isLoading}>
      {periods.map((p) => (
        <MenuBarExtra.Item
          key={p.label}
          title={`${p.label}: ${p.net.toFixed(2)} GEL`}
          onAction={() => Clipboard.copy(p.net.toFixed(2))}
        />
      ))}
      {!data && !isLoading && <MenuBarExtra.Item title="No calculation yet — open Salary Calculator" />}
    </MenuBarExtra>
  );
}
