import { Action, ActionPanel, Alert, confirmAlert, Grid, Icon, showToast, Toast } from "@raycast/api"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { useEffect, useState } from "react"
import { ImageItem, libraryAspect } from "./components/images.tsx"
import { GrokRuntime } from "./lib/grok.ts"
import { ImageLibrary, type ImageEntry } from "./lib/image-library.ts"
import { openCommand } from "./components/launch.tsx"

export default function ImageHistory() {
  const [entries, setEntries] = useState<Option.Option<ReadonlyArray<ImageEntry>>>(Option.none())

  const reload = () =>
    GrokRuntime.runFork(
      ImageLibrary.use((library) => library.list).pipe(
        Effect.tap((list) => Effect.sync(() => setEntries(Option.some(list)))),
      ),
    )

  useEffect(() => {
    reload()
  }, [])

  const change = (program: Effect.Effect<void, unknown, ImageLibrary>, failure: string) =>
    GrokRuntime.runFork(
      program.pipe(
        Effect.andThen(Effect.sync(reload)),
        Effect.catch(() => Effect.tryPromise(() => showToast({ style: Toast.Style.Failure, title: failure }))),
        Effect.ignore,
      ),
    )

  const remove = async (entry: ImageEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete this image?",
      message: "This removes the image file from this Mac.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })

    if (confirmed) {
      change(
        ImageLibrary.use((library) => library.remove(entry.id)),
        "Could not delete the image",
      )
    }
  }

  const clearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Delete all images?",
      message: "This deletes every image Grok made from this Mac. Copies you saved elsewhere stay.",
      primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
    })

    if (confirmed) {
      change(
        ImageLibrary.use((library) => library.clear),
        "Could not delete the images",
      )
    }
  }

  const generateAction = (
    <Action
      title="Generate Image"
      icon={Icon.Image}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => void openCommand("generate-image")}
    />
  )

  const list = Option.getOrElse(entries, (): ReadonlyArray<ImageEntry> => [])

  return (
    <Grid
      isLoading={Option.isNone(entries)}
      columns={4}
      aspectRatio={libraryAspect(list)}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder="Search prompts"
    >
      <Grid.EmptyView
        icon={Icon.Image}
        title="No images yet"
        description="Run Generate Image or Edit Image to add one."
        actions={<ActionPanel>{generateAction}</ActionPanel>}
      />
      {list.map((entry) => (
        <ImageItem
          key={entry.id}
          entry={entry}
          extra={
            <>
              {generateAction}
              <Action
                title="Delete Image"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => void remove(entry)}
              />
              <Action
                title="Delete All Images"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={clearAll}
              />
            </>
          }
        />
      ))}
    </Grid>
  )
}
