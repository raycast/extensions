import type { LaunchProps } from "@raycast/api"

import { WorldsGate } from "./components/worlds-gate"
import { type CaptureValues, CaptureForm } from "./views/capture-form"

export default function Command(
  props: LaunchProps<{ draftValues: CaptureValues }>,
) {
  return (
    <WorldsGate>
      {(connection, worlds) => (
        <CaptureForm
          connection={connection}
          worlds={worlds}
          draftValues={props.draftValues}
          enableDrafts
        />
      )}
    </WorldsGate>
  )
}
