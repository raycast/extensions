import {
  ECRClient,
  DescribeRepositoriesCommand,
  Repository,
  ListImagesCommand,
  ImageIdentifier,
} from "@aws-sdk/client-ecr";
import { AWS_URL_BASE } from "../constants";
import { isReadyToFetch } from "../util";

const ecrClient = new ECRClient({});

export async function fetchRepositories(): Promise<Repository[]> {
  if (!isReadyToFetch()) return [];

  const repositories = await fetchAllRepositories();
  return repositories || [];
}

export async function fetchImages(registryId: string, repositoryName: string): Promise<ImageIdentifier[]> {
  if (!isReadyToFetch()) return [];

  const images = await fetchRepositoryImages(registryId, repositoryName);
  return images || [];
}

async function fetchAllRepositories(token?: string, accRepositories?: Repository[]): Promise<Repository[]> {
  const { repositories, nextToken } = await ecrClient.send(new DescribeRepositoriesCommand({ nextToken: token }));
  const combinedRepositories = [...(accRepositories || []), ...(repositories || [])];

  if (nextToken) {
    return fetchAllRepositories(nextToken, combinedRepositories);
  }

  return combinedRepositories;
}

async function fetchRepositoryImages(
  registryId: string,
  repositoryName: string,
  token?: string,
  accImages?: ImageIdentifier[],
): Promise<ImageIdentifier[]> {
  const { imageIds, nextToken } = await ecrClient.send(
    new ListImagesCommand({ registryId, repositoryName, nextToken: token }),
  );

  const combinedImages = [...(accImages || []), ...(imageIds || [])];

  if (nextToken) {
    return fetchRepositoryImages(registryId, repositoryName, nextToken, combinedImages);
  }

  return combinedImages;
}

export function getRepositoryUrl(registryId: string, repositoryName: string) {
  return `${AWS_URL_BASE}/ecr/repositories/private/${registryId}/${repositoryName}?region=${process.env.AWS_REGION}`;
}

export function getImageUrl(repository: Repository, imageDigest: string) {
  return `${AWS_URL_BASE}/ecr/repositories/private/${repository.registryId}/${repository.repositoryName}/_/image/${imageDigest}/details??region=${process.env.AWS_REGION}`;
}
