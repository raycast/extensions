import { NOLL_API_URL } from "./config";

type StartTranslationResponse = {
  jobId: string;
  providerJobId: string;
};

type JobStatus = {
  status: "pending" | "processing" | "ready" | "failed";
  progress?: number;
  result?: {
    image: string; // base64 encoded
    detectedLanguage?: string;
  };
  error?: string;
};

export async function startTranslation(
  token: string,
  imageBuffer: Buffer,
  targetLanguage: string,
  filename: string,
): Promise<StartTranslationResponse> {
  if (!token) {
    throw new Error("No access token available");
  }

  // Send as JSON with base64 to avoid potential FormData header issues
  const base64Image = imageBuffer.toString("base64");

  const response = await fetch(`${NOLL_API_URL}/api/ext/translate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Image,
      filename,
      targetLanguage,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start translation: ${error}`);
  }

  return (await response.json()) as StartTranslationResponse;
}

export async function pollJob(
  token: string,
  jobId: string,
  providerJobId: string,
  targetLanguage: string,
): Promise<JobStatus> {
  const params = new URLSearchParams({
    providerJobId,
    targetLanguage,
  });

  const response = await fetch(`${NOLL_API_URL}/api/ext/job/${jobId}?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get job status: ${error}`);
  }

  return (await response.json()) as JobStatus;
}
