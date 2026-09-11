const encode = (domain: string) => encodeURIComponent(domain.trim().toLowerCase());

/**
 * Sandbox is a separate account on separate hosts. Sending a sandbox user to a production page shows them
 * a real domain's record for a name that only exists in the test environment, or worse, a real checkout.
 * Every account and shop URL therefore follows the environment.
 */
const panelHost = (sandbox: boolean) => (sandbox ? "ap.www.sandbox.namecheap.com" : "ap.www.namecheap.com");
const siteHost = (sandbox: boolean) => (sandbox ? "www.sandbox.namecheap.com" : "www.namecheap.com");

/** Domain overview page in the Namecheap account panel. */
export const managementUrl = (domain: string, sandbox = false) =>
  `https://${panelHost(sandbox)}/Domains/DomainControlPanel/${encode(domain)}/domain`;

/** Advanced DNS tab of the domain in the Namecheap account panel. */
export const advancedDnsUrl = (domain: string, sandbox = false) =>
  `https://${panelHost(sandbox)}/Domains/DomainControlPanel/${encode(domain)}/advancedns`;

/** Public domain search results, where a domain can be added to the cart. */
export const registrationUrl = (domain: string, sandbox = false) =>
  `https://${siteHost(sandbox)}/domains/registration/results/?domain=${encode(domain)}`;

export const whoisUrl = (domain: string, sandbox = false) =>
  `https://${siteHost(sandbox)}/domains/whois/result?domain=${encode(domain)}`;

export const websiteUrl = (domain: string) => `https://${domain.trim().toLowerCase()}`;

export const domainListUrl = (sandbox = false) => `https://${panelHost(sandbox)}/domains/list/`;

/**
 * API Access page for the environment in use.
 * Note the host is `ap.www.sandbox.namecheap.com`; `ap.sandbox.namecheap.com` does not resolve.
 */
export const apiAccessUrl = (sandbox: boolean) => `https://${panelHost(sandbox)}/settings/tools/apiaccess/`;

/** Whitelisted IPs section of the API Access page. */
export const whitelistUrl = (sandbox: boolean) => `${apiAccessUrl(sandbox)}whitelisted-ips`;

export const SANDBOX_SIGNUP_URL = "https://www.sandbox.namecheap.com/";
export const API_INTRO_URL = "https://www.namecheap.com/support/api/intro/";
