import { GetFunctionCommand, GetFunctionResponse } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "../services/clients/lambda";

/**
 * Gets detailed information for a specific Lambda function
 * @param options - Configuration options
 * @returns Promise<GetFunctionResponse | undefined> Function details or undefined if not found
 */
export default async function getLambdaFunctionDetails(options: {
  functionName: string;
}): Promise<GetFunctionResponse | undefined> {
  const { functionName } = options;

  if (!functionName) {
    throw new Error("Function name is required");
  }

  const client = getLambdaClient();

  try {
    const command = new GetFunctionCommand({ FunctionName: functionName });
    const response = await client.send(command);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "ResourceNotFoundException") {
      return undefined;
    }
    throw error;
  }
}
