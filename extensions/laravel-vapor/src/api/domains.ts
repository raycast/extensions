import { request } from "../lib/request";
import { getTeamId } from "../lib/helpers";

export type Domain = {
  id: number;
  team_id: number;
  cloud_provider_id: number;
  zone_id: string;
  zone: string;
  nameservers: string[];
  ses_verified: boolean;
  importing: boolean;
  queued_for_deletion: number;
  created_at: string;
  updated_at: string;
  records_count: number;
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
};

export type Domains = Array<Domain>;

export async function getDomains(): Promise<Domains> {
  const currentTeamId = await getTeamId();

  return await request<Domains>(`teams/${currentTeamId}/zones`);
}
