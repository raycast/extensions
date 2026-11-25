export interface ISSHConnection {
  id: string;
  address: string;
  name: string;
  user?: string;
  port?: string;
  sshKey?: string;
  command?: string;
  config?: {
    file: string;
    editable: boolean;
    conditional: boolean;
    fingerprint: string;
    routes?: string[];
    icon?: string;
  };
}
