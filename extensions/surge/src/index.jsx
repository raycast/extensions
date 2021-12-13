import { useEffect, useState } from "react"
import { Detail, List, ToastStyle, getPreferenceValues, showToast } from "@raycast/api"
import api from "./api"

import CapabilitiesActions from "./CapabilitiesActions"
import EnhancedMode from "./EnhancedMode"
import FlushDNS from "./FlushDNS"
import OutboundModeActions from "./OutboundModeActions"
import ProxyPolicies from "./ProxyPolicies"
import ReloadProfile from "./ReloadProfile"
import SetAsSystemProxy from "./SetAsSystemProxy"
import SwitchProfile from "./SwitchProfile"

export default function Command() {
  // https://developers.raycast.com/api-reference/preferences#getpreferencevalues
  // Get values of the preferences object.
  const preferences = getPreferenceValues()
  const [xKey] = useState(preferences["x-key"])
  const [port] = useState(preferences.port)

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const [currentOutboundMode, setCurrentOutboundMode] = useState("")
  const [currentProfile, setCurrentProfile] = useState("")
  const [isSystemProxyEnabled, setSystemProxyStatus] = useState(false)
  const [isEnhancedModeEnabled, setEnhancedModeStatus] = useState(false)
  const [isHttpCaptureEnabled, setHttpCaptureStatus] = useState(false)
  const [isMitmEnabled, setMitmStatus] = useState(false)
  const [isRewriteEnabled, setRewriteStatus] = useState(false)
  const [isScriptingEnabled, setScriptingStatus] = useState(false)
  const [allPolicyGroups, setAllPolicyGroups] = useState({})
  const [allSelectOptions, setAllSelectOptions] = useState([])
  const [allProfiles, setAllProfiles] = useState([])

  async function fetchData() {
    try {
      const [
        currentOutboundMode,
        currentSystemProxyStatus,
        currentEnhancedMode,
        currentHttpCaptureStatus,
        currentMitmStatus,
        currentRewriteStatus,
        currentScriptingStatus,
        allPolicyGroups,
        currentProfile,
        allProfiles
      ] = await Promise.all([
        await api(xKey, port).getOutboundMode(),
        await api(xKey, port).getSystemProxyStatus(),
        await api(xKey, port).getEnhancedMode(),
        await api(xKey, port).getHttpCaptureStatus(),
        await api(xKey, port).getMitmStatus(),
        await api(xKey, port).getRewriteStatus(),
        await api(xKey, port).getScriptingStatus(),
        await api(xKey, port).getPolicyGroups(),
        await api(xKey, port).getProfile(),
        await api(xKey, port).getProfiles()
        // ...
      ])

      const allSelectOptions = await Promise.all(
        Object.entries(allPolicyGroups.data).map(async ([name]) => {
          const { data } = await api(xKey, port).getSelectOptionFromPolicyGroup(name)
          return data.policy
        })
      )

      setCurrentOutboundMode(currentOutboundMode.data.mode)
      setCurrentProfile(currentProfile.data.name)
      setSystemProxyStatus(currentSystemProxyStatus.data.enabled)
      setEnhancedModeStatus(currentEnhancedMode.data.enabled)
      setHttpCaptureStatus(currentHttpCaptureStatus.data.enabled)
      setMitmStatus(currentMitmStatus.data.enabled)
      setRewriteStatus(currentRewriteStatus.data.enabled)
      setScriptingStatus(currentScriptingStatus.data.enabled)
      setAllPolicyGroups(allPolicyGroups.data)
      setAllSelectOptions(allSelectOptions)
      setAllProfiles(allProfiles.data.profiles)
    } catch (err) {
      setIsError(true)

      await showToast(
        ToastStyle.Failure,
        "Failed",
        "Please check your Surge version, X-Key, port and HTTP API function availability"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => fetchData(), [])

  if (isLoading) {
    return <List isLoading />
  } else if (isError) {
    return <Detail markdown="No results" />
  } else {
    return (
      <List>
        <OutboundModeActions xKey={xKey} port={port} currentOutboundMode={currentOutboundMode} />

        {Object.keys(allPolicyGroups).length > 0 ? (
          <ProxyPolicies
            xKey={xKey}
            port={port}
            allPolicyGroups={allPolicyGroups}
            allSelectOptions={allSelectOptions}
          />
        ) : null}

        <SetAsSystemProxy xKey={xKey} port={port} isSystemProxyEnabled={isSystemProxyEnabled} />

        <EnhancedMode xKey={xKey} port={port} isEnhancedModeEnabled={isEnhancedModeEnabled} />

        <CapabilitiesActions
          xKey={xKey}
          port={port}
          isHttpCaptureEnabled={isHttpCaptureEnabled}
          isMitmEnabled={isMitmEnabled}
          isRewriteEnabled={isRewriteEnabled}
          isScriptingEnabled={isScriptingEnabled}
        />

        {allProfiles.length > 0 ? (
          <>
            <SwitchProfile xKey={xKey} port={port} allProfiles={allProfiles} currentProfile={currentProfile} />
            <ReloadProfile xKey={xKey} port={port} />
          </>
        ) : null}

        <FlushDNS xKey={xKey} port={port} />
      </List>
    )
  }
}
