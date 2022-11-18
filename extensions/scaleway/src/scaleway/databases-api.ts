import { Database } from './types'
import { ScalewayAPI } from './api'
import { fakeDatabases } from './fake-data/fake-databases'

export class DatabasesAPI {
  private static readonly REGIONS = ['fr-par', 'nl-ams', 'pl-waw']

  public static async getAllDatabases(): Promise<Database[]> {
    if (process.env.NODE_ENV === 'development') return fakeDatabases

    const responses = await Promise.all(
      DatabasesAPI.REGIONS.map((region) =>
        ScalewayAPI.get<{ instances: Database[] }>(`/rdb/v1/regions/${region}/instances`)
      )
    )
    return responses.map((r) => r.instances).flat()
  }
}
