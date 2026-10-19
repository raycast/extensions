// Display names and logo domains for well-known services. Extra entries after the domain are other names
// or hosts the service appears under in setup codes.
const KNOWN: Array<[name: string, domain: string, ...aliases: string[]]> = [
  [
    'Google',
    'google.com',
    'gmail',
    'gmail.com',
    'google account',
    'accounts.google.com',
    'g suite',
    'google workspace',
  ],
  ['YouTube', 'youtube.com'],
  ['Firebase', 'firebase.google.com'],
  ['Microsoft', 'microsoft.com', 'microsoft account', 'live.com', 'hotmail', 'hotmail.com', 'microsoftonline.com'],
  ['Outlook', 'outlook.com'],
  ['Azure', 'azure.com', 'microsoft azure', 'azure.microsoft.com', 'portal.azure.com'],
  ['Xbox', 'xbox.com'],
  ['Apple', 'apple.com', 'apple id', 'appleid.apple.com'],
  ['iCloud', 'icloud.com'],
  ['AWS', 'aws.amazon.com', 'amazon web services', 'amazonaws.com', 'aws.com', 'signin.aws.amazon.com'],
  ['Amazon', 'amazon.com'],
  ['GitHub', 'github.com'],
  ['GitLab', 'gitlab.com'],
  ['Bitbucket', 'bitbucket.org'],
  ['Atlassian', 'atlassian.com', 'jira', 'confluence', 'id.atlassian.com'],
  ['Codeberg', 'codeberg.org'],
  ['SourceForge', 'sourceforge.net'],
  ['Facebook', 'facebook.com', 'meta', 'meta.com'],
  ['Instagram', 'instagram.com'],
  ['WhatsApp', 'whatsapp.com'],
  ['X', 'x.com', 'twitter', 'twitter.com'],
  ['LinkedIn', 'linkedin.com'],
  ['Reddit', 'reddit.com'],
  ['Discord', 'discord.com', 'discordapp.com'],
  ['Slack', 'slack.com'],
  ['Telegram', 'telegram.org'],
  ['Snapchat', 'snapchat.com'],
  ['TikTok', 'tiktok.com'],
  ['Pinterest', 'pinterest.com'],
  ['Tumblr', 'tumblr.com'],
  ['Bluesky', 'bsky.app'],
  ['Twitch', 'twitch.tv'],
  ['Zoom', 'zoom.us', 'zoom.com'],
  ['Dropbox', 'dropbox.com'],
  ['Box', 'box.com'],
  ['Notion', 'notion.so', 'notion.com'],
  ['Figma', 'figma.com'],
  ['Canva', 'canva.com'],
  ['Adobe', 'adobe.com', 'adobe id'],
  ['Miro', 'miro.com'],
  ['Loom', 'loom.com'],
  ['Asana', 'asana.com'],
  ['Trello', 'trello.com'],
  ['monday.com', 'monday.com'],
  ['ClickUp', 'clickup.com'],
  ['Linear', 'linear.app'],
  ['Basecamp', 'basecamp.com'],
  ['Airtable', 'airtable.com'],
  ['Calendly', 'calendly.com'],
  ['DocuSign', 'docusign.com'],
  ['Evernote', 'evernote.com'],
  ['Todoist', 'todoist.com'],
  ['Grammarly', 'grammarly.com'],
  ['Zapier', 'zapier.com'],
  ['IFTTT', 'ifttt.com'],
  ['Webflow', 'webflow.com'],
  ['Framer', 'framer.com'],
  ['Salesforce', 'salesforce.com'],
  ['HubSpot', 'hubspot.com'],
  ['Zendesk', 'zendesk.com'],
  ['Intercom', 'intercom.com'],
  ['Freshdesk', 'freshdesk.com'],
  ['Zoho', 'zoho.com', 'zoho.in'],
  ['Shopify', 'shopify.com'],
  ['WordPress', 'wordpress.com'],
  ['Squarespace', 'squarespace.com'],
  ['Wix', 'wix.com'],
  ['Ghost', 'ghost.org'],
  ['Substack', 'substack.com'],
  ['Patreon', 'patreon.com'],
  ['Gumroad', 'gumroad.com'],
  ['Kickstarter', 'kickstarter.com'],
  ['Stripe', 'stripe.com'],
  ['PayPal', 'paypal.com'],
  ['Paddle', 'paddle.com'],
  ['Lemon Squeezy', 'lemonsqueezy.com'],
  ['Wise', 'wise.com', 'transferwise'],
  ['Revolut', 'revolut.com'],
  ['Monzo', 'monzo.com'],
  ['N26', 'n26.com'],
  ['Skrill', 'skrill.com'],
  ['Payoneer', 'payoneer.com'],
  ['Venmo', 'venmo.com'],
  ['Cash App', 'cash.app'],
  ['Brex', 'brex.com'],
  ['Ramp', 'ramp.com'],
  ['Mercury', 'mercury.com'],
  ['Chase', 'chase.com'],
  ['Bank of America', 'bankofamerica.com'],
  ['Wells Fargo', 'wellsfargo.com'],
  ['Capital One', 'capitalone.com'],
  ['American Express', 'americanexpress.com', 'amex'],
  ['Discover', 'discover.com'],
  ['Robinhood', 'robinhood.com'],
  ['Fidelity', 'fidelity.com'],
  ['Vanguard', 'vanguard.com'],
  ['Charles Schwab', 'schwab.com'],
  ['E*TRADE', 'etrade.com'],
  ['Interactive Brokers', 'interactivebrokers.com', 'ibkr'],
  ['Coinbase', 'coinbase.com'],
  ['Binance', 'binance.com'],
  ['Kraken', 'kraken.com'],
  ['Gemini', 'gemini.com'],
  ['Crypto.com', 'crypto.com'],
  ['KuCoin', 'kucoin.com'],
  ['OKX', 'okx.com'],
  ['Bybit', 'bybit.com'],
  ['Bitfinex', 'bitfinex.com'],
  ['Bitstamp', 'bitstamp.net'],
  ['CoinDCX', 'coindcx.com'],
  ['WazirX', 'wazirx.com'],
  ['Zerodha', 'zerodha.com', 'kite.zerodha.com'],
  ['Groww', 'groww.in'],
  ['Upstox', 'upstox.com'],
  ['Razorpay', 'razorpay.com'],
  ['Paytm', 'paytm.com'],
  ['PhonePe', 'phonepe.com'],
  ['Flipkart', 'flipkart.com'],
  ['Zomato', 'zomato.com'],
  ['Swiggy', 'swiggy.com'],
  ['Jio', 'jio.com'],
  ['Airtel', 'airtel.in'],
  ['DigiLocker', 'digilocker.gov.in'],
  ['Cloudflare', 'cloudflare.com'],
  ['DigitalOcean', 'digitalocean.com'],
  ['Linode', 'linode.com', 'akamai'],
  ['Vultr', 'vultr.com'],
  ['Hetzner', 'hetzner.com'],
  ['OVHcloud', 'ovhcloud.com', 'ovh', 'ovh.com'],
  ['Scaleway', 'scaleway.com'],
  ['Contabo', 'contabo.com'],
  ['Alibaba Cloud', 'alibabacloud.com', 'aliyun'],
  ['Oracle', 'oracle.com', 'oracle cloud'],
  ['IBM', 'ibm.com', 'ibm cloud'],
  ['Heroku', 'heroku.com'],
  ['Vercel', 'vercel.com'],
  ['Netlify', 'netlify.com'],
  ['Fly.io', 'fly.io'],
  ['Render', 'render.com'],
  ['Railway', 'railway.app'],
  ['Supabase', 'supabase.com'],
  ['MongoDB', 'mongodb.com', 'mongodb atlas'],
  ['Hostinger', 'hostinger.com', 'hostinger.in'],
  ['Bluehost', 'bluehost.com'],
  ['Kinsta', 'kinsta.com'],
  ['WP Engine', 'wpengine.com'],
  ['cPanel', 'cpanel.net'],
  ['Namecheap', 'namecheap.com'],
  ['GoDaddy', 'godaddy.com'],
  ['Porkbun', 'porkbun.com'],
  ['Gandi', 'gandi.net'],
  ['Hover', 'hover.com'],
  ['Backblaze', 'backblaze.com'],
  ['Wasabi', 'wasabi.com'],
  ['pCloud', 'pcloud.com'],
  ['MEGA', 'mega.nz', 'mega.io'],
  ['Synology', 'synology.com'],
  ['Ubiquiti', 'ui.com', 'unifi', 'ubnt'],
  ['Plex', 'plex.tv'],
  ['Nextcloud', 'nextcloud.com'],
  ['npm', 'npmjs.com'],
  ['PyPI', 'pypi.org'],
  ['RubyGems', 'rubygems.org'],
  ['Docker', 'docker.com', 'docker hub', 'hub.docker.com'],
  ['JetBrains', 'jetbrains.com'],
  ['HashiCorp', 'hashicorp.com', 'terraform', 'app.terraform.io'],
  ['CircleCI', 'circleci.com'],
  ['Travis CI', 'travis-ci.com'],
  ['Sentry', 'sentry.io'],
  ['Datadog', 'datadoghq.com', 'datadog'],
  ['New Relic', 'newrelic.com'],
  ['PagerDuty', 'pagerduty.com'],
  ['Grafana', 'grafana.com'],
  ['Elastic', 'elastic.co'],
  ['Splunk', 'splunk.com'],
  ['Snyk', 'snyk.io'],
  ['Twilio', 'twilio.com', 'authy'],
  ['SendGrid', 'sendgrid.com'],
  ['Mailchimp', 'mailchimp.com'],
  ['Mailgun', 'mailgun.com'],
  ['Postmark', 'postmarkapp.com'],
  ['Brevo', 'brevo.com', 'sendinblue'],
  ['OpenAI', 'openai.com', 'chatgpt', 'chatgpt.com'],
  ['Anthropic', 'anthropic.com', 'claude', 'claude.ai'],
  ['Hugging Face', 'huggingface.co'],
  ['Kaggle', 'kaggle.com'],
  ['Replit', 'replit.com'],
  ['Stack Overflow', 'stackoverflow.com'],
  ['Wikipedia', 'wikipedia.org'],
  ['HackerOne', 'hackerone.com'],
  ['Bugcrowd', 'bugcrowd.com'],
  ['Hack The Box', 'hackthebox.com'],
  ['TryHackMe', 'tryhackme.com'],
  ['Okta', 'okta.com'],
  ['Auth0', 'auth0.com'],
  ['OneLogin', 'onelogin.com'],
  ['Duo', 'duo.com', 'duosecurity.com'],
  ['JumpCloud', 'jumpcloud.com'],
  ['Tailscale', 'tailscale.com'],
  ['ZeroTier', 'zerotier.com'],
  ['Keybase', 'keybase.io'],
  ['1Password', '1password.com'],
  ['Bitwarden', 'bitwarden.com'],
  ['LastPass', 'lastpass.com'],
  ['Dashlane', 'dashlane.com'],
  ['Keeper', 'keepersecurity.com'],
  ['Proton', 'proton.me', 'protonmail', 'proton mail', 'protonmail.com', 'account.proton.me'],
  ['Tuta', 'tuta.com', 'tutanota', 'tutanota.com'],
  ['Fastmail', 'fastmail.com'],
  ['Yahoo', 'yahoo.com'],
  ['AOL', 'aol.com'],
  ['NordVPN', 'nordvpn.com', 'nord account', 'nordaccount.com'],
  ['ExpressVPN', 'expressvpn.com'],
  ['Mullvad', 'mullvad.net'],
  ['Cisco', 'cisco.com', 'webex'],
  ['Fortinet', 'fortinet.com'],
  ['Palo Alto Networks', 'paloaltonetworks.com'],
  ['VMware', 'vmware.com'],
  ['SAP', 'sap.com'],
  ['Intuit', 'intuit.com', 'quickbooks', 'turbotax'],
  ['Xero', 'xero.com'],
  ['FreshBooks', 'freshbooks.com'],
  ['Gusto', 'gusto.com'],
  ['Deel', 'deel.com'],
  ['Rippling', 'rippling.com'],
  ['BambooHR', 'bamboohr.com'],
  ['Workday', 'workday.com'],
  ['ADP', 'adp.com'],
  ['Upwork', 'upwork.com'],
  ['Fiverr', 'fiverr.com'],
  ['Etsy', 'etsy.com'],
  ['eBay', 'ebay.com'],
  ['Walmart', 'walmart.com'],
  ['Uber', 'uber.com'],
  ['Lyft', 'lyft.com'],
  ['Airbnb', 'airbnb.com'],
  ['Booking.com', 'booking.com'],
  ['Expedia', 'expedia.com'],
  ['DoorDash', 'doordash.com'],
  ['Spotify', 'spotify.com'],
  ['Netflix', 'netflix.com'],
  ['Steam', 'steampowered.com', 'steamcommunity.com'],
  ['Epic Games', 'epicgames.com'],
  ['Ubisoft', 'ubisoft.com'],
  ['EA', 'ea.com', 'electronic arts'],
  ['Battle.net', 'battle.net', 'blizzard'],
  ['Nintendo', 'nintendo.com'],
  ['PlayStation', 'playstation.com', 'psn', 'sony'],
  ['Roblox', 'roblox.com'],
  ['Riot Games', 'riotgames.com'],
  ['GOG', 'gog.com'],
  ['Humble Bundle', 'humblebundle.com'],
  ['Tesla', 'tesla.com'],
];

type Service = { name: string; domain: string };

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const SERVICES = new Map<string, Service>();
for (const [name, domain, ...aliases] of KNOWN) {
  const service = { name, domain };
  for (const alias of [name, domain, ...aliases]) if (!SERVICES.has(key(alias))) SERVICES.set(key(alias), service);
}

// Words services add around their name in setup codes, e.g. "Google Account" or "GitHub 2FA".
const GENERIC_SUFFIX = /(account|accounts|login|signin|sso|2fa|mfa|otp|totp|auth|authenticator|inc|llc|ltd)$/;

function lookup(text: string): Service | undefined {
  let value = key(text);
  while (value) {
    const found = SERVICES.get(value);
    if (found) return found;
    const shorter = value.replace(GENERIC_SUFFIX, '');
    if (shorter === value) return undefined;
    value = shorter;
  }
}

// Second-level labels used under country codes, e.g. example.co.uk or example.com.au.
const SECOND_LEVEL = new Set(['co', 'com', 'net', 'org', 'gov', 'ac', 'edu']);

// Lowercased hostname for a URL or bare host such as "www.google.com/path"; undefined for plain names.
export function hostnameOf(text: string): string | undefined {
  const value = text.trim();
  if (!value || /\s/.test(value)) return undefined;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  if (!hasScheme && !/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#].*)?$/i.test(value)) return undefined;
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    const host = url.hostname.toLowerCase().replace(/^www\d*\./, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && !/^[\d.]+$/.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

function registrableDomain(host: string): string {
  const labels = host.split('.');
  const size = labels.length > 2 && labels.at(-1)!.length === 2 && SECOND_LEVEL.has(labels.at(-2)!) ? 3 : 2;
  return labels.slice(-size).join('.');
}

function lookupHost(host: string): Service | undefined {
  const domain = registrableDomain(host);
  return SERVICES.get(key(host)) ?? SERVICES.get(key(domain)) ?? SERVICES.get(key(domain.split('.')[0]));
}

function titleCase(label: string): string {
  if (label.length <= 3) return label.toUpperCase();
  return label
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

// Readable service name for what a user typed or a setup code carried: "accounts.google.com" → "Google",
// "https://www.example.co.uk/login" → "Example", "aws" → "AWS". Other names are returned trimmed.
export function serviceName(text: string): string {
  const value = text.trim();
  const host = hostnameOf(value);
  if (!host) return lookup(value)?.name ?? value;
  return lookupHost(host)?.name ?? titleCase(registrableDomain(host).split('.')[0]);
}

// Domain to fetch a logo for, or undefined when the service can't be guessed with reasonable confidence.
export function serviceDomain(issuer: string | undefined): string | undefined {
  const value = issuer?.trim();
  if (!value) return undefined;
  const host = hostnameOf(value);
  if (host) return lookupHost(host)?.domain ?? registrableDomain(host);
  const known = lookup(value);
  if (known) return known.domain;
  // A single-word brand is usually reachable at its .com domain; unknown domains fall back to initials.
  return /^[a-z0-9]{2,}$/i.test(value) ? `${value.toLowerCase()}.com` : undefined;
}

// Two letters standing in for a missing logo: "American Express" → "AE", "Plausible" → "PL",
// "hello@example.com" → "HE". Empty when the text has no letters or digits.
export function initials(text: string): string {
  const words = (text.split('@')[0].match(/[\p{L}\p{N}]+/gu) ?? []).map((word) => Array.from(word));
  const letters = words.length > 1 ? [words[0][0], words[1][0]] : (words[0] ?? []).slice(0, 2);
  return letters.join('').toUpperCase();
}
