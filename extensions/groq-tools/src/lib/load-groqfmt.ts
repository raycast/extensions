import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { environment } from '@raycast/api'
import { type Groqfmt } from '@groqfmt/wasm'

export default async function loadGroqfmt(): Promise<Groqfmt> {
  const go = new Go()
  const wasmBuffer = await readFile(
    join(environment.assetsPath, 'groqfmt.wasm'),
  )
  const { instance } = await WebAssembly.instantiate(
    wasmBuffer,
    go.importObject,
  )
  go.run(instance)
  return groqfmt
}
