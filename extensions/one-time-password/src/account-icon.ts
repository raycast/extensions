import { Icon, Image, getPreferenceValues } from '@raycast/api';
import { getFavicon } from '@raycast/utils';
import { Account } from './model';
import { initials, serviceDomain } from './services';

// Neutral tiles in light and dark variants, so the letters follow the Raycast theme like built-in icons do.
function initialsTile(letters: string, background: string, foreground: string): Image.Asset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="22" fill="${background}"/><text x="50" y="${letters.length > 1 ? 64 : 66}" font-size="${letters.length > 1 ? 40 : 46}" font-weight="600" font-family="-apple-system, 'Segoe UI', sans-serif" text-anchor="middle" fill="${foreground}">${letters}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function initialsIcon(account: Pick<Account, 'issuer' | 'name'>): Image.Fallback {
  const letters = initials(account.issuer || account.name);
  if (!letters) return Icon.Key;
  return { light: initialsTile(letters, '#E3E3E6', '#3C3C43'), dark: initialsTile(letters, '#3A3A3F', '#E8E8ED') };
}

function logoDomain(account: Pick<Account, 'issuer'>): string | undefined {
  return getPreferenceValues<{ showLogos?: boolean }>().showLogos === false ? undefined : serviceDomain(account.issuer);
}

// Only the service's domain is sent to the favicon provider chosen in Raycast settings, never account details.
// Services without a logo, or every account when logos are off, show the first two letters instead.
export function accountIcon(account: Pick<Account, 'issuer' | 'name'>): Image.ImageLike {
  const fallback = initialsIcon(account);
  const domain = logoDomain(account);
  return domain
    ? getFavicon(`https://${domain}`, { fallback, mask: Image.Mask.RoundedRectangle })
    : { source: fallback };
}

// Address of the logo image from the favicon provider set in Raycast, or undefined when logos are off or the
// provider has no web address (None, Apple).
export function logoUrl(account: Pick<Account, 'issuer'>): string | undefined {
  const domain = logoDomain(account);
  const icon = domain ? getFavicon(`https://${domain}`) : undefined;
  const source = typeof icon === 'object' && 'source' in icon ? icon.source : undefined;
  return typeof source === 'string' && source.startsWith('https://') ? source : undefined;
}
