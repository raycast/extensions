import { Form, ActionPanel, Action, Grid, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TUpscaleCreateResult, TUpscaleCreationOutput, TUpscaleFormValues } from "@ts/types";
import { useState } from "react";
import { readFile } from "fs/promises";
import fetch from "node-fetch";
import { FormData, File } from "formdata-node";
import { loadingGif } from "@ts/constants";
import imageSizeOf from "image-size";
import { useToken } from "@hooks/useAuthorization";
import LoadingToken from "@components/LoadingToken";
import UpscaleOutputActions from "@components/UpscaleOutputActions";
import GridLoading from "@components/GridLoading";
import GridSomethingWentWrong from "@components/GridError";
import { getErrorText } from "@ts/errors";

const allowedExtensions = ["png", "jpg", "jpeg", "webp"];
const maxSquareSize = 1024;
const maxMegapixels = maxSquareSize * maxSquareSize;

export default function Command() {
  const { token, isTokenLoading } = useToken();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [upscaleOutput, setUpscaleOutput] = useState<TUpscaleCreationOutput | undefined>(undefined);
  const endpoint = "https://api.stablecog.com/v1/image/upscale/create";
  const { handleSubmit } = useForm<TUpscaleFormValues>({
    onSubmit: async (values) => {
      const imagePath = values.images[0];
      if (imagePath === undefined) {
        await showToast({ title: "Please select an image", style: Toast.Style.Failure });
        return;
      }
      const buffer = await readFile(imagePath);
      const imageName = imagePath.split("/").pop();
      if (imageName === undefined) {
        await showToast({ title: "Please select a valid image", style: Toast.Style.Failure });
        return;
      }
      const extension = imageName.split(".").pop();
      if (extension === undefined || !allowedExtensions.includes(extension)) {
        await showToast({ title: `Only PNG, JPEG, and WEBP is allowed`, style: Toast.Style.Failure });
        return;
      }
      const imageSize = imageSizeOf(buffer);
      if (!imageSize.width || !imageSize.height || imageSize.width * imageSize.height > maxMegapixels) {
        await showToast({
          title: `Image can't be bigger than ${maxSquareSize} × ${maxSquareSize}`,
          style: Toast.Style.Failure,
        });
        return;
      }

      const form = new FormData();
      const file = new File([buffer], imageName);
      form.append("file", file);
      setIsLoading(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: form,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const resJson = (await res.json()) as TUpscaleCreateResult;
        if (resJson.error) {
          throw new Error(resJson.error);
        }
        const url = resJson.outputs[0].url;
        const id = resJson.outputs[0].id;
        if (!url || !id) throw new Error("No url found!");
        setUpscaleOutput({ url, id: id });
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
  if (error) return <GridSomethingWentWrong error={error} />;
  if (isLoading) return <GridLoading columns={2} itemCount={1} />;

  if (upscaleOutput)
    return (
      <Grid isLoading={isLoading} columns={2} onSearchTextChange={() => null}>
        <Grid.Item
          actions={upscaleOutput && <UpscaleOutputActions item={upscaleOutput}></UpscaleOutputActions>}
          key={"upscaled-image"}
          content={{
            source: isLoading ? loadingGif : upscaleOutput?.url || loadingGif,
          }}
        ></Grid.Item>
      </Grid>
    );

  return <UpscaleForm handleSubmit={handleSubmit} />;
}

function UpscaleForm({ handleSubmit }: { handleSubmit: (values: TUpscaleFormValues) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Upscale Image" />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="Image" autoFocus allowMultipleSelection={false} id="images"></Form.FilePicker>
    </Form>
  );
}
