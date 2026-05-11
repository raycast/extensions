// @scaleway/sdk extends Request
// https://github.com/scaleway/scaleway-sdk-js/blob/397fc3edf40583f31a89ecb5db401f36ddd5844b/packages/clients/src/scw/fetch/http-interceptors.ts#L21
// it's only available on browser or node 18 without remove experimental feature.
// it's was remove inside raycast https://developers.raycast.com/changelog#1.46.0-2023-01-18
// import 'cross-fetch/polyfill'

import {
  Applesiliconv1alpha1,
  Baremetalv1,
  Blockv1alpha1,
  Containerv1beta1,
  Domainv2beta1,
  Functionv1beta1,
  Iamv1alpha1,
  Instancev1,
  Iotv1,
  Ipamv1,
  Jobsv1alpha1,
  K8Sv1,
  Lbv1,
  Rdbv1,
  Redisv1,
  Registry,
  Secret,
  Temv1alpha1,
  Vpcgwv1,
  Vpcv2,
  Webhostingv1,
} from '@scaleway/sdk'
import {
  createAdvancedClient,
  enableConsoleLogger,
  withProfile,
  withUserAgent,
} from '@scaleway/sdk-client'
import { getPreferenceUser } from './getPreferenceUser'

const clientSetting = getPreferenceUser()

export const useAPI = () => {
  const apis = () => {
    const client = createAdvancedClient(withProfile(clientSetting), withUserAgent('Raycast'))

    enableConsoleLogger('silent')

    return {
      appleSiliconV1Alpha1: new Applesiliconv1alpha1.API(client),
      blockV1Alpha1: new Blockv1alpha1.API(client),
      containerV1Beta1: new Containerv1beta1.API(client),
      domainRegistrarV2beta1: new Domainv2beta1.RegistrarAPI(client),
      domainV2beta1: new Domainv2beta1.API(client),
      elasticMetalV1: new Baremetalv1.API(client),
      functionV1beta1: new Functionv1beta1.API(client),
      iamV1alpha1: new Iamv1alpha1.API(client),
      instanceV1: new Instancev1.API(client),
      iotV1: new Iotv1.API(client),
      ipamV1: new Ipamv1.API(client),
      jobsV1alpha1: new Jobsv1alpha1.API(client),
      k8sV1: new K8Sv1.API(client),
      loadbalancerV1: new Lbv1.ZonedAPI(client),
      vpcV2: new Vpcv2.API(client),
      publicGatewaysV1: new Vpcgwv1.API(client),
      redisV1: new Redisv1.API(client),
      registryV1: new Registry.v1.API(client),
      relationalDatabaseV1: new Rdbv1.API(client),
      secretManager: new Secret.v1beta1.API(client),
      transactionalEmailV1alpha1: new Temv1alpha1.API(client),
      webhostingv1: new Webhostingv1.HostingAPI(client),
    }
  }

  return apis()
}
