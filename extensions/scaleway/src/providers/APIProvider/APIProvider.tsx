import { loadProfileFromConfigurationFile } from '@scaleway/configuration-loader'
import {
  AppleSilicon,
  BareMetal,
  Container,
  Domain,
  IAM,
  IOT,
  Instance,
  LB,
  RDB,
  Redis,
  TransactionalEmail,
  createClient,
} from '@scaleway/sdk'
import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { getPreferenceUser } from './helpers'

const profile = loadProfileFromConfigurationFile()
const preferenceUser = getPreferenceUser()

// Will take account if you already use CLI and allow surcharge from Raycast settings
const clientSetting = {
  ...profile,
  ...preferenceUser,
}

type APIContextValue = {
  appleSiliconV1Alpha1: AppleSilicon.v1alpha1.API
  containerV1Beta1: Container.v1beta1.API
  domainRegistrarV2beta1: Domain.v2beta1.RegistrarAPI
  domainV2beta1: Domain.v2beta1.API
  elasticMetalV1: BareMetal.v1.API
  iamV1Alpha1: IAM.v1alpha1.API
  instanceV1: Instance.v1.API
  iotV1: IOT.v1.API
  loadbalancerV1: LB.v1.ZonedAPI
  redisV1: Redis.v1.API
  relationalDatabaseV1: RDB.v1.API
  transactionalEmailV1Alpha1: TransactionalEmail.v1alpha1.API
}

const APIContext = createContext<APIContextValue | undefined>(undefined)

type APIProviderProps = {
  children?: ReactNode
}

export const useAPI = () => {
  const context = useContext(APIContext)
  if (!context) throw new Error('useAPI must be used in APIContext')

  return context
}

export const APIProvider = ({ children }: APIProviderProps) => {
  const apis = useMemo(() => {
    const client = createClient(clientSetting)

    return {
      appleSiliconV1Alpha1: new AppleSilicon.v1alpha1.API(client),
      containerV1Beta1: new Container.v1beta1.API(client),
      domainRegistrarV2beta1: new Domain.v2beta1.RegistrarAPI(client),
      domainV2beta1: new Domain.v2beta1.API(client),
      elasticMetalV1: new BareMetal.v1.API(client),
      iamV1Alpha1: new IAM.v1alpha1.API(client),
      instanceV1: new Instance.v1.API(client),
      iotV1: new IOT.v1.API(client),
      loadbalancerV1: new LB.v1.ZonedAPI(client),
      redisV1: new Redis.v1.API(client),
      relationalDatabaseV1: new RDB.v1.API(client),
      transactionalEmailV1Alpha1: new TransactionalEmail.v1alpha1.API(client),
    }
  }, [])

  return <APIContext.Provider value={apis}>{children}</APIContext.Provider>
}
