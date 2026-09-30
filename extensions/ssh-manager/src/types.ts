export interface ISSHConnection {
  id: string;
  address: string;
  name: string;
  user?: string;
  port?: string;
  sshKey?: string;
  command?: string;
}
