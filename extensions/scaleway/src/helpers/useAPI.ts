// @scaleway/sdk extends Request
// https://github.com/scaleway/scaleway-sdk-js/blob/397fc3edf40583f31a89ecb5db401f36ddd5844b/packages/clients/src/scw/fetch/http-interceptors.ts#L21
// it's only available on browser or node 18 without remove experimental feature.
// it's was remove inside raycast https://developers.raycast.com/changelog#1.46.0-2023-01-18
// import 'cross-fetch/polyfill'

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
  Jobs,
  K8S,
  LB,
  RDB,
  Redis,
  Registry,
  Secret,
  TransactionalEmail,
  VPC,
  VPCGW,
  Webhosting,
  createAdvancedClient,
  enableConsoleLogger,
  withProfile,
  withUserAgent,
} from '@scaleway/sdk'
import { getPreferenceUser } from './getPreferenceUser'

export const useAPI = () => {
  const apis = () => {
    const clientSetting = getPreferenceUser()
    const client = createAdvancedClient(withProfile(clientSetting), withUserAgent('Raycast'))

    enableConsoleLogger('silent')

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
      jobsV1alpha1: new Jobs.v1alpha1.API(client),
      k8sV1: new K8S.v1.API(client),
      loadbalancerV1: new LB.v1.ZonedAPI(client),
      vpcV2: new VPC.v2.API(client),
      publicGatewaysV1: new VPCGW.v1.API(client),
      redisV1: new Redis.v1.API(client),
      registryV1: new Registry.v1.API(client),
      relationalDatabaseV1: new RDB.v1.API(client),
      secretManager: new Secret.v1beta1.API(client),
      transactionalEmailV1alpha1: new TransactionalEmail.v1alpha1.API(client),
      webhostingV1alpha1: new Webhosting.v1alpha1.API(client),
    }
  }

  return apis()
}
