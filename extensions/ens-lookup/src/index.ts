import { exec } from 'child_process'
import {
  showHUD,
  Clipboard,
  LaunchProps,
  showToast,
  Toast,
  getPreferenceValues,
} from '@raycast/api'

interface Preferences {
  rpcUrl: string
  foundryLocation: string
}

export default async function main({ arguments: args }: LaunchProps) {
  const { rpcUrl, foundryLocation } = getPreferenceValues<Preferences>()

  if (rpcUrl === '') {
    await showHUD('No rpc url given')
    return
  }

  if (foundryLocation === '') {
    await showHUD('No command path given')
    return
  }

  const ensNameInput = args.name
  if (typeof ensNameInput !== 'string') {
    await showHUD('No name given')
    return
  }

  let ensName = ensNameInput.trim()
  if (!ensName.includes('.')) {
    ensName += '.eth'
  }

  const command = `${foundryLocation}/bin/cast resolve-name --rpc-url '${rpcUrl}' ${ensName}`

  await showToast({
    title: 'Resolving ENS name...',
    style: Toast.Style.Animated,
  })

  try {
    const address = await new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error !== null) {
          if (stderr.includes('ens name not found')) {
            reject(new ENSNotFoundError(`ENS name "${ensName}" not found`))
            return
          }

          if (stderr.includes('error sending request for url')) {
            reject(new CantConnectError(`Can't connect to RPC ${rpcUrl}`))
            return
          }

          if (error.code === 127) {
            reject(
              new CastCommandNotFound(
                'Cast command not found. Please install it at https://getfoundry.sh/',
              ),
            )
            return
          }

          reject(error)
          return
        }

        const address = stdout.trim()
        resolve(address)
      })
    })

    await Clipboard.copy(address)
    await showHUD('Copied address to clipboard')
  } catch (e) {
    if (e instanceof ENSNotFoundError) {
      await showHUD(e.message)
      return
    }

    if (e instanceof CantConnectError) {
      await showHUD(e.message)
      return
    }

    if (e instanceof CastCommandNotFound) {
      await showHUD(e.message)
      return
    }

    const message = e instanceof Error ? e.message : (e as string)
    await showHUD(`Unknown error: ${message}`)
  }
}

class CantConnectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CantConnectError'
  }
}

class ENSNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ENSNotFoundError'
  }
}

class CastCommandNotFound extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CastCommandNotFound'
  }
}
