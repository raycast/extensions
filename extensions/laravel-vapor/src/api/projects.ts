import { request } from "../lib/request";
import { getTeamId } from "../lib/helpers";

export type Project = {
  id: number;
  team_id: number;
  cloud_provider_id: number;
  name: string;
  region: string;
  bucket: string;
  asset_bucket: string | null;
  container_repository: string | null;
  cloudfront_id: string | null;
  cloudfront_domain: string | null;
  cloudfront_alias: string | null;
  cloudfront_status: string | null;
  github_repository: string | null;
  template: string | null;
  template_status: string | null;
  is_sandboxed: boolean;
  queued_for_deletion: boolean;
  last_deployed_at: Date | null;
  created_at: Date;
  updated_at: Date;
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
  asset_domains: {
    cloudfront: string;
    s3: string;
  };
};

export type Projects = Array<Project>;

export async function getProjects(): Promise<Projects> {
  const currentTeamId = await getTeamId();

  return await request<Projects>(`teams/${currentTeamId}/projects`);
}
