import { renderToSvg } from "@/ui/svg-renderer";
import { MonitorTable } from "@/ui/monitors/components/monitor-table";

const COLUMNS = [
  { title: "Field", width: 580 },
  { title: "Value", width: 580 },
];

export async function buildMonitorDetailsTableSvg(rows: [string, string][]): Promise<string> {
  return renderToSvg(<MonitorTable columns={COLUMNS} rows={rows} />);
}
