import { authorize } from "@api/oauth";
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

export default function Command(props: LaunchProps<{ arguments: Arguments.Imagine }>) {
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
  const { isTokenLoading } = useToken();
  const { data, isLoading, error } = usePromise(async () => {
    const token = await authorize();
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
                  id: output.id,
                  image_url: output.url,
                  generation: {
                    height: data.settings.height,
                    guidance_scale: data.settings.guidance_scale,
                    model_id: data.settings.model_id,
                    prompt: {
                      text: Prompt,
                    },
                    width: data.settings.width,
                  },
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
