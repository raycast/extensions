import { Container, ContainerDomain, ContainerLog, Namespace } from './types'
import { ScalewayAPI } from './api'
import { fakeContainers, fakeDomains, fakeLogs, fakeNamespaces } from './fake-data/fake-containers'

export class ContainersAPI {
  private static readonly REGIONS = ['fr-par', 'nl-ams', 'pl-waw']

  public static async getAllNamespaces(): Promise<Namespace[]> {
    if (process.env.NODE_ENV === 'development') return fakeNamespaces

    const responses = await Promise.all(
      ContainersAPI.REGIONS.map((region) =>
        ScalewayAPI.get<{ namespaces: Namespace[] }>(
          `/containers/v1beta1/regions/${region}/namespaces`
        )
      )
    )
    return responses.map((r) => r.namespaces).flat()
  }

  public static async getAllContainers(): Promise<Container[]> {
    if (process.env.NODE_ENV === 'development') return fakeContainers

    const responses = await Promise.all(
      ContainersAPI.REGIONS.map((region) =>
        ScalewayAPI.get<{ containers: Container[] }>(
          `/containers/v1beta1/regions/${region}/containers`
        )
      )
    )
    return responses.map((r) => r.containers).flat()
  }

  public static async getAllDomains(): Promise<ContainerDomain[]> {
    if (process.env.NODE_ENV === 'development') return fakeDomains

    const responses = await Promise.all(
      ContainersAPI.REGIONS.map((region) =>
        ScalewayAPI.get<{ domains: ContainerDomain[] }>(
          `/containers/v1beta1/regions/${region}/domains`
        )
      )
    )
    return responses.map((r) => r.domains).flat()
  }

  public static async deployContainer(container: Container): Promise<void> {
    if (process.env.NODE_ENV === 'development') return await new Promise((r) => setTimeout(r, 300))

    await ScalewayAPI.post(
      `/containers/v1beta1/regions/${container.region}/containers/${container.id}/deploy`
    )
  }

  public static async getContainerLogs(container: Container): Promise<ContainerLog[]> {
    if (process.env.NODE_ENV === 'development') return fakeLogs

    const response = await ScalewayAPI.get<{ logs: ContainerLog[] }>(
      `/containers/v1beta1/regions/${container.region}/containers/${container.id}/logs`,
      { page_size: 50 }
    )
    return response.logs
  }
}
