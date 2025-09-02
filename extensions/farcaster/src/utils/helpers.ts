import { Image } from '@raycast/api';
import { getAvatarIcon } from '@raycast/utils';
import { Cast, CastAuthor } from './types';
import Linkify from 'linkify-it';
import tlds from 'tlds';
import { preferences } from './preferences';

const isEtherscan = preferences.walletAddressClient === 'etherscan';

export function getUserIcon(user: Pick<CastAuthor, 'username' | 'pfp_url'>) {
  return {
    source: user.pfp_url ? encodeURI(user.pfp_url) : getAvatarIcon(user.username.toUpperCase()),
    mask: Image.Mask.RoundedRectangle,
    fallback: 'ghost.png',
  };
}

export function truncateSolAddress(address: string) {
  const regex = /^[1-9A-HJ-NP-Za-km-z]{6}[1-9A-HJ-NP-Za-km-z]*[1-9A-HJ-NP-Za-km-z]{6}$/;
  if (!regex.test(address)) return address;
  return `${address.substr(0, 6)}…${address.substr(-6)}`;
}

export function truncateEthAddress(address: string) {
  // Captures 0x + 4 characters, then the last 4 characters.
  const regex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
  const match = address.match(regex);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
}

export function getCastUrl(cast: Cast) {
  return `https://farcaster.xyz/${cast.author.username}/${cast.hash.substring(0, 8)}`;
}

export function getProfileUrl(author: CastAuthor) {
  return `https://farcaster.xyz/${author.username}`;
}

export function getEthAddressUrl(walletAddress: string) {
  return isEtherscan ? `https://etherscan.io/address/${walletAddress}` : `https://zapper.xyz/account/${walletAddress}`;
}

export function getSolanaAddressUrl(walletAddress: string) {
  return `https://solscan.io/token/${walletAddress}`;
}

const _linkify = new Linkify().tlds(tlds);
export function linkify(text: string): string {
  const matches = _linkify.match(text);

  if (!matches) {
    return text;
  }

  return matches.reduce((acc, match) => {
    return acc.replace(match.raw, `[${match.raw}](${match.url})`);
  }, text);
}

export const headers = { accept: 'application/json', api_key: preferences.apiKey };
