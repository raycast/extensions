import path from 'node:path'
import { environment } from '@raycast/api'
import { readJSON, writeJSON } from './json'
import type { JikeClientJSON } from 'jike-sdk/index'

export interface ConfigUser extends JikeClientJSON {
  avatarImage: string
}
export interface Config {
  users: ConfigUser[]
}

export const defaultConfig: Config = { users: [] }
export const configPath = path.resolve(environment.supportPath, 'config.json')

export const readConfig = async () => {
  return (await readJSON<Config>(configPath)) || defaultConfig
}

export const writeConfig = async (config: Config) =>
  writeJSON(configPath, config)
