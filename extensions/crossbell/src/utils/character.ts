import type { CharacterEntity } from "crossbell";
import { ipfsLinkToHttpLink } from "./ipfs";

export function extractCharacterInfo(character?: CharacterEntity) {
  const username = `${character?.metadata?.content?.name ?? character?.handle}`;
  const bio = character?.metadata?.content?.bio ?? "";
  const handle = character?.handle ?? "";
  const avatar = character?.metadata?.content?.avatars?.[0]
    ? ipfsLinkToHttpLink(character?.metadata?.content?.avatars?.[0])
    : getDefaultAvatar(character?.handle);

  return {
    username,
    bio,
    handle,
    avatar,
  };
}

const defaultAvatars = [
  "https://crossbell.io/images/avatars/bell-black.jpg",
  "https://crossbell.io/images/avatars/bell-blue.jpg",
  "https://crossbell.io/images/avatars/bell-green.jpg",
  "https://crossbell.io/images/avatars/bell-purple.jpg",
  "https://crossbell.io/images/avatars/bell-red.jpg",
  "https://crossbell.io/images/avatars/bell-white.jpg",
  "https://crossbell.io/images/avatars/bell-yellow.jpg",
];

function getDefaultAvatar(handle?: string) {
  if (!handle || (handle.startsWith("0x") && handle.length === 42)) {
    return "/images/avatar-default.png";
  }

  const seededRandomIndex = stringToInteger(handle, {
    min: 0,
    max: defaultAvatars.length - 1,
  });
  return defaultAvatars[seededRandomIndex];
}

/**
 * Converts a string to an integer (as a seeded random number).
 */
function stringToInteger(
  string: string,
  {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  }: {
    min?: number;
    max?: number;
  } = {},
) {
  let total = 0;
  for (let i = 0; i !== string.length; i++) {
    if (total >= Number.MAX_SAFE_INTEGER) break;
    total += string.charCodeAt(i);
  }
  return Math.floor(total % (max - min)) + min;
}
