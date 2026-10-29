const MEMEGEN_IMAGE_BASE_URL = "https://api.memegen.link/images";

export function escapeTextForUrl(text: string): string {
  return text
    .replace(/_/g, "__")
    .replace(/-/g, "--")
    .replace(/ /g, "_")
    .replace(/\?/g, "~q")
    .replace(/&/g, "~a")
    .replace(/%/g, "~p")
    .replace(/#/g, "~h")
    .replace(/\//g, "~s")
    .replace(/\\/g, "~b")
    .replace(/</g, "~l")
    .replace(/>/g, "~g")
    .replace(/"/g, "''");
}

export default function buildMemegenImageUrl({ id, boxes }: { id: string; boxes: { text: string }[] }): string {
  const textsPath = boxes.map((box) => (box.text ? escapeTextForUrl(box.text) : "_")).join("/");

  if (!textsPath) {
    return `${MEMEGEN_IMAGE_BASE_URL}/${id}.png`;
  }

  return `${MEMEGEN_IMAGE_BASE_URL}/${id}/${textsPath}.png`;
}
