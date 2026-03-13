import { useState } from "react";
import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiModule, Meme } from "../api/types";
import MemeForm from "./MemeForm";
import MemePreview from "./MemePreview";

interface MemeGridProps {
  apiModule: ApiModule;
}

export default function MemeGrid({ apiModule }: MemeGridProps) {
  const [columns, setColumns] = useState(5);

  const {
    isLoading,
    data: allMemes,
    error,
    revalidate,
  } = useFetch<Meme[]>(apiModule.templatesUrl, {
    parseResponse: apiModule.parseTemplates,
    keepPreviousData: true,
  });

  // Show error state if fetch failed
  if (error) {
    return (
      <Grid columns={columns}>
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Templates"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={columns}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value="3" />
          <Grid.Dropdown.Item title="Medium" value="5" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        allMemes?.map((meme, index) => (
          <Grid.Item
            key={`${meme.id}+${index}`}
            content={meme.url}
            title={meme.title}
            keywords={meme.keywords}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.CheckCircle}
                  title="Select Template"
                  target={<MemeForm {...meme} apiModule={apiModule} />}
                />
                <Action.Push icon={Icon.Eye} title="Preview Template" target={<MemePreview {...meme} />} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
