import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import { signalIcon } from "./utils";
interface PulseItem {
  type: string;
  headline: string;
  instrument?: string;
  isin?: string;
  explanation: string;
  suggestedAction?: string;
}

interface PulseResult {
  status: "ok" | "empty" | "expired";
  summary?: string;
  items?: PulseItem[];
  createdAt?: string;
}

export default function Pulse() {
  const [data, setData] = useState<PulseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPulse = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.pulse() as PulseResult;
      setData(result);
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load pulse", message: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      showToast({ style: Toast.Style.Animated, title: "Generating pulse..." });
      const result = await api.generatePulse() as PulseResult;
      setData(result);
      showToast({ style: Toast.Style.Success, title: "Pulse generated" });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to generate pulse", message: String(e) });
    } finally {
      setGenerating(false);
    }
  };

  const isEmpty = !isLoading && (!data || data.status === "empty" || data.status === "expired" || !(data.items?.length));

  if (isEmpty) {
    return (
      <List>
        <List.EmptyView
          title={data?.status === "expired" ? "Pulse Expired" : "No Pulse Yet"}
          description="Generate a fresh portfolio pulse with AI analysis"
          icon={Icon.Heartbeat}
          actions={
            <ActionPanel>
              <Action
                title="Generate Pulse"
                icon={Icon.Wand}
                onAction={handleGenerate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const items = data?.items ?? [];

  return (
    <List isLoading={isLoading || generating} isShowingDetail>
      {items.map((item, i) => (
        <List.Item
          key={i}
          icon={signalIcon(item.type)}
          title={item.headline}
          accessories={[{ tag: item.type }]}
          detail={
            <List.Item.Detail
              markdown={`${item.instrument ? `**${item.instrument}**\n\n` : ""}${item.explanation}${item.suggestedAction ? `\n\n---\n\n**Suggested Action:** ${item.suggestedAction}` : ""}`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Regenerate" icon={Icon.ArrowClockwise} onAction={handleGenerate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
