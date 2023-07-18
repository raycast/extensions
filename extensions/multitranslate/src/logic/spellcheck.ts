import { chmodSync } from 'node:fs'
import { join } from 'node:path'
import { execa } from 'execa'
import { environment } from '@raycast/api'

const filepath = join(environment.assetsPath, 'spellcheck')
// Raycast will copy assets without execute permission
chmodSync(filepath, 0o755)

export async function spellcheck(text: string): Promise<string | false> {
  // We use a sub process here because Raycast
  // does not support bundling native bindings
  try {
    const { stdout: corrected } = await execa(filepath, [text])
    return text === corrected ? false : corrected
  }
  catch (e) {
    console.error(e)
    return false
  }
}
