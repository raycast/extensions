import { ActionPanel, Action, Detail } from "@raycast/api";
import { ApodResponse } from "../types/apod";

export default function Apod({ apod, isLoading }: { apod: ApodResponse; isLoading: boolean }) {
  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading Astronomy Picture of the Day 🔭"} />;
  }

  const markdown = `
  # ${apod.title}\n\n
  Date: ${apod.date}\n\n
  ![${apod.title}](${apod.hdurl.toString()})\n\n
  ${apod.explanation}\n\n
  Copyright: ${apod.copyright}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={"https://apod.nasa.gov/apod/astropix.html"} title={"Read More"} />
        </ActionPanel>
      }
    />
  );
}
