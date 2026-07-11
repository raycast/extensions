import { request } from "../lib/request";
import { getTeamId } from "../lib/helpers";
import { Network } from "./networks";

export type Database = {
  id: number;
  team_id: number;
  cloud_provider_id: number;
  network_id: number;
  name: string;
  type: string;
  region: string;
  database_id: string;
  username: string;
  endpoint: string | null;
  port: number;
  instance_class: string;
  storage: number;
  currently_allocated_storage: number;
  is_public: boolean;
  pauses: boolean;
  encrypted: boolean;
  backup_retention_period: number;
  restored_from_id: number | null;
  restored_to_timestamp: string | null;
  min_capacity: number;
  max_capacity: number;
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

export type Databases = Array<Database>;

export async function getDatabases(): Promise<Databases> {
  const currentTeamId = await getTeamId();

  return await request<Databases>(`teams/${currentTeamId}/databases`);
}
