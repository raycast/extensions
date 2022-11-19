import { Instance } from './types'
import { ScalewayAPI } from './api'
import { fakeInstances } from './fake-data/fake-instances'

export class InstancesAPI {
  private static readonly ZONES = [
    ...['fr-par-1', 'fr-par-2', 'fr-par-3'],
    ...['nl-ams-1', 'nl-ams-2'],
    ...['pl-waw-1', 'pl-waw-2'],
  ]

  public static async getAllInstances(): Promise<Instance[]> {
    if (process.env.NODE_ENV === 'development') return fakeInstances

    const responses = await Promise.all(
      InstancesAPI.ZONES.map((zone) =>
        ScalewayAPI.get<{ servers: Instance[] }>(`/instance/v1/zones/${zone}/servers`)
      )
    )
    return responses.map((r) => r.servers).flat()
  }

  public static async powerOnInstance(instance: Instance) {
    if (process.env.NODE_ENV === 'development') return await new Promise((r) => setTimeout(r, 300))

    await ScalewayAPI.post(`/instance/v1/zones/${instance.zone}/servers/${instance.id}/action`, {
      action: 'poweron',
    })
  }

  public static async powerOffInstance(instance: Instance) {
    if (process.env.NODE_ENV === 'development') return await new Promise((r) => setTimeout(r, 300))

    await ScalewayAPI.post(`/instance/v1/zones/${instance.zone}/servers/${instance.id}/action`, {
      action: 'poweroff',
    })
  }

  public static async rebootInstance(instance: Instance) {
    if (process.env.NODE_ENV === 'development') return await new Promise((r) => setTimeout(r, 300))

    await ScalewayAPI.post(`/instance/v1/zones/${instance.zone}/servers/${instance.id}/action`, {
      action: 'reboot',
    })
  }
}
