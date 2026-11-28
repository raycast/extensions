import { List } from "@raycast/api";
import { Model } from "../types";
import { firstImage, outputItems, sizedImage } from "../utils/output";

const IMAGE_WIDTH = 200;

const exampleImage = (model?: Model) => {
  const example = model?.default_example;
  return example ? firstImage(outputItems(example.output)) : undefined;
};

type Props = {
  model: Model;
  full?: Model;
};
export const ModelDetailPane = ({ model, full }: Props) => {
  const details = full ?? model;
  const image = exampleImage(full) ?? details.cover_image_url ?? undefined;
  const prompt = full?.default_example?.input?.prompt?.trim();

  const links = [
    details.github_url ? `[Source](${details.github_url})` : undefined,
    details.paper_url ? `[Paper](${details.paper_url})` : undefined,
    details.license_url ? `[License](${details.license_url})` : undefined,
  ].filter(Boolean);

  const markdown = [
    image ? `![${details.name}](${sizedImage(image, IMAGE_WIDTH)})` : undefined,
    `**${details.owner}/${details.name}**`,
    details.description,
    prompt ? `**Example prompt** — ${prompt}` : undefined,
    links.length ? links.join("  ·  ") : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return <List.Item.Detail markdown={markdown} />;
};
