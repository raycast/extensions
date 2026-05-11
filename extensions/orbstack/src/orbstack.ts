export interface OrbMachine {
  id: string;
  name: string;
  image: {
    distro: Distro;
    version: string;
    arch: Architecture;
    variant: string;
  };
  config: {
    isolated: boolean;
    default_username: string;
  };
  builtin: boolean;
  state: string;
}

export interface OrbMachineInfo {
  record: OrbMachine;
  disk_size: number;
}

export type Architecture = "arm64" | "amd64";

export type Distro =
  | "alma"
  | "alpine"
  | "arch"
  | "centos"
  | "debian"
  | "devuan"
  | "fedora"
  | "gentoo"
  | "kali"
  | "nixos"
  | "openeuler"
  | "opensuse"
  | "oracle"
  | "rocky"
  | "ubuntu"
  | "void";

export const ORB_CTL = "orbctl";

export const DISTROS: { value: Distro; title: string }[] = [
  { value: "alma", title: "AlmaLinux" },
  { value: "alpine", title: "Alpine Linux" },
  { value: "arch", title: "Arch Linux" },
  { value: "centos", title: "CentOS" },
  { value: "debian", title: "Debian" },
  { value: "devuan", title: "Devuan" },
  { value: "fedora", title: "Fedora" },
  { value: "gentoo", title: "Gentoo" },
  { value: "kali", title: "Kali Linux" },
  { value: "nixos", title: "NixOS" },
  { value: "openeuler", title: "openEuler" },
  { value: "opensuse", title: "openSUSE" },
  { value: "oracle", title: "Oracle Linux" },
  { value: "rocky", title: "Rocky Linux" },
  { value: "ubuntu", title: "Ubuntu" },
  { value: "void", title: "Void Linux" },
];

export const ARCHITECTURES: { value: Architecture; title: string }[] = [
  { value: "arm64", title: "arm64" },
  { value: "amd64", title: "x86_64" },
];
