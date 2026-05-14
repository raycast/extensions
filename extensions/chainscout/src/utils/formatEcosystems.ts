export default function formatEcosystems(ecosystems: string | string[] | undefined): string[] {
  return Array.isArray(ecosystems) ? ecosystems : ecosystems ? [ecosystems] : [];
}
