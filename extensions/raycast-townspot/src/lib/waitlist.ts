export type WaitlistPayload = {
  email: string;
  location: string;
  message?: string;
};

const defaultError = "Something went wrong. Please try again.";

const toErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message || payload.error || defaultError;
  } catch {
    return defaultError;
  }
};

export const submitWaitlist = async (
  endpointUrl: string,
  payload: WaitlistPayload,
): Promise<void> => {
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      location: payload.location.trim(),
      message: payload.message?.trim() || null,
      honeypot: "",
    }),
  });

  if (response.status === 429) {
    throw new Error("Too many submissions. Please try again later.");
  }

  if (!response.ok) {
    throw new Error(await toErrorMessage(response));
  }
};
