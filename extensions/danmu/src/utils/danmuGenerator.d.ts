export function danmuGenerator(
  filePath: string,
  width?: number,
  height?: number,
  fontface?: string,
  fontsize?: number,
  alpha?: number,
  duration?: number,
): PromisePromise<[boolean, [string], [string], string]>;

export function danmuGeneratorWithID(
  episodeID: string,
  filePath: string,
  width?: number,
  height?: number,
  fontface?: string,
  fontsize?: number,
  alpha?: number,
  duration?: number,
): Promise<[boolean, string]>;

export function manualMatch(episodeID: string, filePath: string): Promise<[boolean, string]>;
export function manualSearch(filePath: string): Promise<[boolean, [string, string], string]>;
