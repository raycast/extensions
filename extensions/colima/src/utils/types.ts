export interface ColimaInstance {
  name: string;
  status: string;
  arch: string;
  cpus: number;
  memory: number;
  disk: number;
  runtime: string;
  address: string;
}

export interface ColimaCreateOptions {
  profile: string;
  cpus?: number;
  memory?: number;
  disk?: number;
  runtime?: "docker" | "containerd" | "incus";
  vmType?: "qemu" | "vz" | "krunkit";
  kubernetes?: boolean;
}

export interface ColimaTemplateDefaults {
  cpus: number;
  memory: number;
  disk: number;
  runtime: "docker" | "containerd" | "incus";
  vmType: "qemu" | "vz" | "krunkit";
  kubernetes: boolean;
}

export interface DockerContainer {
  id: string;
  names: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  createdAt: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdAt: string;
  createdSince: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}
