/** One profile as printed by `pritunl-client list -j`. */
export interface Profile {
  id: string;
  name: string;
  system: boolean;
  /** Autostart: "Enabled" or "Disabled" for system profiles, "-" for user profiles. */
  state: string;
  /** "Active" while the client is trying to connect or is connected. */
  run_state: string;
  registration_key: string;
  connected: boolean;
  /** Seconds since the tunnel came up. */
  uptime: number;
  status: string;
  server_address: string;
  client_address: string;
}
