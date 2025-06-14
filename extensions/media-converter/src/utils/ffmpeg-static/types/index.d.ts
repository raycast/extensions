export function getBinaryPath(customDownloadDir?: string): string | null;
export function installBinary(customDownloadDir?: string): Promise<string>;
export const executableBaseName: string;
export const path: string | null;
declare const ffmpegPath: string | null;
export default ffmpegPath;
