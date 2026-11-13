import { Action, ActionPanel, Color, Icon, List, openCommandPreferences } from "@raycast/api";
import { fileURLToPath } from "node:url";
import { useSavedOutputs } from "../hooks/useSavedOutputs";
import { isSaved, predictionItems } from "../lib/history";
import { Prediction } from "../types";
import { firstImage, previewMarkdown } from "../utils/output";
import { STATUS_COLORS } from "../utils/status";
import { PredictionActions } from "./PredictionActions";
import { PredictionDetail } from "./PredictionDetail";

type Props = {
  predictions?: Prediction[];
  isLoading: boolean;
  error?: Error;
  pagination?: List.Props["pagination"];
  revalidate: () => void;
};
export const PredictionList = ({ predictions, isLoading, error, pagination, revalidate }: Props) => {
  const { saved } = useSavedOutputs();

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could Not Load Predictions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Update Token" onAction={openCommandPreferences} />
              <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search your prompts">
      {!isLoading && (
        <List.EmptyView
          icon={{ source: "🚀" }}
          title="No Predictions Found"
          description="Replicate deletes outputs about an hour after they run, so only images saved on this computer stay. Find models to run at replicate.com/explore"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} url="https://replicate.com/explore" />
            </ActionPanel>
          }
        />
      )}
      {predictions?.map((prediction) => {
        const items = predictionItems(prediction, saved);
        const image = firstImage(items);
        const icon = image && isSaved(image) ? fileURLToPath(image) : image;
        const prompt = prediction.input?.prompt?.trim();

        return (
          <List.Item
            key={prediction.id}
            icon={{ source: icon ?? Icon.Image, tintColor: icon ? undefined : Color.SecondaryText }}
            title={prompt || prediction.model || prediction.id}
            keywords={[prediction.model ?? "", prediction.status]}
            accessories={[
              {
                icon: { source: Icon.CircleFilled, tintColor: STATUS_COLORS[prediction.status] },
                tooltip: prediction.status,
              },
            ]}
            detail={<List.Item.Detail markdown={previewMarkdown(prediction, items)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Sidebar}
                  title="View Prediction"
                  target={<PredictionDetail id={prediction.id} initial={prediction} />}
                />
                <PredictionActions prediction={prediction} items={items} revalidate={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
