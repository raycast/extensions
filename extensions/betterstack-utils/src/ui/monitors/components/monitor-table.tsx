import { environment } from "@raycast/api";
import type { ReactNode } from "react";
import { getSchedulePalette, SchedulePalette } from "@/common/colors";
import { cn } from "@/lib/utils";

export interface MonitorTableColumn {
  title: string;
  width: number;
}

const ROW_HEIGHT = 56;
const BORDER_WIDTH = 1;

/** Rendered height of a table with the given number of body rows, plus the header row. */
export function getMonitorTableHeight(rowCount: number): number {
  return ROW_HEIGHT * (rowCount + 1) + BORDER_WIDTH * 2;
}

export function MonitorTable({ columns, rows }: { columns: MonitorTableColumn[]; rows: ReactNode[][] }) {
  const palette = getSchedulePalette(environment.appearance);

  return (
    <div tw={`flex flex-col w-[1160px] border border-[${palette.gridLine}]`}>
      <TableRow columns={columns} cells={columns.map((column) => column.title)} palette={palette} isHeader />
      {rows.map((cells, rowIndex) => (
        <TableRow key={rowIndex} columns={columns} cells={cells} palette={palette} />
      ))}
    </div>
  );
}

function TableRow(props: {
  columns: MonitorTableColumn[];
  cells: ReactNode[];
  palette: SchedulePalette;
  isHeader?: boolean;
}) {
  const { columns, cells, palette, isHeader = false } = props;

  return (
    <div
      tw={cn(`flex h-[${ROW_HEIGHT}px]`, {
        [`bg-[${palette.skeletonOverlay}]`]: isHeader,
        [`border-t border-[${palette.gridLine}]`]: !isHeader,
      })}
    >
      {cells.map((cell, columnIndex) => (
        <div
          key={columnIndex}
          tw={cn(
            `flex items-center px-[16px] w-[${columns[columnIndex]?.width}px] text-[18px] text-[${palette.heading}]`,
            {
              [`border-l border-[${palette.gridLine}]`]: columnIndex > 0,
              "font-bold": isHeader,
            },
          )}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}
