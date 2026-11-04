import { Form, getSelectedFinderItems } from "@raycast/api"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { useEffect, useState } from "react"
import { ImageForm, isEditableImage } from "./components/images.tsx"
import { GrokRuntime } from "./lib/grok.ts"
import { MAX_SOURCE_IMAGES } from "./lib/images.ts"

/** The images selected in Finder, if any. Finder may not be frontmost, or the host may not support it. */
const selectedImages = Effect.tryPromise(() => getSelectedFinderItems()).pipe(
  Effect.map((items) =>
    Arr.take(
      Arr.filter(
        Arr.map(items, (item) => item.path),
        isEditableImage,
      ),
      MAX_SOURCE_IMAGES,
    ),
  ),
  Effect.orElseSucceed((): ReadonlyArray<string> => []),
)

export default function EditImage() {
  const [sources, setSources] = useState<Option.Option<ReadonlyArray<string>>>(Option.none())

  useEffect(() => {
    GrokRuntime.runFork(
      selectedImages.pipe(Effect.tap((paths) => Effect.sync(() => setSources(Option.some(paths))))),
    )
  }, [])

  // The form reads its default images once, so wait for the Finder selection.
  return Option.match(sources, {
    onNone: () => <Form isLoading />,
    onSome: (paths) => <ImageForm edit initial={{ sources: paths }} />,
  })
}
