import { burn, type CreatedClip, type HttpLike } from "@p00f/core";
import type { RaycastClipboardLike } from "./create-service";

export async function copyCreatedLink(
  clipboard: RaycastClipboardLike,
  link: string,
): Promise<void> {
  await clipboard.copy(link, { concealed: true });
}

export async function pasteCreatedLink(
  clipboard: RaycastClipboardLike,
  link: string,
): Promise<void> {
  await clipboard.paste?.(link);
}

export async function copyOwnerToken(
  clipboard: RaycastClipboardLike,
  ownerToken: string,
): Promise<void> {
  await clipboard.copy(ownerToken, { concealed: true });
}

export async function burnCreatedPoof(
  http: HttpLike,
  created: Pick<CreatedClip, "link" | "ownerToken">,
): Promise<boolean> {
  const result = await burn(http, created.link, created.ownerToken);
  return result.ok;
}
