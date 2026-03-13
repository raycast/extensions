import { request } from "../lib/request";
import { getTeamId } from "../lib/helpers";
import { Network } from "./networks";

export type Cache = {
  id: number;
  team_id: number;
  cloud_provider_id: number;
  network_id: number;
  name: string;
  type: string;
  region: string;
  cache_id: string | null;
  endpoint: string | null;
  port: number;
  instance_class: string;
  scale: number;
  status: string;
  created_at: string;
  updated_at: string;
  cloud_provider: {
    id: number;
    team_id: number;
    uuid: string;
    name: string;
    type: string;
    role_arn: string;
    role_sync: boolean;
    sns_topic_arn: string;
    network_limit: number;
  };
  network: Network;
};

export type Caches = Array<Cache>;

export async function getCaches(): Promise<Caches> {
  const currentTeamId = await getTeamId();

  return await request<Caches>(`teams/${currentTeamId}/caches`);
}
