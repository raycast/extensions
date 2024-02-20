import { Toast } from "@raycast/api";
import { getSession, makeRequest } from "./api";

type APIRequest<Method> = {
  using: string[];
  methodCalls: [string, Method, string][];
};

type CreateMaskedEmail = {
  accountId?: string;
  create: Record<
    string,
    {
      state: "pending" | "enabled" | "disabled" | "deleted";
      description?: string;
      emailPrefix?: string;
    }
  >;
};

type MaskedEmailSet = {
  created: Record<
    string,
    {
      email: string;
    }
  >;
};

const MaskedEmailCapability = "https://www.fastmail.com/dev/maskedemail";

export async function createMaskedEmail(prefix = "", description = "") {
  const session = await getSession();
  const request: APIRequest<CreateMaskedEmail> = {
    using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
    methodCalls: [
      [
        "MaskedEmail/set",
        {
          accountId: session.primaryAccounts[MaskedEmailCapability],
          create: {
            "raycast-masked-email": {
              state: "enabled",
              description,
              emailPrefix: sanitizePrefix(prefix),
            },
          },
        },
        "0",
      ],
    ],
  };
  try {
    const response = await makeRequest<CreateMaskedEmail, MaskedEmailSet>({ request });
    return Object.values(response.methodResponses[0][1].created)[0].email;
  } catch (error) {
    throw new Error(`Failed to create masked email: ${error}`);
  }
}

function sanitizePrefix(prefix: string): string {
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 64);
}

export function hideToast(toast: Toast, delay = 0) {
  setTimeout(async () => {
    await toast.hide();
  }, delay);
}
