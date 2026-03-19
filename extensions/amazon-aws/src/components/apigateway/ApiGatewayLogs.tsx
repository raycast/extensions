import CloudwatchLogStreams from "../cloudwatch/CloudwatchLogStreams";

interface ApiGatewayLogsProps {
  apiId: string;
  stageName: string;
}

/**
 * Component to display CloudWatch logs for an API Gateway stage.
 * API Gateway execution logs use the format: API-Gateway-Execution-Logs_{rest-api-id}/{stage-name}
 */
export default function ApiGatewayLogs({ apiId, stageName }: ApiGatewayLogsProps) {
  const logGroupName = `API-Gateway-Execution-Logs_${apiId}/${stageName}`;

  return <CloudwatchLogStreams logGroupName={logGroupName} />;
}
