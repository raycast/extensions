export default function lastDirName(dirPath: string): string {
  return dirPath.split('/').pop() || '';
}