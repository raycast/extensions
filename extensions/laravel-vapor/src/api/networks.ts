import { request } from "../lib/request";
import { getTeamId } from "../lib/helpers";

export type Network = {
  id: number;
  team_id: number;
  cloud_provider_id: number;
  name: string;
  version: number;
  region: string;
  stack_id: string;
  vpc_id: string;
  default_security_group_id: string;
  vpc_cidr_block: string | null;
  public_subnet_cidr_blocks: string[] | null;
  private_subnet_cidr_blocks: string[] | null;
  public_subnets: string[];
  private_subnets: string[];
  has_internet_access: boolean;
  stack_status: string;
  stack_status_reason: string | null;
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
};

export type Networks = Array<Network>;

export async function getNetworks(): Promise<Networks> {
  const currentTeamId = await getTeamId();

  return await request<Networks>(`teams/${currentTeamId}/networks`);
}
