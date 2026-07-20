export function extractMediaUrls(value: unknown): string[] {
  const urls = new Set<string>();
  visit(value, urls);
  return [...urls];
}

export function mediaTitle(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
  } catch {
    return url;
  }
}

export function inferMediaType(url: string) {
  const lower = url.toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(lower)) return "image";
  if (/\.(mp4|mov|webm|m4v)$/.test(lower)) return "video";
  if (/\.(mp3|wav|m4a|ogg|flac)$/.test(lower)) return "audio";
  if (/\.(glb|gltf|obj|fbx|stl|usdz|zip)$/.test(lower)) return "3d";
  return "file";
}

function visit(value: unknown, urls: Set<string>) {
  if (!value) return;

  if (typeof value === "string") {
    if (/^https?:\/\/.+/i.test(value)) urls.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) visit(item, urls);
    return;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value)) visit(nested, urls);
  }
}
