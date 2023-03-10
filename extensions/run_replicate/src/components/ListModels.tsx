import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import DetailModel from "./DetailModel";
import fetch from "node-fetch";
import { Model } from "../models";

interface Result {
  models: Model[];
}

export default function ListModels(props: { token: string; collection: string }) {
  const [models, setModels] = useState<Model[]>([]);

  async function getModels(collection: string) {
    const response = await fetch(`https://api.replicate.com/v1/collections/${collection}`, {
      method: "GET",
      headers: {
        Authorization: `Token ${props.token}`,
        "Content-Type": "application/json",
      },
    });

    const result: Result = (await response.json()) as Result;
    setModels(result.models);

    return JSON.stringify(result.models);
  }

  useEffect(() => {
    getModels(props.collection);
  });

  return (
    <Grid columns={5}>
      <Grid.Section title="Text to Image Models">
        {models.map((model) => (
          <Grid.Item
            key={model.latest_version?.id}
            title={model.name}
            content={"🖼️"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={<DetailModel token={props.token} modelOwner={model.owner} modelName={model.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
