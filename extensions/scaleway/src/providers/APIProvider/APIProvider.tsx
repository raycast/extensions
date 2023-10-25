// @scaleway/sdk extends Request
// https://github.com/scaleway/scaleway-sdk-js/blob/397fc3edf40583f31a89ecb5db401f36ddd5844b/packages/clients/src/scw/fetch/http-interceptors.ts#L21
// it's only available on browser or node 18 without remove experimental feature.
// it's was remove inside raycast https://developers.raycast.com/changelog#1.46.0-2023-01-18
import 'cross-fetch/polyfill'
import {
  AppleSilicon,
  BareMetal,
  Block,
  Cockpit,
  Container,
  DocumentDB,
  Domain,
  Function,
  IAM,
  IOT,
  IPAM,
  IPFS,
  Instance,
  K8S,
  LB,
  MNQ,
  RDB,
  Redis,
  Registry,
  Secret,
  TransactionalEmail,
  VPC,
  VPCGW,
  Webhosting,
  createClient,
  enableConsoleLogger,
} from '@scaleway/sdk'
import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { getPreferenceUser } from './helpers'

const clientSetting = getPreferenceUser()

type APIContextValue = {
  appleSiliconV1Alpha1: AppleSilicon.v1alpha1.API
  blockV1Alpha1: Block.v1alpha1.API
  cockpitV1Beta1: Cockpit.v1beta1.API
  containerV1Beta1: Container.v1beta1.API
  documentDBV1Beta1: DocumentDB.v1beta1.API
  domainRegistrarV2beta1: Domain.v2beta1.RegistrarAPI
  domainV2beta1: Domain.v2beta1.API
  elasticMetalV1: BareMetal.v1.API
  functionV1beta1: Function.v1beta1.API
  iamV1alpha1: IAM.v1alpha1.API
  instanceV1: Instance.v1.API
  iotV1: IOT.v1.API
  ipamV1: IPAM.v1.API
  ipfsV1Alpha1: IPFS.v1alpha1.API
  k8sV1: K8S.v1.API
  loadbalancerV1: LB.v1.ZonedAPI
  mnqV1alpha1: MNQ.v1alpha1.API
  privateNetworksV1: VPC.v1.API
  publicGatewaysV1: VPCGW.v1.API
  redisV1: Redis.v1.API
  registryV1: Registry.v1.API
  relationalDatabaseV1: RDB.v1.API
  secretManager: Secret.v1alpha1.API
  transactionalEmailV1alpha1: TransactionalEmail.v1alpha1.API
  webhostingV1alpha1: Webhosting.v1alpha1.API
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

    enableConsoleLogger('debug')

    return {
      appleSiliconV1Alpha1: new AppleSilicon.v1alpha1.API(client),
      blockV1Alpha1: new Block.v1alpha1.API(client),
      cockpitV1Beta1: new Cockpit.v1beta1.API(client),
      containerV1Beta1: new Container.v1beta1.API(client),
      documentDBV1Beta1: new DocumentDB.v1beta1.API(client),
      domainRegistrarV2beta1: new Domain.v2beta1.RegistrarAPI(client),
      domainV2beta1: new Domain.v2beta1.API(client),
      elasticMetalV1: new BareMetal.v1.API(client),
      functionV1beta1: new Function.v1beta1.API(client),
      iamV1alpha1: new IAM.v1alpha1.API(client),
      instanceV1: new Instance.v1.API(client),
      iotV1: new IOT.v1.API(client),
      ipamV1: new IPAM.v1.API(client),
      ipfsV1Alpha1: new IPFS.v1alpha1.API(client),
      k8sV1: new K8S.v1.API(client),
      loadbalancerV1: new LB.v1.ZonedAPI(client),
      mnqV1alpha1: new MNQ.v1alpha1.API(client),
      privateNetworksV1: new VPC.v1.API(client),
      publicGatewaysV1: new VPCGW.v1.API(client),
      redisV1: new Redis.v1.API(client),
      registryV1: new Registry.v1.API(client),
      relationalDatabaseV1: new RDB.v1.API(client),
      secretManager: new Secret.v1alpha1.API(client),
      transactionalEmailV1alpha1: new TransactionalEmail.v1alpha1.API(client),
      webhostingV1alpha1: new Webhosting.v1alpha1.API(client),
    }
  }, [])

  return <APIContext.Provider value={apis}>{children}</APIContext.Provider>
}
