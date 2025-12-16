export interface CreateChallengeRequest {
  app_name: string;
}

export interface CreateChallengeResponse {
  challenge_id: string;
}

export interface CreateApiKeyRequest {
  challenge_id: string;
  code: string;
}

export interface CreateApiKeyResponse {
  api_key: string;
}
