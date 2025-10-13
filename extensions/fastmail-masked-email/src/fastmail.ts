import { getSession, makeRequest } from "./api";

export const MaskedEmailCapability = "https://www.fastmail.com/dev/maskedemail";

export enum MaskedEmailState {
  Pending = "pending",
  Enabled = "enabled",
  Disabled = "disabled",
  Deleted = "deleted",
}

export type MaskedEmail = {
  id: string;
  email: string;
  state: MaskedEmailState;
  forDomain: string;
  description: string;
  url: string | null;
  lastMessageAt: string;
  createdAt: string;
};

function normalisePrefix(prefix: string): string {
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 64);
}

type APIRequest<Method> = {
  using: string[];
  methodCalls: [string, Method, string][];
};

type MaskedEmailSet = {
  created: Record<
    string,
    {
      email: string;
    }
  >;
};

type CreateMaskedEmail = {
  accountId?: string;
  create: Record<
    string,
    {
      state: MaskedEmailState;
      description?: string;
      emailPrefix?: string;
      forDomain?: string;
    }
  >;
};

export async function createMaskedEmail(prefix = "", description = "", domain = "") {
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
              state: MaskedEmailState.Pending,
              description,
              emailPrefix: normalisePrefix(prefix),
              forDomain: domain,
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

type ListMaskedEmail = {
  accountId?: string;
  get: {
    ids: [string] | null;
  };
};

type MaskedEmailGet = {
  list: [MaskedEmail];
};

export async function retrieveAllMaskedEmails() {
  const session = await getSession();
  const request: APIRequest<ListMaskedEmail> = {
    using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
    methodCalls: [
      [
        "MaskedEmail/get",
        {
          accountId: session.primaryAccounts[MaskedEmailCapability],
          get: {
            ids: null,
          },
        },
        "0",
      ],
    ],
  };

  try {
    const response = await makeRequest<ListMaskedEmail, MaskedEmailGet>({ request });
    const emails: MaskedEmail[] = response.methodResponses[0][1].list;

    return emails;
  } catch (error) {
    throw new Error(`Failed to retrieve all masked emails: ${error}`);
  }
}

type UpdateMaskedEmail = {
  accountId?: string;
  update: Record<
    string,
    {
      state: MaskedEmailState;
      description?: string;
      emailPrefix?: string;
    }
  >;
};

export async function updateMaskedEmailState(email: MaskedEmail, state: MaskedEmailState) {
  const session = await getSession();
  const request: APIRequest<UpdateMaskedEmail> = {
    using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
    methodCalls: [
      [
        "MaskedEmail/set",
        {
          accountId: session.primaryAccounts[MaskedEmailCapability],
          update: {
            [email.id]: {
              state,
            },
          },
        },
        "0",
      ],
    ],
  };

  await makeRequest<UpdateMaskedEmail, MaskedEmailSet>({ request });
}
