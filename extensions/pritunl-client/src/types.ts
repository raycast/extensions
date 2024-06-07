export type Preferences = {
  twoStepKey: string;
  pin: string;
}

export type Profile = {
  "id": string,
  "name": string,
  "state": "Enable" | "Disabled",
  "run_state": "Inactive" | "Active",
  "registration_key": string,
  "connected": boolean,
  "uptime": number,
  "status": "Disconnected" | "Connecting",
  "server_address": string,
  "client_address": string
}

export type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T; // from lodash
