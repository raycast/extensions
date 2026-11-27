export const host = "https://www.550wai.cn";
export function token(value, max = 128) {
  if (!new RegExp(`^[A-Za-z0-9._:-]{8,${max}}$`).test(value || ""))
    throw new Error("Invalid operation ID");
  return value;
}
export function publicUrl(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("Invalid media URL");
  return url.href;
}
export function rectangle(value, width, height) {
  if (!value?.trim()) return {};
  const coords = JSON.parse(value);
  if (
    !Array.isArray(coords) ||
    coords.length !== 4 ||
    coords.some((v) => !Number.isInteger(v) || v < 0)
  )
    throw new Error("Invalid rectangle");
  const [x1, y1, x2, y2] = coords;
  if (x1 >= x2 || y1 >= y2 || x2 > width || y2 > height)
    throw new Error("Rectangle exceeds video");
  return { x1, y1, x2, y2 };
}
export async function request(
  endpoint,
  credentials,
  values,
  file,
  fetcher = fetch,
) {
  if (
    ![
      "removeImageWatermark",
      "uploadVideo",
      "submitTask",
      "removeVideoWatermark",
      "taskDetail",
      "imageWatermarkTaskDetail",
    ].includes(endpoint)
  )
    throw new Error("Unsupported action");
  if (!credentials.apiKey?.trim() || !credentials.userNo?.trim())
    throw new Error("Credentials required");
  const body = new FormData();
  Object.entries({ ...values, ...credentials }).forEach(([key, value]) =>
    body.append(key, String(value)),
  );
  if (file) {
    const video = endpoint === "uploadVideo";
    if (
      !(video ? /\.(mp4|mov)$/i : /\.(png|jpg|jpeg|webp)$/i).test(file.name) ||
      file.size < 1 ||
      file.size > (video ? 1073741824 : 52428800)
    )
      throw new Error("Invalid file format or size");
    body.append("file", file);
  }
  try {
    const response = await fetcher(host + "/open/" + endpoint, {
      method: "POST",
      body,
      redirect: "error",
      signal: AbortSignal.timeout(file ? 600000 : 90000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error("Invalid response");
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2097152) throw new Error("Oversized response");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || !Number.isInteger(result.code))
      throw new Error("Invalid response");
    return result;
  } catch {
    throw new Error(
      "Outcome not confirmed. Query existing tasks before repeating a charged request.",
    );
  }
}
