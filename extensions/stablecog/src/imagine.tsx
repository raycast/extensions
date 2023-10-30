import GalleryItemActions from "@components/GalleryItemActions";
import GridError from "@components/GridError";
import GridLoading from "@components/GridLoading";
import LoadingToken from "@components/LoadingToken";
import { useToken } from "@hooks/useAuthorization";
import { Grid, LaunchProps, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { aspectRatioToSize, defaultGridColumnsForImagine, modelNameToId } from "@ts/constants";
import { getErrorText } from "@ts/errors";
import { TGenerationCreateResult } from "@ts/types";
import fetch from "node-fetch";
import { useEffect } from "react";

export default function Command(props: LaunchProps<{ arguments: Arguments.Imagine }>) {
  const { token, isTokenLoading } = useToken();
  const { Prompt } = props.arguments;
  const endpoint = "https://api.stablecog.com/v1/image/generation/create";
  const { model, aspect_ratio, num_outputs } = getPreferenceValues<Preferences>();
  const size = aspectRatioToSize[aspect_ratio];
  const num_outputs_int = Number(num_outputs);
  const generationParams = {
    prompt: Prompt,
    num_outputs: num_outputs_int,
    model_id: modelNameToId[model] ?? undefined,
    width: size.width,
    height: size.height,
  };
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    if (isTokenLoading || token === undefined) return null;
    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(generationParams),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const resJson = (await res.json()) as TGenerationCreateResult;
    if (resJson.error) throw new Error(getErrorText(resJson.error));
    return resJson;
  });

  useEffect(() => {
    if (isTokenLoading || token === undefined) return;
    revalidate();
  }, [Prompt, token, isTokenLoading]);

  if (isTokenLoading) return <LoadingToken />;
  if (error) return <GridError error={error.message} />;
  if (isLoading || !data)
    return <GridLoading columns={defaultGridColumnsForImagine} itemCount={num_outputs_int}></GridLoading>;

  return (
    <Grid columns={defaultGridColumnsForImagine} onSearchTextChange={() => null}>
      {data.outputs.map((output, i) => (
        <Grid.Item
          key={i}
          actions={
            data?.outputs[i] && (
              <GalleryItemActions
                item={{
                  guidance_scale: data.settings.guidance_scale,
                  height: data.settings.height,
                  id: output.id,
                  image_url: output.url,
                  inference_steps: data.settings.inference_steps,
                  model_id: data.settings.model_id,
                  prompt_text: Prompt,
                  scheduler_id: data.settings.scheduler_id,
                  width: data.settings.width,
                }}
              ></GalleryItemActions>
            )
          }
          content={{
            source: output.url,
          }}
        ></Grid.Item>
      ))}
    </Grid>
  );
}
