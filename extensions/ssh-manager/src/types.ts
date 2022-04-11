export interface ISSHConnection {
  id: string;
  address: string;
  name: string;
  user: string;
  sshKey?: string;
}
