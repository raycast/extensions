export const Color: Record<string, string> = new Proxy({}, { get: (_target, property) => String(property) });
export const Icon: Record<string, string> = new Proxy({}, { get: (_target, property) => String(property) });

export const Image = { Mask: { Circle: "circle", RoundedRectangle: "roundedRectangle" } };
export const environment = { isDevelopment: false };

export class Cache {
  private readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export const mockPreferences = {
  openPullRequestsIn: "graphite",
  repositoryFolders: "",
  gtPath: "",
  ghPath: "",
  celebrateMerges: false,
};

export function getPreferenceValues() {
  return mockPreferences;
}

export const Action = { Style: { Regular: "regular", Destructive: "destructive" } };

export async function open(): Promise<void> {}
