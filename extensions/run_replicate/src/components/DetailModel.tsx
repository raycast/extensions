import { useEffect, useState } from "react";
import { ActionPanel, Action, Detail } from "@raycast/api";
import RenderForm from "./Form";
import fetch from "node-fetch";
import { Model } from "../models";

export default function DetailModel(props: { token: string; modelOwner: string; modelName: string }) {
  const [model, setModel] = useState<Model>({} as Model);
  const [markdown, setMarkdown] = useState("");

  async function getModel(owner: string, name: string) {
    const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      method: "GET",
      headers: {
        Authorization: `Token ${props.token}`,
        "Content-Type": "application/json",
      },
    });

    const result = (await response.json()) as Model;
    setModel(result);

    return JSON.stringify(result);
  }

  useEffect(() => {
    getModel(props.modelOwner, props.modelName);

    const markdown = `
  # ${model.name}

  ![](${model.github_user})

  ### Description
  ${model.description}
  `;

    setMarkdown(markdown);
  });

  return (
    <Detail
      markdown={markdown}
      navigationTitle={model.name}
      actions={
        <ActionPanel>
          <Action.Push title="Run Model" target={<RenderForm token={props.token} modelName={model.name} />} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Owner" text={model.owner} />
          <Detail.Metadata.Label title="Description" text={model.description} />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={model.visibility || "private"} color={"#eed535"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Replicate" target={model.url} text="Replicate" />
          <Detail.Metadata.Link title="GitHub" target={model.github_url || ""} text="GitHub" />
          <Detail.Metadata.Link title="Replicate" target={model.url} text="Replicate" />
        </Detail.Metadata>
      }
    />
  );
}
