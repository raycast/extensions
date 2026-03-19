import { FunctionConfiguration, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "../services/clients/lambda";

/**
 * Lists all Lambda functions in the current AWS account and region
 * @returns Promise<FunctionConfiguration[]> Array of Lambda function configurations
 */
export default async function listLambdaFunctions(): Promise<FunctionConfiguration[]> {
  const client = getLambdaClient();

  const functions: FunctionConfiguration[] = [];
  let marker: string | undefined;

  do {
    const command = new ListFunctionsCommand({ Marker: marker });
    const response = await client.send(command);

    if (response.Functions) {
      functions.push(...response.Functions);
    }

    marker = response.NextMarker;
  } while (marker);

  return functions;
}
