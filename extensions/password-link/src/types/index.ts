/**
 * Password.link API Types
 * Type definitions for all API entities and responses
 */

export interface PasswordLinkConfig {
  baseUrl: string;
  publicKey: string;
  privateKey: string;
}

export interface ApiError {
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  data: T;
  metadata: {
    secrets_total: number;
    secrets_usage: number;
    secrets_allowance: number;
    secret_requests_total?: number;
    secret_requests_allowance?: number;
  };
}

export interface Secret {
  id: string;
  created_at: string;
  message?: string;
  description?: string;
  view_button: boolean;
  captcha: boolean;
  password?: string;
  expiration?: number;
  expired: boolean;
  view_times: number;
  max_views?: number;
  views?: SecretView[];
}

export interface SecretView {
  viewed_at: string;
  viewed_by_ip: string;
  viewed_by_user_agent: string;
}

export interface SecretDetails {
  id: string;
  ciphertext: string;
  password_part_private: string;
  message?: string;
}

export interface CreateSecretRequest {
  ciphertext: string;
  password_part_private: string;
  description?: string;
  message?: string;
  expiration?: number;
  view_button?: boolean;
  captcha?: boolean;
  password?: string;
  max_views?: number;
}

export interface SecretRequest {
  id: string;
  description: string;
  message: string;
  expiration: number;
  limit: number;
  send_to_email?: string;
  secret_description?: string;
  secret_message?: string;
  secret_expiration?: number;
  secret_max_views?: number;
  secret_password?: boolean;
  template_id?: string | null;
}

export interface CreateSecretRequestRequest {
  description: string;
  message: string;
  expiration: number;
  limit: number;
  send_request_to_email?: string;
  send_to_email?: string;
  secret_description?: string;
  secret_message?: string;
  secret_expiration?: number;
  secret_password?: string;
  secret_max_views?: number;
}

export interface ListSecretsParams {
  offset?: number;
}

export interface ListSecretRequestsParams {
  offset?: number;
}

export interface NewSecretArguments {
  message?: string;
  secret?: string;
}
