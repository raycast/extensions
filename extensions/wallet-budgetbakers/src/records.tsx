import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import RecordForm from "./components/RecordForm";
import { WalletRecord, deleteRecord, getAllRecords } from "./lib/api";
import {
  formatDate,
  formatMoney,
  isTransfer,
  recordSignedMoney,
  startOfMonth,
  toDateParam,
} from "./lib/format";

type Period = "month" | "3months" | "year" | "all";

const PERIODS: { value: Period; title: string }[] = [
  { value: "month", title: "This Month" },
  { value: "3months", title: "Last 3 Months" },
  { value: "year", title: "This Year" },
  { value: "all", title: "All (last 1000)" },
];

function periodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "month":
      return startOfMonth(now);
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export default function Records() {
  const [period, setPeriod] = useState<Period>("month");
  const [searchText, setSearchText] = useState("");

  const {
    data: records,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (selectedPeriod: Period) => {
      const start = periodStart(selectedPeriod);
      const filters = start
        ? { recordDate: [`gte.${toDateParam(start)}`] }
        : {};
      const items = await getAllRecords(filters, 1000);
      return items.sort((a, b) =>
        (b.recordDate ?? "").localeCompare(a.recordDate ?? ""),
      );
    },
    [period],
  );

  const query = searchText.trim().toLowerCase();
  const filtered = (records ?? []).filter((record) => {
    if (!query) return true;
    return [
      record.note,
      record.counterParty,
      record.category?.name,
      record.accountName,
    ]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query));
  });

  async function handleDelete(record: WalletRecord) {
    const money = recordSignedMoney(record);
    const confirmed = await confirmAlert({
      title: "Delete record?",
      message: `${record.counterParty || record.note || record.category?.name || "Record"} · ${formatMoney(money)}`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteRecord(record.id);
      await showToast({ style: Toast.Style.Success, title: "Record deleted" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete record" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by note, payee, category or account…"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Period"
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        >
          {PERIODS.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              value={option.value}
              title={option.title}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Records"
        description="No records in this period or matching this search."
      />
      {filtered.map((record) => {
        const money = recordSignedMoney(record);
        const transfer = isTransfer(record);
        return (
          <List.Item
            key={record.id}
            icon={{
              source: transfer
                ? Icon.Switch
                : money && money.value < 0
                  ? Icon.ArrowDown
                  : Icon.ArrowUp,
              tintColor: transfer
                ? Color.Blue
                : money && money.value < 0
                  ? Color.Red
                  : Color.Green,
            }}
            title={
              record.counterParty ||
              record.note ||
              record.category?.name ||
              "Record"
            }
            subtitle={
              record.note && record.counterParty ? record.note : undefined
            }
            keywords={[
              record.category?.name ?? "",
              record.accountName ?? "",
            ].filter(Boolean)}
            accessories={[
              record.category?.name
                ? {
                    tag: {
                      value: record.category.name,
                      color: record.category.color ?? Color.SecondaryText,
                    },
                  }
                : {},
              { text: record.accountName },
              { text: formatDate(record.recordDate) },
              {
                text: money
                  ? {
                      value: formatMoney(money),
                      color: money.value < 0 ? Color.Red : Color.Green,
                    }
                  : "—",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Record"
                  icon={Icon.Pencil}
                  target={<RecordForm record={record} onDone={revalidate} />}
                />
                <Action.Push
                  title="Add Record"
                  icon={Icon.Plus}
                  target={<RecordForm onDone={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Record"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(record)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                <Action.CopyToClipboard
                  title="Copy Record ID"
                  content={record.id}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
