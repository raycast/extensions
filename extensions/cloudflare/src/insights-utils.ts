import type { ZoneSettingValue } from './service';

export const ZONE_SETTING_DEFINITIONS = [
  { id: 'ssl', title: 'SSL/TLS Mode' },
  { id: 'min_tls_version', title: 'Minimum TLS Version' },
  { id: 'tls_1_3', title: 'TLS 1.3' },
  { id: 'always_use_https', title: 'Always Use HTTPS' },
  { id: 'automatic_https_rewrites', title: 'Automatic HTTPS Rewrites' },
  { id: 'http2', title: 'HTTP/2' },
  { id: 'http3', title: 'HTTP/3' },
  { id: 'brotli', title: 'Brotli' },
  { id: 'security_level', title: 'Security Level' },
  { id: 'cache_level', title: 'Cache Level' },
  { id: 'browser_cache_ttl', title: 'Browser Cache TTL' },
  { id: 'development_mode', title: 'Development Mode' },
] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatPercentage(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return '0%';
  }
  return `${Math.round((part / total) * 100)}%`;
}

export function formatZoneSettingValue(value: ZoneSettingValue): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function certificateHealth(
  status: string,
  expiresOn?: string,
): 'healthy' | 'warning' | 'error' {
  if (status !== 'active' && status !== 'staging_active') return 'error';
  if (!expiresOn) return 'healthy';
  const remaining = new Date(expiresOn).getTime() - Date.now();
  if (remaining <= 0) return 'error';
  return remaining <= 30 * 24 * 60 * 60 * 1000 ? 'warning' : 'healthy';
}

interface CertificateHealthEntry {
  status: string;
  expiresOn?: string;
}

export function certificatePackHealth(
  packStatus: string,
  certificates: CertificateHealthEntry[],
  validationErrors: string[] = [],
): {
  health: 'healthy' | 'warning' | 'error';
  earliestExpiresOn?: string;
} {
  const expirationDates = certificates
    .map((certificate) => certificate.expiresOn)
    .filter((value): value is string => Boolean(value))
    .filter((value) => Number.isFinite(new Date(value).getTime()))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const healthStates = [
    certificateHealth(packStatus),
    ...certificates.map((certificate) =>
      certificateHealth(certificate.status, certificate.expiresOn),
    ),
  ];
  const health =
    validationErrors.length > 0 || healthStates.includes('error')
      ? 'error'
      : healthStates.includes('warning')
        ? 'warning'
        : 'healthy';
  return { health, earliestExpiresOn: expirationDates[0] };
}
