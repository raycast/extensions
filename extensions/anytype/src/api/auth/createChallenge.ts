import { CreateChallengeRequest, CreateChallengeResponse } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createChallenge(request: CreateChallengeRequest): Promise<CreateChallengeResponse> {
  const { url, method } = apiEndpoints.createChallenge();

  const response = await apiFetch<CreateChallengeResponse>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return response.payload;
}
