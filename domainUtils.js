"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeDomain = sanitizeDomain;
exports.isValidDomain = isValidDomain;
exports.processDomainInput = processDomainInput;
exports.isDuplicateDomain = isDuplicateDomain;
exports.formatDomainForDisplay = formatDomainForDisplay;
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const PROTOCOL_REGEX = /^https?:\/\//i;
const TRAILING_SLASH_REGEX = /\/.*$/;
function sanitizeDomain(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    let domain = input.trim().toLowerCase();
    domain = domain.replace(PROTOCOL_REGEX, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(TRAILING_SLASH_REGEX, '');
    domain = domain.replace(/:\d+$/, '');
    return domain;
}
function isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') {
        return false;
    }
    const cleanDomain = domain.trim();
    if (cleanDomain.length === 0 || cleanDomain.length > 253) {
        return false;
    }
    if (!DOMAIN_REGEX.test(cleanDomain)) {
        return false;
    }
    if (cleanDomain.startsWith('.') || cleanDomain.endsWith('.')) {
        return false;
    }
    if (cleanDomain.includes('..')) {
        return false;
    }
    if (!cleanDomain.includes('.')) {
        return false;
    }
    return true;
}
function processDomainInput(input) {
    const sanitized = sanitizeDomain(input);
    if (!sanitized) {
        return {
            domain: '',
            isValid: false,
            error: 'Please enter a domain name'
        };
    }
    const isValid = isValidDomain(sanitized);
    if (!isValid) {
        return {
            domain: sanitized,
            isValid: false,
            error: 'Please enter a valid domain name (e.g., example.com)'
        };
    }
    return {
        domain: sanitized,
        isValid: true
    };
}
function isDuplicateDomain(domain, existingDomains) {
    if (!domain || !Array.isArray(existingDomains)) {
        return false;
    }
    const normalizedDomain = domain.toLowerCase().trim();
    return existingDomains.some(existing => existing.toLowerCase().trim() === normalizedDomain);
}
function formatDomainForDisplay(domain) {
    if (!domain)
        return '';
    return domain.trim().toLowerCase();
}
//# sourceMappingURL=domainUtils.js.map