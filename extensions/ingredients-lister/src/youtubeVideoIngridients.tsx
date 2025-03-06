import {
  ActionPanel,
  Action,
  Icon,
  List,
  environment,
  AI,
  Toast,
  showToast,
  popToRoot,
  LaunchProps,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import ytdl from "ytdl-core";
import { useEffect, useState } from "react";
import getVideoTranscript from "./utils/getVideoTranscript";
import getVideoData from "./utils/getVideoData";
import type { VideoDataTypes } from "./utils/getVideoData";

export default function Command(props: LaunchProps) {
  const { url } = props.arguments;
  const [transcript, setTranscript] = useState<string | undefined>();

  const [videoData, setVideoData] = useState<VideoDataTypes>();
  if (!ytdl.validateURL(url) && !ytdl.validateID(url)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL/ID",
      message: "The passed URL/ID is invalid, please check your input.",
    });
    popToRoot();
    return;
  }
  useEffect(() => {
    getVideoTranscript(url).then(setTranscript);
    getVideoData(url).then(setVideoData);
  }, [url]);

  if (environment.canAccess(AI)) {
    try {
      const { data, isLoading } = useAI(
        `I will input an entire website that has to do with cooking a recipe.
          In a json with the name of the ingredient followed by its quantity (provide units), you will tell me all the ingredients I need to cook the food.
          Remember to ONLY return a JSON, and never add any other aknowledging text.
          Here's an example of the format I expect you to provide in your response:
          {
          "Ingredient": "Quantity With Units In SI and Metric equivalent rounded in parenthesis",
          }
          If no recipes are found, then return
          {
          "No ingredients found": "Please use a valid cooking video"
          }
          \n${transcript}
          `
      );

      if (isLoading) {
        // return a loading indicator
        return <List isLoading />;
      } else if (data) {
        // parse the data and render as a list
        const parsedData = JSON.parse(data);
        const items = Object.entries(parsedData).map(([ingredient, quantity]) => ({
          title: ingredient,
          accessory: {
            text: quantity,
          },
        }));

        return (
          <List>
            <List.Section title="Video Information">
              <List.Item
                title={String(videoData?.title)}
                subtitle={videoData?.ownerChannelName}
                icon={Icon.Video}
                actions={
                  <ActionPanel title="#1 in raycast/extensions">
                    <Action.OpenInBrowser url={url} />
                  </ActionPanel>
                }
              />
            </List.Section>
            <List.Section title={`Ingredients: (AI tends to make mistakes so use at your own risk)`}>
              {items.map((item) => (
                <List.Item
                  key={item.title}
                  title={item.title}
                  accessories={[{ text: String(item.accessory.text) }]}
                  icon={Icon.Circle}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Ingredient with Quantity"
                        content={`${String(item.title)} - ${String(item.accessory.text)}`}
                      />
                      <Action.Paste
                        title="Paste Ingredient with Quantity"
                        content={`${String(item.title)} - ${String(item.accessory.text)}`}
                      />
                      <Action.CopyToClipboard title="Copy Ingredient" content={String(item.title)} />
                      <Action.Paste title="Paste Ingredient" content={String(item.accessory.text)} />
                      <Action.CopyToClipboard title="Copy Quantity" content={String(item.accessory.text)} />
                      <Action.Paste title="Paste Quantity" content={String(item.accessory.text)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </List>
        );
      }
    } catch (error) {
      console.log("An error occurred while using AI:", error);
    }
  } else {
    console.log("No access to AI");
    showToast({ style: Toast.Style.Failure, title: "Error", message: "You do not have access Raycast AI." });
  }

  // fallback to rendering an empty list
  return <List />;
}
