export function getModelIds(data: unknown, body?: unknown): string[] {
  let models = data;
  // Some compatible providers return JSON with a text/plain content type.
  if ((!Array.isArray(models) || models.length === 0) && typeof body === "string") {
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object" && "data" in parsed) {
        models = parsed.data;
      }
    } catch {
      // An unavailable model list must not prevent manual input.
    }
  }

  if (!Array.isArray(models)) return [];

  return models.flatMap((model: unknown) => {
    if (model && typeof model === "object" && "id" in model) {
      const { id } = model;
      if (typeof id === "string" && id.trim().length > 0) return [id];
    }
    return [];
  });
}
