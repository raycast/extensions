/**
 * Finds a Teams meeting link in free text: the classic meetup-join links and
 * the newer short /meet/ links, on the commercial, government and consumer
 * Teams hosts. Outlook Safe Links are unwrapped first.
 */
const MEETING_LINK =
  /https?:\/\/(?:(?:gov\.)?teams\.microsoft\.(?:com|us)|teams\.live\.com)\/(?:l\/meetup-join\/[^\s"'<>]+|meet\/\d+\?p=[^\s"'<>]+)/i;

const SAFE_LINK = /https?:\/\/[a-z0-9.-]*safelinks\.protection\.outlook\.com\/[^\s"'<>]*/gi;

function unwrapSafeLinks(text: string): string {
  return text.replace(SAFE_LINK, (wrapped) => {
    try {
      const inner = new URL(wrapped).searchParams.get("url");
      return inner ?? wrapped;
    } catch {
      return wrapped;
    }
  });
}

export function findMeetingLink(...texts: (string | undefined | null)[]): string | undefined {
  for (const text of texts) {
    if (!text) continue;
    const match = unwrapSafeLinks(text).match(MEETING_LINK);
    if (match) return match[0].replace(/[).,;>\]]+$/, "");
  }
  return undefined;
}
