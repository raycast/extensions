import { apiGet, apiPost, apiDelete } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Bucket, BucketKey } from "../types/bucket";

export async function listBuckets(
  filters?: { name?: string; status?: string },
  include?: string,
): Promise<PaginatedResponse<Bucket>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.status) params["filter[status]"] = filters.status;

  return apiGet<PaginatedResponse<Bucket>>("/buckets", params);
}

export async function createBucket(data: Record<string, unknown>): Promise<SingleResponse<Bucket>> {
  return apiPost<SingleResponse<Bucket>>("/buckets", data);
}

export async function deleteBucket(id: string): Promise<void> {
  return apiDelete(`/buckets/${id}`);
}

export async function listBucketKeys(bucketId: string, include?: string): Promise<PaginatedResponse<BucketKey>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;

  return apiGet<PaginatedResponse<BucketKey>>(`/buckets/${bucketId}/keys`, params);
}

export async function createBucketKey(
  bucketId: string,
  data: { name: string; permission: string },
): Promise<SingleResponse<BucketKey>> {
  return apiPost<SingleResponse<BucketKey>>(`/buckets/${bucketId}/keys`, data as Record<string, unknown>);
}

export async function deleteBucketKey(bucketId: string, keyId: string): Promise<void> {
  return apiDelete(`/buckets/${bucketId}/keys/${keyId}`);
}
