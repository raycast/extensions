// Raycast currently applies Interface Size a second time to grid images.
// Keep the full avatar within the visible cell; the public API does not expose
// this setting, so the matching extension preference supplies the scale.
const cache = new Map<string, Promise<string>>();
export type AvatarInterfaceSize = "default" | "large" | "larger";
export function avatarBounds(size: AvatarInterfaceSize) {
  const scale = size === "larger" ? 1.2 : size === "large" ? 1.1 : 1;
  return { offset: 10 / scale, side: 80 / scale };
}
export function fallbackAvatar(size: AvatarInterfaceSize) {
  const { offset, side } = avatarBounds(size);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g transform="translate(${offset} ${offset}) scale(${side / 100})" fill="#999"><circle cx="50" cy="30" r="18"/><path d="M15 90v-8a35 35 0 0 1 70 0v8z"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
export function avatarDataURL(
  bytes: Uint8Array,
  mime: string,
  size: AvatarInterfaceSize = "default",
) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) {
    throw new Error("Unsupported avatar image format");
  }
  const { offset, side } = avatarBounds(size);
  const image = Buffer.from(bytes).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100" viewBox="0 0 100 100"><image x="${offset}" y="${offset}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" xlink:href="data:${mime};base64,${image}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
export function getUserAvatar(
  url: string,
  size: AvatarInterfaceSize,
): Promise<string> {
  const key = `${size}:${url}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Avatar download failed");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 2_000_000) throw new Error("Avatar image is too large");
    return avatarDataURL(
      bytes,
      (response.headers.get("content-type") ?? "").split(";")[0],
      size,
    );
  })();
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key, pending);
  void pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}
