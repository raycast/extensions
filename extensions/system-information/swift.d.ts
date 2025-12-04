declare module "swift:../swift" {
  export function getStorageInfo(): Promise<{
    total: number;
    used: number;
    free: number;
  }>;
}
