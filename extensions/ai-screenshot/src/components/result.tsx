import { Grid, PopToRootType, Toast, closeMainWindow, environment, popToRoot, showToast } from "@raycast/api";
import path from "path";

import OpenAI from "openai";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ImageActionPanel } from "../actions/ImageActionPanel";
import { generateModification } from "../utils/modification";
import { takeScreenshot } from "../utils/screenshot";

export interface ModificationGridProps {
  modificationPrompt: string;
  client: OpenAI;
}

export function ModificationGrid(props: ModificationGridProps) {
  const { modificationPrompt, client } = props;
  const [error, setError] = useState<Error>();
  const [modificationURLs, setModificationURLs] = useState<string[]>([]);

  const screenshotPath = path.join(environment.supportPath, `${uuidv4()}.png`);

  useEffect(() => {
    const getModification = async () => {
      closeMainWindow({ popToRootType: PopToRootType.Suspended });
      try {
        await takeScreenshot(screenshotPath);
        await generateModification(client, screenshotPath, modificationPrompt).then((url) => {
          setModificationURLs((modificationURLs) => [...modificationURLs, url]);
        });
      } catch (error) {
        setError(error as Error);
      }
    };
    getModification();
  }, []);

  useEffect(() => {
    const handleErrors = async () => {
      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: error.message,
        });
        popToRoot();
      }
    };
    handleErrors();
  }, [error]);

  return (
    <Grid columns={3}>
      {modificationURLs.map((imageUrl) => (
        <Grid.Item content={{ source: imageUrl }} key={imageUrl} actions={<ImageActionPanel url={imageUrl} />} />
      ))}
    </Grid>
  );
}
