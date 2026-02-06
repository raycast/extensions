import { getApiClient } from "../lib/accounts";

type Input = {
  name: string;
  email?: string;
  defaultPaymentMethod: "ach" | "check" | "domesticWire" | "internationalWire";
  accountNumber?: string;
  routingNumber?: string;
  electronicAccountType?: string;
};

export default async function CreateRecipientTool(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const recipient = await api.createRecipient({
      name: input.name,
      emails: input.email ? [input.email] : [],
      defaultPaymentMethod: input.defaultPaymentMethod,
      ...(input.defaultPaymentMethod === "ach" &&
      input.accountNumber &&
      input.routingNumber
        ? {
            electronicRoutingInfo: {
              accountNumber: input.accountNumber,
              routingNumber: input.routingNumber,
              electronicAccountType:
                input.electronicAccountType ?? "businessChecking",
            },
          }
        : {}),
      ...(input.defaultPaymentMethod === "domesticWire" &&
      input.accountNumber &&
      input.routingNumber
        ? {
            domesticWireRoutingInfo: {
              accountNumber: input.accountNumber,
              routingNumber: input.routingNumber,
            },
          }
        : {}),
    });

    return {
      success: true,
      recipientId: recipient.id,
      name: recipient.name,
      status: recipient.status,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}

export const confirmation = {
  message: (input: Input) =>
    `Create recipient "${input.name}" with ${input.defaultPaymentMethod.toUpperCase()} payment method?`,
};