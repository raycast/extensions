const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateShortId(): string {
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += BASE62[Math.floor(Math.random() * 62)];
  }
  return result;
}
