import { EC2Client } from "@aws-sdk/client-ec2";
import { clientCache } from "../client-cache";

export function getEC2Client(): EC2Client {
  return clientCache.getClient(EC2Client, "ec2");
}
