import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Deals } from "./api/resources";
import { usePipelines, usePipelineStages } from "./hooks/useLookups";
import { formatCurrency, formatDate } from "./lib/helpers";
import { DealDetail } from "./components/DealDetail";
import { EditDealForm } from "./components/EditDealForm";
import { CommentsList, AddCommentForm } from "./components/DealComments";
import { DealTasksList } from "./components/DealTasks";
import CreateDeal from "./create-deal";
import { LogOutAction } from "./components/AuthActions";

export default function SearchDeals() {
  const [pipelineId, setPipelineId] = useState<string>("");

  const { data: pipelines } = usePipelines();
  const { data: stages } = usePipelineStages(pipelineId || undefined);
  const {
    data: deals,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (pid: string) => (pid ? Deals.list({ pipeline_id: pid }) : Deals.list()),
    [pipelineId],
    { initialData: [] },
  );

  const stageName = (id?: string) => stages.find((s) => s.id === id)?.name;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search deals by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by pipeline"
          value={pipelineId}
          onChange={setPipelineId}
        >
          <List.Dropdown.Item title="All pipelines" value="" />
          {pipelines.map((p) => (
            <List.Dropdown.Item key={p.id} title={p.name} value={p.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No deals"
        description="Create your first deal to get started."
        icon={Icon.BullsEye}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Deal"
              icon={Icon.Plus}
              target={<CreateDeal />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {deals.map((deal) => (
        <List.Item
          key={deal.id}
          icon={{ source: Icon.BullsEye, tintColor: Color.Purple }}
          title={deal.name}
          subtitle={formatCurrency(deal.value)}
          accessories={[
            stageName(deal.pipeline_stage_id)
              ? {
                  tag: {
                    value: stageName(deal.pipeline_stage_id)!,
                    color: Color.Blue,
                  },
                }
              : {},
            deal.created_at ? { text: formatDate(deal.created_at) } : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<DealDetail dealId={deal.id} />}
                />
                <Action.Push
                  title="View Tasks"
                  icon={Icon.CheckCircle}
                  target={<DealTasksList dealId={deal.id} title={deal.name} />}
                />
                <Action.Push
                  title="View Comments"
                  icon={Icon.SpeechBubble}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  target={
                    <CommentsList
                      entityType="deal"
                      entityId={deal.id}
                      title={deal.name}
                    />
                  }
                />
                <Action.Push
                  title="Add Comment"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  target={
                    <AddCommentForm entityType="deal" entityId={deal.id} />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Edit">
                <Action.Push
                  title="Edit Deal"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditDealForm deal={deal} onSaved={revalidate} />}
                />
                <Action.Push
                  title="Create Deal"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateDeal />}
                  onPop={revalidate}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <LogOutAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
