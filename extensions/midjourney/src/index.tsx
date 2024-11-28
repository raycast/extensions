import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  CopyImageToClipboardAction,
  DownloadImageAction,
  GenerateAction,
  OpenInBrowserAction,
  RemoveAction,
} from "./components/Actions";
import { ErrorPanel } from "./components/ErrorPanel";
import { GenerationContextProvider, useGenerationContext } from "./contexts/GenerationContext";
import { Details } from "./details";
import { useRefetchGenerations } from "./hooks/useRefetchGenerations";
import { Generation } from "./types";

export default function Main() {
  return (
    <GenerationContextProvider>
      <GenerationGrid />
    </GenerationContextProvider>
  );
}

export function GenerationGrid() {
  const [input, setInput] = useState("");
  const { generations, createGeneration, updateGeneration } = useGenerationContext();
  const [isError, setIsError] = useState(false);
  const onGenerate = async () => {
    setInput("");
    const { success } = await createGeneration(input);
    setIsError(!success);
  };

  useRefetchGenerations(generations, (index, message) => {
    updateGeneration(index, message);
  });

  const sortedGenerations = useMemo(() => {
    return generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [generations]);

  if (isError) {
    return <ErrorPanel />;
  }

  return (
    <Grid
      searchBarPlaceholder={"Search or create..."}
      searchText={input}
      onSearchTextChange={setInput}
      filtering={true}
      actions={
        <ActionPanel>
          <GenerateAction onGenerate={onGenerate} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
        </ActionPanel>
      }
    >
      {sortedGenerations.map((gen) => (
        <GenerationGridItem gen={gen} key={gen.guid} onGenerate={onGenerate} />
      ))}
      <Grid.EmptyView icon={Icon.Boat} title="Create anything!" description="Press enter to generate a new image" />
    </Grid>
  );
}

function GenerationGridItem({ gen, onGenerate }: { gen: Generation; onGenerate: () => void }) {
  return (
    <Grid.Item
      content={gen.uri.length > 1 ? gen.uri : "loading-square.gif"}
      title={gen.prompt}
      subtitle={gen.progress.toLowerCase() === "done" ? " " : gen.progress}
      actions={
        <ActionPanel>
          {gen.guid && <Action.Push title="Show Details" icon={Icon.List} target={<Details selectedId={gen.guid} />} />}
          {gen.hash && (
            <>
              <OpenInBrowserAction id={gen.hash} />
              <CopyImageToClipboardAction imageValues={{ url: gen.uri, id: gen.hash as string }} />
              <DownloadImageAction imageValues={{ url: gen.uri, id: gen.hash as string }} />
            </>
          )}
          {gen.guid && <RemoveAction generation={gen} />}
          <Action.OpenInBrowser
            url={`https://www.midjourney.com/app/`}
            title="Open Midjourney Profile"
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <GenerateAction onGenerate={onGenerate} />
        </ActionPanel>
      }
    />
  );
}
