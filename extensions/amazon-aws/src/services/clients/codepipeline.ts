import { CodePipelineClient } from "@aws-sdk/client-codepipeline";
import { clientCache } from "../client-cache";

export function getCodePipelineClient(): CodePipelineClient {
  return clientCache.getClient(CodePipelineClient, "codepipeline");
}
