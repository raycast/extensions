export const Icon = new Proxy<Record<string, string>>({}, { get: (_target, property) => String(property) });
