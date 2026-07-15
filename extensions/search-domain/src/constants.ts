/**
 * RDAP API ENDPOINT CONFIGURATION
 *
 * This extension uses a generic RDAP resolver by default. The resolver (`rdap.org`)
 * redirects queries to the authoritative registry for the requested TLD. Using a generic resolver avoids false
 * "available" results that can happen when querying a registry-specific endpoint that only serves certain TLDs.
 */
export const RDAP_GENERIC = "https://rdap.org/domain";
