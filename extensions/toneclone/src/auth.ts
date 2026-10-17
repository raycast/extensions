// Simple auth service - just validates API key format
export interface AuthenticationResult {
  success: boolean;
  error?: string;
}

export function validateApiKey(apiKey: string): boolean {
  // Basic validation - should start with 'tc_' and be reasonable length
  return apiKey.trim().startsWith("tc_") && apiKey.trim().length > 10;
}
