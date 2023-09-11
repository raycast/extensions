export interface ISSHConnection {
  id: string;
  address: string;
  name: string;
  user?: string;
  port?: string;
  sshKey?: string;
  command?: string;
  subtitle?: string; // Can be used to force a specific subtitle for the host. if not provided - subtitle will be generated from connection details
}
