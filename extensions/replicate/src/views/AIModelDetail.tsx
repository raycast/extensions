import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useAIModels } from "../hooks/useAIModels";
import { chatDefaults } from "../lib/ai-models";
import { useModel } from "../hooks/useModel";
import { chatShape } from "../lib/chat";
import { formatAgo } from "../utils/format";
import { firstImage, outputItems } from "../utils/output";
import { ModelForm } from "./ModelForm";

type Status = "kept" | "popular" | "hidden" | "none";
type Tag = { text: string; color: Color };

const STATUS_TAGS: Record<Exclude<Status, "none">, Tag> = {
  kept: { text: "In Raycast AI", color: Color.Green },
  popular: { text: "Popular", color: Color.Blue },
  hidden: { text: "Hidden", color: Color.SecondaryText },
};

const compact = new Intl.NumberFormat(undefined, { notation: "compact" });

const statusOf = (id: string, { kept, hidden, popular }: Record<"kept" | "hidden" | "popular", string[]>): Status => {
  if (kept.includes(id)) return "kept";
  if (hidden.includes(id)) return "hidden";
  if (popular.includes(id)) return "popular";
  return "none";
};

type Props = {
  id: string;
  popular: string[];
};
export const AIModelDetail = ({ id, popular }: Props) => {
  const { data: model, isLoading } = useModel(id);
  const { kept, keptIds, hidden, isLoading: loadingState, add, remove, hide, unhide } = useAIModels();
  const status = statusOf(id, { kept: keptIds, hidden, popular });
  const saved = kept.find((entry) => entry.id === id);
  const shape = chatShape(model);
  const { data: defaults = {} } = usePromise(chatDefaults, [id]);

  const example = model?.default_example;
  const image = (example ? firstImage(outputItems(example.output)) : undefined) ?? model?.cover_image_url;

  const tags = [
    status === "none" ? undefined : STATUS_TAGS[status],
    model?.is_official ? { text: "Official", color: Color.Purple } : undefined,
    shape?.output === "text" ? { text: "Text", color: Color.Orange } : undefined,
    shape?.image ? { text: shape.image.required ? "Needs an Image" : "Edits Images", color: Color.Magenta } : undefined,
    model && !shape ? { text: "Not for Chat", color: Color.Red } : undefined,
  ].filter((tag): tag is Tag => Boolean(tag));

  return (
    <Detail
      isLoading={isLoading || loadingState}
      navigationTitle={id}
      markdown={[model?.description, image && `![${model?.name ?? id}](${image})`].filter(Boolean).join("\n\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Model" text={id} target={`https://replicate.com/${id}`} />
          {tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.text} text={tag.text} color={tag.color} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {Object.keys(defaults).length > 0 && (
            <Detail.Metadata.TagList title="Chat Defaults">
              {Object.entries(defaults).map(([name, value]) => (
                <Detail.Metadata.TagList.Item key={name} text={`${name}: ${String(value)}`} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {saved?.usedAt && <Detail.Metadata.Label title="Last Used" text={formatAgo(saved.usedAt)} />}
          {saved?.addedAt && <Detail.Metadata.Label title="Added" text={formatAgo(saved.addedAt)} />}
          {model?.run_count ? <Detail.Metadata.Label title="Runs" text={compact.format(model.run_count)} /> : null}
          {(model?.github_url || model?.paper_url || model?.license_url) && <Detail.Metadata.Separator />}
          {model?.github_url && <Detail.Metadata.Link title="Source" text="GitHub" target={model.github_url} />}
          {model?.paper_url && <Detail.Metadata.Link title="Paper" text="Read" target={model.paper_url} />}
          {model?.license_url && <Detail.Metadata.Link title="License" text="View" target={model.license_url} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {status === "kept" && (
            <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => remove(id)} />
          )}
          {status === "popular" && (
            <>
              <Action icon={Icon.EyeDisabled} title="Hide from Raycast AI" onAction={() => hide(id)} />
              <Action icon={Icon.Pin} title="Keep in Raycast AI" onAction={() => add(id)} />
            </>
          )}
          {status === "hidden" && <Action icon={Icon.Eye} title="Show in Raycast AI" onAction={() => unhide(id)} />}
          {status === "none" && shape && (
            <Action icon={Icon.PlusCircle} title="Add to Raycast AI" onAction={() => add(id)} />
          )}
          {model && <Action.Push icon={Icon.Play} title="Configure Inputs" target={<ModelForm model={model} />} />}
          <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
          <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
        </ActionPanel>
      }
    />
  );
};
