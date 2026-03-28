import { exec } from "node:child_process"
import { environment } from "@raycast/api"
import { join } from "node:path"

// Plays a fast F# major scale (F#, G#, A#, B, C#).
const SCALE = [6, 8, 10, 11, 13]
const INTERVAL = 0.13

export function playSound(): void {
  const assetsPath = environment.assetsPath
  const plays = SCALE.map((note, i) => {
    const file = join(assetsPath, `chime-${note}.aiff`)
    return `sleep ${(i * INTERVAL).toFixed(2)} && afplay "${file}"`
  }).join(" & ")
  exec(`sh -c '${plays}'`)
}
