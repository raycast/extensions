export type AppleScriptResponse = string;

export interface AppleScriptParser {
  parse(input: AppleScriptResponse): Array<SoundOutputDevice>;
  parseDeviceNames(input: AppleScriptResponse): Array<string>;
  parseDeviceConnections(input: AppleScriptResponse): Array<boolean>;
}

export interface SoundOutputDevice {
  name: string;
  isConnected: boolean;
}

export interface SoundOutputServiceConfig {
  parser: AppleScriptParser;
}

export interface SoundOutputService {
  config: SoundOutputServiceConfig;
  fetchDevices(): Promise<Array<SoundOutputDevice>>;
  connectToDevice(name: string): Promise<boolean>;
}
