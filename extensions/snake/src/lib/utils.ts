export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export const isWindows = process.platform === "win32";
