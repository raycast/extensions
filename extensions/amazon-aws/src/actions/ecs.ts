import {
  Cluster,
  ContainerDefinition,
  DescribeClustersCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  Service,
  Task,
} from "@aws-sdk/client-ecs";
import { AWS_URL_BASE } from "../constants";
import { isReadyToFetch } from "../util";

const ecsClient = new ECSClient({});

export async function fetchClusters(): Promise<Cluster[]> {
  if (!isReadyToFetch()) return [];
  const clustersArns = await fetchClusterArns();

  const { clusters } = await ecsClient.send(new DescribeClustersCommand({ clusters: clustersArns }));
  return clusters || [];
}

export async function fetchServices(clusterArn: string): Promise<Service[]> {
  if (!isReadyToFetch()) return [];

  const servicesArns = await fetchServiceArns(clusterArn);
  const serviceChunks: string[][] = getChunks(servicesArns, 10);

  const services = await Promise.all(
    serviceChunks.map((chunk) => ecsClient.send(new DescribeServicesCommand({ cluster: clusterArn, services: chunk }))),
  );

  return services.map((entry) => entry.services || []).flat(2);
}

export async function fetchTasks(clusterArn: string, serviceName: string): Promise<Task[]> {
  if (!isReadyToFetch()) return [];

  const taskArns = await fetchTasksArns(clusterArn, serviceName);
  const taskChunks: string[][] = getChunks(taskArns, 100);

  const tasks = await Promise.all(
    taskChunks.map((chunk) => ecsClient.send(new DescribeTasksCommand({ cluster: clusterArn, tasks: chunk }))),
  );

  return tasks.map((entry) => entry.tasks || []).flat(2);
}

export async function fetchTaskContainers(taskDefArn: string): Promise<ContainerDefinition[]> {
  if (!isReadyToFetch()) return [];

  const { taskDefinition } = await ecsClient.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }));

  return taskDefinition?.containerDefinitions || [];
}

function getChunks(arr: string[], chunkSize: number): string[][] {
  return arr.reduce<string[][]>((acc, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);
    if (!acc[chunkIndex]) {
      acc[chunkIndex] = []; // start a new chunk
    }
    acc[chunkIndex].push(item);
    return acc;
  }, []);
}

async function fetchClusterArns(token?: string, accClusters?: string[]): Promise<string[]> {
  const { clusterArns, nextToken } = await ecsClient.send(new ListClustersCommand({ nextToken: token }));
  const combinedClusters = [...(accClusters || []), ...(clusterArns || [])];

  if (nextToken) {
    return fetchClusterArns(nextToken, combinedClusters);
  }

  return combinedClusters;
}

async function fetchServiceArns(clusterArn: string, token?: string, accServices?: string[]): Promise<string[]> {
  const { serviceArns, nextToken } = await ecsClient.send(
    new ListServicesCommand({ cluster: clusterArn, nextToken: token }),
  );

  const combinedServices = [...(accServices || []), ...(serviceArns || [])];

  if (nextToken) {
    return fetchServiceArns(clusterArn, nextToken, combinedServices);
  }

  return combinedServices;
}

async function fetchTasksArns(
  clusterArn: string,
  serviceName: string,
  token?: string,
  accTasks?: string[],
): Promise<string[]> {
  const { taskArns, nextToken } = await ecsClient.send(
    new ListTasksCommand({ cluster: clusterArn, serviceName, nextToken: token }),
  );

  const combinedTasks = [...(accTasks || []), ...(taskArns || [])];

  if (nextToken) {
    return fetchTasksArns(clusterArn, serviceName, nextToken, combinedTasks);
  }

  return combinedTasks;
}

export function getClusterUrl(cluster: Cluster) {
  return `${AWS_URL_BASE}/ecs/home?region=${process.env.AWS_REGION}#/clusters/${cluster.clusterName}/services`;
}

export function getServiceUrl(service: Service) {
  const clusterName = service.clusterArn?.split("/").pop();
  return `${AWS_URL_BASE}/ecs/home?region=${process.env.AWS_REGION}#/clusters/${clusterName}/services/${service.serviceName}/details`;
}

export function getTaskUrl(task: Task) {
  const clusterName = task.clusterArn?.split("/").pop();
  return `${AWS_URL_BASE}/ecs/home?region=${process.env.AWS_REGION}#/clusters/${clusterName}/tasks/${task.taskArn}/details`;
}

export function getTaskContainerUrl(taskDefinitionArn: string) {
  const taskDefinitionNameVersionFragments = taskDefinitionArn.split("/").pop()?.split(":");
  const taskDefinitionName = taskDefinitionNameVersionFragments?.[0];
  const taskDefinitionVersion = taskDefinitionNameVersionFragments?.[1];
  return `${AWS_URL_BASE}/ecs/home?region=${process.env.AWS_REGION}#/taskDefinitions/${taskDefinitionName}/${taskDefinitionVersion}`;
}
