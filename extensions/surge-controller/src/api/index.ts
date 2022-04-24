import https from 'https'
import request from './request'
import axios, { AxiosResponse, Method } from 'axios'
import { checkSystemIsIOS, getCurrentBackend, getGroupTypeByDetail, getSortedTraffic } from '../utils'
import {
  ApiLoaderType,
  FeatureResponseT,
  ModuleResponseT,
  PoliciesResponseT,
  PolicyGroupDetailResponseT,
  PolicyGroupResponseT,
  PolicyGroupSelectResponseT,
  TrafficResponseT,
} from '../utils/types'

enum methods {
  get = 'get',
  post = 'post',
}

const api = {
  dns: '/dns',
  flushDnsCache: '/dns/flush',
  traffic: '/traffic',
  modules: '/modules',
  outbound: '/outbound',
  policies: '/policies',
  policiesDetail: '/policies/detail',
  policiesBenchmark: '/policies/benchmark_results',
  policyGroups: '/policy_groups',
  policyGroupsSelect: '/policy_groups/select',
  policyGroupsTest: '/policy_groups/test',
  features: '/features',
  devices: '/devices',
  events: '/events',
  profile: '/profiles',
  recentRequest: '/requests/recent',
  activeRequest: '/requests/active',
  changeProfile: '/profiles/switch',
  reloadProfile: '/profiles/reload',
  getCurrentProfile: '/profiles/current?sensitive=0',
  featureApiList: ['system_proxy', 'enhanced_mode', 'capture', 'mitm', 'rewrite', 'scripting'],
}

const setApiLoader = (api: string, method: Method, dataKey?: string): ApiLoaderType => {
  return async (params) => {
    const res = await request({
      method,
      url: `${api}`,
      data: method === methods.post ? params : null,
      params: method === methods.get ? params : null,
    })

    if (dataKey) {
      res.data = res.data[dataKey]
    }

    return res
  }
}

export const getDNS = setApiLoader(api.dns, methods.get, 'dnsCache')
export const flushDnsCache = setApiLoader(api.flushDnsCache, methods.post)
export const switchModule = setApiLoader(api.modules, methods.post)
export const getOutboundMode = setApiLoader(api.outbound, methods.get, 'mode')
export const changeOutboundMode = setApiLoader(api.outbound, methods.post)
export const changeProfile = setApiLoader(api.changeProfile, methods.post)
export const reloadProfile = setApiLoader(api.reloadProfile, methods.post)
export const changeOptionOfGroup = setApiLoader(api.policyGroupsSelect, methods.post)
export const testPolicyGroup = setApiLoader(api.policyGroupsTest, methods.post)
export const getPoliciesBenchmark = setApiLoader(api.policiesBenchmark, methods.get)
export const getProfiles = setApiLoader(api.profile, methods.get, 'profiles')
export const getCurrentProfile = setApiLoader(api.getCurrentProfile, methods.get)
export const getDevices = setApiLoader(api.devices, methods.get, 'devices')
export const setDevices = setApiLoader(api.devices, methods.post)
export const getEvents = setApiLoader(api.events, methods.get, 'events')
export const getRencentRequest = setApiLoader(api.recentRequest, methods.get, 'requests')
export const getActiveRequest = setApiLoader(api.activeRequest, methods.get, 'requests')

export const testBackendConnect = async () => {
  let status = true
  const { url, xKey } = await getCurrentBackend()
  await axios
    .get(api.outbound, {
      baseURL: `${url}/v1`,
      headers: { 'X-Key': xKey },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      timeout: 5000,
    })
    .catch(() => (status = false))
  return status
}

export const getTraffic = async () => {
  const {
    data: { interface: interfaces, connector },
  } = await request.get<TrafficResponseT>(api.traffic)

  const data = Object.entries(interfaces)
    .map(([name, value]) => ({
      name,
      ...value,
    }))
    .concat(getSortedTraffic(connector))

  return {
    data,
  }
}

export const getModules = async () => {
  const {
    data: { available, enabled },
  } = await request.get<ModuleResponseT>(api.modules)

  return {
    data: available.map((module) => ({
      name: module,
      status: enabled.includes(module),
    })),
  }
}

export const switchCapability = async (index: number, status: boolean) => {
  const isIOS = await checkSystemIsIOS()
  return request({
    method: methods.post,
    url: `${api.features}/${api.featureApiList[isIOS ? index + 2 : index]}`,
    data: { enabled: status },
  })
}

export const getCapabilityList = async () => {
  const isIOS = await checkSystemIsIOS()
  const featureTitleList = ['System Proxy', 'Enhanced Mode', 'HTTP Capture', 'MITM', 'Rewrite', 'Scripting']
  const featureApiList = api.featureApiList.slice(isIOS ? 2 : 0)
  const res: AxiosResponse<FeatureResponseT>[] = await Promise.all(
    featureApiList.map((feature) => {
      return request({
        method: methods.get,
        url: `${api.features}/${feature}`,
      })
    }),
  )

  return {
    data: res.map((item, i) => ({
      title: featureTitleList[isIOS ? i + 2 : i],
      status: item.data.enabled,
    })),
  }
}

const getPolicyGroupType = async (groupNameList: string[]) => {
  const policyGroupDetail = await Promise.all(
    groupNameList.map((name) =>
      request.get<PolicyGroupDetailResponseT>(
        `${api.policiesDetail}?policy_name=${encodeURIComponent(name)}`,
      ),
    ),
  )
  return policyGroupDetail.map(({ data: detail }) => getGroupTypeByDetail(JSON.stringify(detail)))
}

export const getPolicies = async () => {
  const [
    {
      data: { 'policy-groups': groupNameList },
    },
    { data: policyGroups },
  ] = await Promise.all([
    request.get<PoliciesResponseT>(api.policies),
    request.get<PolicyGroupResponseT>(api.policyGroups),
  ])
  const groupSeleseList = await Promise.all(
    groupNameList.map((name) =>
      request.get<PolicyGroupSelectResponseT>(
        `${api.policyGroupsSelect}?group_name=${encodeURIComponent(name)}`,
      ),
    ),
  )
  const groupTypeList = await getPolicyGroupType(groupNameList)

  return {
    data: groupNameList.map((name, i) => ({
      name,
      type: groupTypeList[i],
      proxies: policyGroups[name],
      select: groupSeleseList[i].data.policy,
    })),
  }
}
