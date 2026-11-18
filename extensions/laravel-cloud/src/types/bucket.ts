export interface Bucket {
  id: string;
  type: "filesystems";
  attributes: {
    name: string;
    type: "cloudflare_r2";
    status: BucketStatus;
    visibility: "private" | "public";
    jurisdiction: "default" | "eu";
    endpoint: string | null;
    url: string | null;
    allowed_origins: string[] | null;
    created_at: string | null;
  };
  relationships?: {
    keys?: { data: { id: string; type: string }[] };
  };
}

export interface BucketKey {
  id: string;
  type: "filesystemKeys";
  attributes: {
    name: string;
    permission: "read_write" | "read_only";
    access_key_id: string | null;
    access_key_secret: string | null;
    created_at: string | null;
  };
}

export type BucketStatus = "creating" | "updating" | "available" | "deleting" | "deleted" | "unknown";
