import { Tool } from "@raycast/api";
import { resend } from "../lib/resend";

type Input = {
  /**
   * The name of the API key.
   * This helps you identify the API key in the Resend dashboard.
   * Make it descriptive and meaningful.
   */
  name: string;

  /**
   * The permission level for the API key.
   * Options are "full_access" or "sending_access".
   * "full_access" can create, delete, get, and update any resource.
   * "sending_access" can only send emails.
   */
  permission: "full_access" | "sending_access";

  /**
   * Optional domain ID to restrict the API key to a specific domain.
   * If not provided, the API key will work for all domains.
   */
  domainId?: string;
};

const tool = async (input: Input) => {
  const { data, error } = await resend.apiKeys.create({
    name: input.name,
    permission: input.permission,
    ...(input.domainId ? { domainId: input.domainId } : {}),
  });

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: `New API key:`,
    info: [
      { name: "Name", value: input.name },
      { name: "Permission", value: input.permission },
      ...(input.domainId ? [{ name: "Domain ID", value: input.domainId }] : []),
    ],
  };
};

export default tool;
