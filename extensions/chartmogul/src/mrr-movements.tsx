import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useActivities, ActivitiesOptions } from "./api";
import { subMonths, format } from "date-fns";
import { useState, useMemo } from "react";
import { formatCurrency } from "./util";

type MovementType = "all" | "new_biz" | "reactivation" | "expansion" | "contraction" | "churn";

const movementTypes: Array<{ value: MovementType; label: string }> = [
  { value: "all", label: "All Movements" },
  { value: "new_biz", label: "New Business" },
  { value: "reactivation", label: "Reactivations" },
  { value: "expansion", label: "Expansions" },
  { value: "contraction", label: "Contractions" },
  { value: "churn", label: "Churn" },
];

function getMovementTypeIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "new_biz":
      return { source: Icon.Plus, tintColor: Color.Green };
    case "reactivation":
      return { source: Icon.ArrowCounterClockwise, tintColor: Color.Blue };
    case "expansion":
      return { source: Icon.ArrowUp, tintColor: Color.Green };
    case "contraction":
      return { source: Icon.ArrowDown, tintColor: Color.Orange };
    case "churn":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
}

export default function Command() {
  const [movementType, setMovementType] = useState<MovementType>("all");

  const options: ActivitiesOptions = useMemo(() => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);

    const opts: ActivitiesOptions = {
      "start-date": startDate.toISOString().split("T")[0],
      "end-date": endDate.toISOString().split("T")[0],
      order: "-date",
      "per-page": 100,
    };

    if (movementType !== "all") {
      opts.type = movementType as ActivitiesOptions["type"];
    }

    return opts;
  }, [movementType]);

  const { data, isLoading, error } = useActivities(options);

  if (error) {
    return (
      <List>
        <List.Item
          title="Error loading MRR movements"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Movement Type"
          storeValue
          onChange={(value) => setMovementType(value as MovementType)}
          value={movementType}
        >
          <List.Dropdown.Section title="Movement Type">
            {movementTypes.map((type) => (
              <List.Dropdown.Item key={type.value} title={type.label} value={type.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data?.entries?.map((entry) => (
        <List.Item
          key={entry.uuid}
          title={entry["customer-name"]}
          subtitle={`${entry.description} on ${format(new Date(entry.date), "MMM dd")}`}
          icon={getMovementTypeIcon(entry.type)}
          accessories={[
            {
              text: formatCurrency(entry["activity-mrr-movement"] / 100, entry.currency),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard content={entry["customer-external-id"]} title="Copy Customer ID" />
                <Action.CopyToClipboard content={entry["customer-name"]} title="Copy Customer Name" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Customer" text={entry["customer-name"]} />
                  <List.Item.Detail.Metadata.Label title="External ID" text={entry["customer-external-id"] || "N/A"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Movement Type"
                    text={entry.type.replace("_", " ").toUpperCase()}
                    icon={getMovementTypeIcon(entry.type)}
                  />
                  <List.Item.Detail.Metadata.Label title="Date" text={format(new Date(entry.date), "MMMM dd, yyyy")} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="MRR Movement"
                    text={formatCurrency(entry["activity-mrr-movement"] / 100, entry.currency)}
                    icon={{
                      source: entry["activity-mrr-movement"] >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                      tintColor: entry["activity-mrr-movement"] >= 0 ? Color.Green : Color.Red,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Current MRR"
                    text={formatCurrency(entry["activity-mrr"] / 100, entry.currency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="ARR"
                    text={formatCurrency(entry["activity-arr"] / 100, entry.currency)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Plan" text={entry["plan-external-id"] || "N/A"} />
                  <List.Item.Detail.Metadata.Label
                    title="Subscription"
                    text={entry["subscription-external-id"] || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label title="Currency" text={entry.currency} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
