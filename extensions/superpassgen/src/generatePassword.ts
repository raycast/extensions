import { getPreferenceValues } from '@raycast/api'
import { generate, GenerationOptions } from 'supergenpass-lib'

type Preferences = {
  secret: string
  hashRounds: string
  length: string
  method: 'sha512' | 'md5'
  passthrough: boolean
  removeSubdomains: boolean
}

function getOptions(): GenerationOptions {
  const { hashRounds, length, ...options } = getPreferenceValues<Preferences>()

  return {
    length: parseInt(length, 10),
    hashRounds: parseInt(hashRounds, 10),
    ...options,
  }
}

export function generatePassword(masterPassword: string, uri: string) {
  return new Promise<string>(resolve =>
    generate(masterPassword, uri, getOptions(), password => resolve(password))
  )
}
