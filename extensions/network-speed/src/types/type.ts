export interface NetworkSpeed {
  uploadCapacity: string;
  downloadCapacity: string;
  hasIdleLatency: boolean;
  idleLatency?: string;
  responsiveness?: string;
  uploadResponsiveness?: string;
  downloadResponsiveness?: string;
}
