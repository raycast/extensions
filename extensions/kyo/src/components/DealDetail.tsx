import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Deals, PipelineStages } from "../api/resources";
import type { Deal } from "../api/types";
import { formatCurrency, formatDate, showKyoError } from "../lib/helpers";
import { usePipelines, usePipelineStages } from "../hooks/useLookups";
import { CommentsList, AddCommentForm } from "./DealComments";
import { DealActivityList } from "./DealActivity";
import { DealTasksList } from "./DealTasks";
import { EditDealForm } from "./EditDealForm";
import { LogOutAction } from "./AuthActions";

export function DealDetail({ dealId }: { dealId: string }) {
  const {
    data: deal,
    isLoading,
    revalidate,
  } = useCachedPromise((id: string) => Deals.get(id), [dealId]);
  const { data: pipelines } = usePipelines();
  const { data: stages } = usePipelineStages(deal?.pipeline_id ?? undefined);

  const pipelineName = pipelines.find((p) => p.id === deal?.pipeline_id)?.name;
  const stageName = stages.find((s) => s.id === deal?.pipeline_stage_id)?.name;

  const markdown = deal
    ? [
        `# ${deal.name}`,
        deal.notes ? `\n${deal.notes}` : "",
        deal.website ? `\n**Website:** ${deal.website}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "Loading…";

  async function moveStage(stageId: string) {
    try {
      await Deals.update(dealId, { pipeline_stage_id: stageId });
      await showToast({ style: Toast.Style.Success, title: "Stage updated" });
      revalidate();
    } catch (error) {
      await showKyoError(error, "Failed to move stage");
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={deal?.name ?? "Deal"}
      markdown={markdown}
      metadata={
        deal ? (
          <Detail.Metadata>
            {pipelineName && (
              <Detail.Metadata.Label title="Pipeline" text={pipelineName} />
            )}
            {stageName && (
              <Detail.Metadata.TagList title="Stage">
                <Detail.Metadata.TagList.Item
                  text={stageName}
                  color={Color.Blue}
                />
              </Detail.Metadata.TagList>
            )}
            {deal.value !== undefined && (
              <Detail.Metadata.Label
                title="Value"
                text={formatCurrency(deal.value)}
              />
            )}
            {deal.confidence !== undefined && (
              <Detail.Metadata.Label
                title="Confidence"
                text={`${deal.confidence}%`}
              />
            )}
            {deal.twitter && (
              <Detail.Metadata.Link
                title="Twitter"
                target={deal.twitter}
                text={deal.twitter}
              />
            )}
            {deal.instagram && (
              <Detail.Metadata.Link
                title="Instagram"
                target={deal.instagram}
                text={deal.instagram}
              />
            )}
            <Detail.Metadata.Separator />
            {deal.created_at && (
              <Detail.Metadata.Label
                title="Created"
                text={formatDate(deal.created_at)}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Deal">
            <Action.Push
              title="View Tasks"
              icon={Icon.CheckCircle}
              target={
                <DealTasksList dealId={dealId} title={deal?.name ?? ""} />
              }
            />
            <Action.Push
              title="View Comments"
              icon={Icon.SpeechBubble}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={
                <CommentsList
                  entityType="deal"
                  entityId={dealId}
                  title={deal?.name ?? ""}
                />
              }
            />
            <Action.Push
              title="Add Comment"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              target={
                <AddCommentForm
                  entityType="deal"
                  entityId={dealId}
                  onAdded={revalidate}
                />
              }
            />
            <Action.Push
              title="View Activity"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
              target={
                <DealActivityList dealId={dealId} title={deal?.name ?? ""} />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            {deal && (
              <Action.Push
                title="Edit Deal"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditDealForm deal={deal} onSaved={revalidate} />}
              />
            )}
            <MoveStageSubmenu deal={deal} onMove={moveStage} />
          </ActionPanel.Section>
          <LogOutAction />
        </ActionPanel>
      }
    />
  );
}

function MoveStageSubmenu({
  deal,
  onMove,
}: {
  deal?: Deal;
  onMove: (stageId: string) => void;
}) {
  const { data: stages } = useCachedPromise(
    (pipelineId?: string) =>
      pipelineId
        ? PipelineStages.list({ pipeline_id: pipelineId })
        : Promise.resolve([]),
    [deal?.pipeline_id],
    { initialData: [] },
  );
  if (!deal?.pipeline_id) return null;
  return (
    <ActionPanel.Submenu
      title="Move to Stage"
      icon={Icon.ArrowRight}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    >
      {stages.map((s) => (
        <Action
          key={s.id}
          title={s.name}
          icon={Icon.Circle}
          onAction={() => onMove(s.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
