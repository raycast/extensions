import { Form, ActionPanel, Action, Grid, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TGenerationCreateResult, TGenerationFormValues } from "@ts/types";
import { useState } from "react";
import fetch from "node-fetch";
import { aspectRatioToSize, defaultGridColumnsForImagine, modelNameToId } from "@ts/constants";
import { useToken } from "@hooks/useAuthorization";
import LoadingToken from "@components/LoadingToken";
import GalleryItemActions from "@components/GalleryItemActions";
import GridLoading from "@components/GridLoading";
import { formatPrompt } from "@ts/helpers";
import GridError from "@components/GridError";
import { getErrorText } from "@ts/errors";

export default function Command() {
  const { token, isTokenLoading } = useToken();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [generationResult, setGenerationResult] = useState<TGenerationCreateResult | undefined>(undefined);
  const [numOutputs, setNumOutputs] = useState(2);
  const [cleanedPrompt, setCleanedPrompt] = useState("");
  const endpoint = "https://api.stablecog.com/v1/image/generation/create";
  const { handleSubmit } = useForm<TGenerationFormValues>({
    onSubmit: async (values) => {
      const { prompt, model, aspect_ratio, num_outputs } = values;
      const _cleanedPrompt = formatPrompt(prompt);
      if (_cleanedPrompt.length < 1) {
        await showToast({ title: "Prompt is required!", style: Toast.Style.Failure });
        return;
      }
      const generationRequest = {
        prompt: _cleanedPrompt,
        model_id: modelNameToId[model],
        num_outputs: Number(num_outputs),
        width: aspectRatioToSize[aspect_ratio].width,
        height: aspectRatioToSize[aspect_ratio].height,
      };
      setNumOutputs(Number(num_outputs));
      setCleanedPrompt(_cleanedPrompt);
      setIsLoading(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(generationRequest),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const resJson = (await res.json()) as TGenerationCreateResult;
        if (resJson.error) throw new Error(resJson.error);
        setGenerationResult(resJson);
        setIsLoading(false);
      } catch (err) {
        const _err = err instanceof Error ? err.message : "Something went wrong :(";
        setIsLoading(false);
        setError(_err);
        await showToast({ title: getErrorText(_err), style: Toast.Style.Failure });
      }
    },
  });

  if (isTokenLoading) return <LoadingToken />;
  if (error) return <GridError error={error} />;
  if (isLoading) return <GridLoading columns={defaultGridColumnsForImagine} itemCount={numOutputs}></GridLoading>;

  if (generationResult)
    return (
      <Grid columns={defaultGridColumnsForImagine} onSearchTextChange={() => null}>
        {generationResult.outputs.map((output, i) => (
          <Grid.Item
            key={i}
            actions={
              <GalleryItemActions
                item={{
                  id: output.id,
                  image_url: output.url,
                  generation: {
                    guidance_scale: generationResult.settings.guidance_scale,
                    height: generationResult.settings.height,
                    model_id: generationResult.settings.model_id,
                    prompt: {
                      text: cleanedPrompt,
                    },
                    width: generationResult.settings.width,
                  },
                }}
              ></GalleryItemActions>
            }
            content={{
              source: output.url,
            }}
          ></Grid.Item>
        ))}
      </Grid>
    );

  return <ImagineAdvancedForm handleSubmit={handleSubmit} />;
}

function ImagineAdvancedForm({ handleSubmit }: { handleSubmit: (values: TGenerationFormValues) => void }) {
  const [promptError, setPromptError] = useState<string | undefined>(undefined);
  const dropPromptError = () => {
    if (promptError && promptError.length > 0) {
      setPromptError(undefined);
    }
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Imagine" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        onChange={dropPromptError}
        onFocus={dropPromptError}
        onBlur={(event) => {
          const cleaned = formatPrompt(event.target.value);
          if (cleaned.length < 1) {
            setPromptError("Prompt is required!");
          } else {
            dropPromptError();
          }
        }}
        error={promptError}
        placeholder="Portrait of a cat by van Gogh"
        title="Prompt"
        id="prompt"
        autoFocus
      />
      <Form.Dropdown title="Aspect Ratio" id="aspect_ratio" defaultValue="1:1">
        <Form.Dropdown.Item title="Square (1:1)" value="1:1" />
        <Form.Dropdown.Item title="Portrait (2:3)" value="2:3" />
        <Form.Dropdown.Item title="Landscape (3:2)" value="3:2" />
        <Form.Dropdown.Item title="Mobile (9:16)" value="9:16" />
        <Form.Dropdown.Item title="Desktop (16:9)" value="16:9" />
        <Form.Dropdown.Item title="Squarish (4:5)" value="4:5" />
      </Form.Dropdown>
      <Form.Dropdown title="Model" id="model" defaultValue="FLUX.1">
        <Form.Dropdown.Item title="FLUX.1" value="FLUX.1" />
        <Form.Dropdown.Item title="Stable Diffusion 3" value="Stable Diffusion 3" />
        <Form.Dropdown.Item title="Kandinsky 2.2" value="Kandinsky 2.2" />
        <Form.Dropdown.Item value="SDXL" title="SDXL" />
      </Form.Dropdown>
      <Form.Dropdown title="Number of Outputs" id="num_outputs" defaultValue="2">
        <Form.Dropdown.Item title="1" value="1" />
        <Form.Dropdown.Item title="2" value="2" />
        <Form.Dropdown.Item title="4" value="4" />
      </Form.Dropdown>
    </Form>
  );
}
