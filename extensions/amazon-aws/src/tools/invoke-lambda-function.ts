import { InvokeCommand, InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "../services/clients/lambda";

/**
 * Invokes a Lambda function with an optional JSON payload
 * @param options - Configuration options
 * @returns Promise with status code, response payload, and any function error
 */
export default async function invokeLambdaFunction(options: {
  functionName: string;
  payload?: string;
}): Promise<{ statusCode: number | undefined; payload: string; functionError: string | undefined }> {
  const { functionName, payload } = options;

  if (!functionName) {
    throw new Error("Function name is required");
  }

  const client = getLambdaClient();

  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: payload ? new TextEncoder().encode(payload) : undefined,
  });

  const response: InvokeCommandOutput = await client.send(command);

  const responsePayload = response.Payload ? new TextDecoder().decode(response.Payload) : "";

  return {
    statusCode: response.StatusCode,
    payload: responsePayload,
    functionError: response.FunctionError,
  };
}
