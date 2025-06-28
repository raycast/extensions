interface MachineTypeInfo {
  name: string;
  description: string;
}

interface DiskTypeInfo {
  name: string;
  title: string;
  description: string;
}

interface ImageProjectInfo {
  name: string;
  title: string;
}

interface ImageFamilyInfo {
  name: string;
  title: string;
}

export const machineTypes: Record<string, MachineTypeInfo[]> = {
  "n1-standard": [
    { name: "n1-standard-1", description: "1 vCPU, 3.75 GB RAM" },
    { name: "n1-standard-2", description: "2 vCPUs, 7.5 GB RAM" },
    { name: "n1-standard-4", description: "4 vCPUs, 15 GB RAM" },
    { name: "n1-standard-8", description: "8 vCPUs, 30 GB RAM" },
    { name: "n1-standard-16", description: "16 vCPUs, 60 GB RAM" },
    { name: "n1-standard-32", description: "32 vCPUs, 120 GB RAM" },
    { name: "n1-standard-64", description: "64 vCPUs, 240 GB RAM" },
    { name: "n1-standard-96", description: "96 vCPUs, 360 GB RAM" },
  ],
  "n2-standard": [
    { name: "n2-standard-2", description: "2 vCPUs, 8 GB RAM" },
    { name: "n2-standard-4", description: "4 vCPUs, 16 GB RAM" },
    { name: "n2-standard-8", description: "8 vCPUs, 32 GB RAM" },
    { name: "n2-standard-16", description: "16 vCPUs, 64 GB RAM" },
    { name: "n2-standard-32", description: "32 vCPUs, 128 GB RAM" },
    { name: "n2-standard-48", description: "48 vCPUs, 192 GB RAM" },
    { name: "n2-standard-64", description: "64 vCPUs, 256 GB RAM" },
    { name: "n2-standard-80", description: "80 vCPUs, 320 GB RAM" },
    { name: "n2-standard-96", description: "96 vCPUs, 384 GB RAM" },
    { name: "n2-standard-128", description: "128 vCPUs, 512 GB RAM" },
  ],
  "e2-standard": [
    { name: "e2-standard-2", description: "2 vCPUs, 8 GB RAM" },
    { name: "e2-standard-4", description: "4 vCPUs, 16 GB RAM" },
    { name: "e2-standard-8", description: "8 vCPUs, 32 GB RAM" },
    { name: "e2-standard-16", description: "16 vCPUs, 64 GB RAM" },
    { name: "e2-standard-32", description: "32 vCPUs, 128 GB RAM" },
  ],
  "n2d-standard": [
    { name: "n2d-standard-2", description: "2 vCPUs, 8 GB RAM" },
    { name: "n2d-standard-4", description: "4 vCPUs, 16 GB RAM" },
    { name: "n2d-standard-8", description: "8 vCPUs, 32 GB RAM" },
    { name: "n2d-standard-16", description: "16 vCPUs, 64 GB RAM" },
    { name: "n2d-standard-32", description: "32 vCPUs, 128 GB RAM" },
    { name: "n2d-standard-48", description: "48 vCPUs, 192 GB RAM" },
    { name: "n2d-standard-64", description: "64 vCPUs, 256 GB RAM" },
    { name: "n2d-standard-80", description: "80 vCPUs, 320 GB RAM" },
    { name: "n2d-standard-96", description: "96 vCPUs, 384 GB RAM" },
    { name: "n2d-standard-128", description: "128 vCPUs, 512 GB RAM" },
    { name: "n2d-standard-224", description: "224 vCPUs, 896 GB RAM" },
  ],
  "c2-standard": [
    { name: "c2-standard-4", description: "4 vCPUs, 16 GB RAM" },
    { name: "c2-standard-8", description: "8 vCPUs, 32 GB RAM" },
    { name: "c2-standard-16", description: "16 vCPUs, 64 GB RAM" },
    { name: "c2-standard-30", description: "30 vCPUs, 120 GB RAM" },
    { name: "c2-standard-60", description: "60 vCPUs, 240 GB RAM" },
  ],

  "n1-highmem": [
    { name: "n1-highmem-2", description: "2 vCPUs, 13 GB RAM" },
    { name: "n1-highmem-4", description: "4 vCPUs, 26 GB RAM" },
    { name: "n1-highmem-8", description: "8 vCPUs, 52 GB RAM" },
    { name: "n1-highmem-16", description: "16 vCPUs, 104 GB RAM" },
    { name: "n1-highmem-32", description: "32 vCPUs, 208 GB RAM" },
    { name: "n1-highmem-64", description: "64 vCPUs, 416 GB RAM" },
    { name: "n1-highmem-96", description: "96 vCPUs, 624 GB RAM" },
  ],
  "n2-highmem": [
    { name: "n2-highmem-2", description: "2 vCPUs, 16 GB RAM" },
    { name: "n2-highmem-4", description: "4 vCPUs, 32 GB RAM" },
    { name: "n2-highmem-8", description: "8 vCPUs, 64 GB RAM" },
    { name: "n2-highmem-16", description: "16 vCPUs, 128 GB RAM" },
    { name: "n2-highmem-32", description: "32 vCPUs, 256 GB RAM" },
    { name: "n2-highmem-48", description: "48 vCPUs, 384 GB RAM" },
    { name: "n2-highmem-64", description: "64 vCPUs, 512 GB RAM" },
    { name: "n2-highmem-80", description: "80 vCPUs, 640 GB RAM" },
    { name: "n2-highmem-96", description: "96 vCPUs, 768 GB RAM" },
    { name: "n2-highmem-128", description: "128 vCPUs, 864 GB RAM" },
  ],

  "n1-highcpu": [
    { name: "n1-highcpu-2", description: "2 vCPUs, 1.8 GB RAM" },
    { name: "n1-highcpu-4", description: "4 vCPUs, 3.6 GB RAM" },
    { name: "n1-highcpu-8", description: "8 vCPUs, 7.2 GB RAM" },
    { name: "n1-highcpu-16", description: "16 vCPUs, 14.4 GB RAM" },
    { name: "n1-highcpu-32", description: "32 vCPUs, 28.8 GB RAM" },
    { name: "n1-highcpu-64", description: "64 vCPUs, 57.6 GB RAM" },
    { name: "n1-highcpu-96", description: "96 vCPUs, 86.4 GB RAM" },
  ],
};

export const diskTypes: DiskTypeInfo[] = [
  { name: "pd-standard", title: "Standard persistent disk", description: "Efficient and economical block storage" },
  { name: "pd-balanced", title: "Balanced persistent disk", description: "Balance of cost and performance" },
  { name: "pd-ssd", title: "SSD persistent disk", description: "Reliable, high-performance block storage" },
  {
    name: "pd-extreme",
    title: "Extreme persistent disk",
    description: "High-performance block storage for critical workloads",
  },
  { name: "hyperdisk-balanced", title: "Hyperdisk Balanced", description: "Next-generation balanced block storage" },
  {
    name: "hyperdisk-extreme",
    title: "Hyperdisk Extreme",
    description: "Next-generation high-performance block storage",
  },
];

export const imageProjects: ImageProjectInfo[] = [
  { name: "debian-cloud", title: "Debian Cloud" },
  { name: "ubuntu-os-cloud", title: "Ubuntu Cloud" },
  { name: "cos-cloud", title: "Container-Optimized OS" },
  { name: "centos-cloud", title: "CentOS Cloud" },
  { name: "rhel-cloud", title: "Red Hat Enterprise Linux" },
  { name: "rocky-linux-cloud", title: "Rocky Linux" },
  { name: "windows-cloud", title: "Windows Cloud" },
];

export const imageFamilies: Record<string, ImageFamilyInfo[]> = {
  "debian-cloud": [
    { name: "debian-12", title: "Debian 12 (Bookworm)" },
    { name: "debian-11", title: "Debian 11 (Bullseye)" },
    { name: "debian-10", title: "Debian 10 (Buster)" },
  ],
  "ubuntu-os-cloud": [
    { name: "ubuntu-2404-lts", title: "Ubuntu 24.04 LTS" },
    { name: "ubuntu-2204-lts", title: "Ubuntu 22.04 LTS" },
    { name: "ubuntu-2004-lts", title: "Ubuntu 20.04 LTS" },
    { name: "ubuntu-1804-lts", title: "Ubuntu 18.04 LTS" },
  ],
  "centos-cloud": [
    { name: "centos-stream-9", title: "CentOS Stream 9" },
    { name: "centos-stream-8", title: "CentOS Stream 8" },
    { name: "centos-7", title: "CentOS 7" },
  ],
  "rhel-cloud": [
    { name: "rhel-9", title: "RHEL 9" },
    { name: "rhel-8", title: "RHEL 8" },
    { name: "rhel-7", title: "RHEL 7" },
  ],
  "windows-cloud": [
    { name: "windows-2022", title: "Windows Server 2022" },
    { name: "windows-2019", title: "Windows Server 2019" },
    { name: "windows-2016", title: "Windows Server 2016" },
    { name: "windows-2012-r2", title: "Windows Server 2012 R2" },
  ],
  "cos-cloud": [
    { name: "cos-stable", title: "COS Stable" },
    { name: "cos-beta", title: "COS Beta" },
    { name: "cos-dev", title: "COS Dev" },
  ],
  "rocky-linux-cloud": [
    { name: "rocky-linux-9", title: "Rocky Linux 9" },
    { name: "rocky-linux-8", title: "Rocky Linux 8" },
  ],
};

export function getMachineTypeDescription(machineType: string): string {
  const matchingSeries = Object.entries(machineTypes).find(([, types]) => types.some((mt) => mt.name === machineType));

  if (!matchingSeries) return "";

  const [, types] = matchingSeries;
  return types.find((mt) => mt.name === machineType)?.description ?? "";
}

export function getMachineTypesByFamily(): { title: string; types: MachineTypeInfo[] }[] {
  return [
    { title: "General Purpose (E2)", types: machineTypes["e2-standard"] },
    { title: "General Purpose (N2)", types: machineTypes["n2-standard"] },
    { title: "General Purpose (N2D)", types: machineTypes["n2d-standard"] },
    { title: "General Purpose (N1)", types: machineTypes["n1-standard"] },
    { title: "Compute Optimized (C2)", types: machineTypes["c2-standard"] },
    { title: "Memory Optimized (N1)", types: machineTypes["n1-highmem"] },
    { title: "Memory Optimized (N2)", types: machineTypes["n2-highmem"] },
    { title: "CPU Optimized (N1)", types: machineTypes["n1-highcpu"] },
  ];
}

export function getImageFamiliesByProject(project: string): ImageFamilyInfo[] {
  return imageFamilies[project] || [];
}

export function getDiskTypeByName(name: string): DiskTypeInfo | undefined {
  return diskTypes.find((dt) => dt.name === name);
}
