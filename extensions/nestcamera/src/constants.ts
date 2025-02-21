// Google Nest Device Access API endpoint
export const NEST_API_ENDPOINT = 'https://smartdevicemanagement.googleapis.com/v1';

// WebRTC stream configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

// Stream management
export const STREAM_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiration
export const STREAM_HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Error retry configuration
export const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 2000,
  maxDelay: 10000
};

export const OAUTH_CONFIG = {
  clientId: process.env.NEST_CLIENT_ID || '',
  projectId: process.env.NEST_PROJECT_ID || '',
  scopes: [
    'https://www.googleapis.com/auth/sdm.service',
    'https://www.googleapis.com/auth/nest.readonly'
  ]
}; 