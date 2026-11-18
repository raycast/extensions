export interface Application {
  id: string;
  type: "applications";
  attributes: {
    name: string;
    slug: string;
    region: CloudRegion;
    slack_channel: string | null;
    avatar_url: string;
    repository: {
      full_name: string;
      default_branch: string;
    } | null;
    created_at: string | null;
  };
  relationships?: {
    organization?: { data: { id: string; type: string } | null };
    environments?: { data: { id: string; type: string }[] };
    defaultEnvironment?: { data: { id: string; type: string } | null };
  };
}

export type CloudRegion =
  | "us-east-2"
  | "us-east-1"
  | "eu-central-1"
  | "eu-west-1"
  | "eu-west-2"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ca-central-1"
  | "me-central-1";
