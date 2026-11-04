/** Shared by both AX readers: preserve native identity when an Electron shell has a generic title. */
export function selectWindowDocument(
  native: { title: string; url: string },
  document: { title: string; url: string },
): { title: string; url: string; windowTitle?: string; documentUrl?: string } {
  const generic = (title: string) => !title.trim() || /^(?:Claude(?: Code)?|Codex|ChatGPT|about:blank)$/i.test(title.trim());
  const title = generic(document.title) ? native.title : document.title;
  const shell = /^(?:app|file):/.test(document.url) && !/[#?]/.test(document.url);
  const url = shell && native.url ? native.url : document.url || native.url;
  return {
    title,
    url,
    ...(!generic(native.title) && native.title !== title ? { windowTitle: native.title } : {}),
    ...(document.url && document.url !== url ? { documentUrl: document.url } : {}),
  };
}
