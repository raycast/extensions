import { request as openRequest, token, publicUrl } from "./generated/api.mjs";
export async function request(
  endpoint,
  auth,
  values = {},
  file,
  fetcher = fetch,
) {
  if (auth.mode !== "oauth")
    return openRequest(endpoint, auth, values, file, fetcher);
  if (!["cn", "global"].includes(auth.region))
    throw new Error("Invalid region");
  let route, body;
  if (endpoint === "taskDetail" || endpoint === "imageWatermarkTaskDetail") {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(values.taskId ?? ""))
      throw new Error("Invalid task ID");
    route = `/tasks/${endpoint === "taskDetail" ? "video" : "image"}/${encodeURIComponent(values.taskId)}`;
  } else if (endpoint === "receipt") {
    route = "/operations/" + encodeURIComponent(token(values.operationId, 64));
  } else if (
    ["removeImageWatermark", "removeVideoWatermark", "eraseVideo"].includes(
      endpoint,
    )
  ) {
    const kind =
      endpoint === "removeImageWatermark"
        ? "image"
        : endpoint === "eraseVideo"
          ? "video"
          : "share";
    route = "/media";
    body = new FormData();
    body.append("mediaType", kind);
    body.append("operationId", token(values.operationId, 64));
    if (kind === "share")
      body = JSON.stringify({
        mediaType: kind,
        operationId: token(values.operationId, 64),
        sourceUrl: publicUrl(values.videoUrl),
      });
    else {
      if (
        !file ||
        file.size < 1 ||
        file.size > (kind === "image" ? 52428800 : 209715200) ||
        !(kind === "image" ? /\.(png|jpe?g|webp)$/i : /\.(mp4|mov)$/i).test(
          file.name,
        )
      )
        throw new Error("Invalid file");
      if (kind === "video") {
        const area = values.area ?? "0,0,0,0";
        if (!/^\d+,\d+,\d+,\d+$/.test(area)) throw new Error("Invalid region");
        const [x1, y1, x2, y2] = area.split(",").map(Number);
        if (area !== "0,0,0,0" && (x2 <= x1 || y2 <= y1))
          throw new Error("Invalid region");
        body.append("area", area);
      }
      body.append("file", file);
    }
  } else throw new Error("Unsupported OAuth action");
  const accessToken = await auth.session.accessToken(false);
  try {
    const response = await fetcher(
      `https://www.550wai.cn/media-api/${auth.region}/v1${route}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(typeof body === "string"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(body ? { body } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(file ? 600000 : 90000),
      },
    );
    if (!response.ok) throw new Error();
    const reader = response.body.getReader(),
      parts = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2097152) throw new Error();
        parts.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!Number.isInteger(result?.code)) throw new Error();
    return result;
  } catch {
    throw new Error(
      "Outcome not confirmed. Query the original operation before repeating a paid submission.",
    );
  }
}
