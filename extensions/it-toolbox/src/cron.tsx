import { Icon } from "@raycast/api";
import { describeCron, nextCronRuns, parseCron } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Cron Expression (5 fields)"
      placeholder="*/5 * * * *  or  0 9 * * 1-5"
      initialValue="*/5 * * * *"
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        const rows: ResultRow[] = [];
        try {
          const fields = parseCron(input);
          rows.push({
            id: "desc",
            title: describeCron(input),
            subtitle: "Meaning",
            icon: Icon.Info,
          });
          rows.push({
            id: "fields",
            title: `Minute: ${fields[0].join(",")}`,
            subtitle: `Hour: ${fields[1].join(",")}`,
            icon: Icon.Calendar,
            copyValue: `minute=${fields[0].join(",")} hour=${fields[1].join(",")} day=${fields[2].join(",")} month=${fields[3].join(",")} weekday=${fields[4].join(",")}`,
          });
          nextCronRuns(input, 10).forEach((date, index) => {
            const pad = (n: number) => String(n).padStart(2, "0");
            const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
              date.getHours(),
            )}:${pad(date.getMinutes())}`;
            rows.push({
              id: `run-${index}`,
              title: text,
              subtitle: `Run #${index + 1}`,
              icon: Icon.Clock,
              copyValue: text,
            });
          });
        } catch (error) {
          rows.push({
            id: "error",
            title: "Invalid cron expression",
            detail: (error as Error).message,
            icon: Icon.CircleDisabled,
            copyValue: (error as Error).message,
          });
        }
        return rows;
      }}
    />
  );
}
