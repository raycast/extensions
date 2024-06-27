import { join } from 'path'
import { chmod } from 'fs/promises'
import { environment } from '@raycast/api'
import type { ExecaError } from 'execa'
import { execa } from 'execa'

const screenshot = async() => {
  const command = join(environment.assetsPath, 'screenshot')
  await chmod(command, '755')
  try {
    const { stdout } = await execa(command)

    return stdout
  }
  catch (error) {
    if ((error as ExecaError).stdout === 'No text selected') {
      return undefined
    }
    else {
      throw error
    }
  }
}

export { screenshot }
