import { ActionPanel, Detail } from "@raycast/api";
import { useSelectedGenerationContext } from "../contexts/SelectedGenerationContext";
import { CopyImageToClipboardAction, DownloadImageAction, MidjourneyActions, OpenInBrowserAction } from "./Actions";

export function GenerationDetails() {
  const { selectedGeneration } = useSelectedGenerationContext();
  const isLoading = selectedGeneration.progress.toLowerCase() !== "done";

  const url = selectedGeneration.uri.length > 0 ? selectedGeneration.uri : "loading-square.gif";

  return (
    <Detail
      markdown={`![](${url}?raycast-width=350&raycast-height=350)`}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={selectedGeneration.prompt} />

          {isLoading && <Detail.Metadata.Label title="Progress" text={selectedGeneration.progress} />}
          <Detail.Metadata.Label
            title="Dimensions"
            text={`${selectedGeneration.width || 1024}x${selectedGeneration.height || 1024}`}
          />
          <Detail.Metadata.Label
            title="Date"
            text={new Date(selectedGeneration.timestamp).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />

          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={selectedGeneration.type} color={"#add8e6"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {selectedGeneration.options?.map((option) => (
              <MidjourneyActions option={option} />
            ))}
          </ActionPanel.Section>
          {selectedGeneration.hash && (
            <ActionPanel.Section>
              <OpenInBrowserAction id={selectedGeneration.hash} />
              <CopyImageToClipboardAction
                imageValues={{ url: selectedGeneration.uri, id: selectedGeneration.hash as string }}
              />
              <DownloadImageAction
                imageValues={{ url: selectedGeneration.uri, id: selectedGeneration.hash as string }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
