import { useEffect, useState } from "react";
import { Detail, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

import CapabilitiesActions from "./CapabilitiesActions.js";
import EnhancedMode from "./EnhancedMode.js";
import FlushDNS from "./FlushDNS.js";
import OutboundModeActions from "./OutboundModeActions.js";
import ProxyPolicies from "./ProxyPolicies.js";
import ReloadProfile from "./ReloadProfile.js";
import SetAsSystemProxy from "./SetAsSystemProxy.js";
import SwitchProfile from "./SwitchProfile.js";
import { OutBoundMode } from "./types.js";

export default function Command() {
  // https://developers.raycast.com/api-reference/preferences#getpreferencevalues
  // Get values of the preferences object.
  const preferences = getPreferenceValues();
  const [xKey] = useState(preferences["x-key"]);
  const [port] = useState(preferences.port);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [isMacOSVersion, setIsMacOSVersion] = useState(false);
  const [currentOutboundMode, setCurrentOutboundMode] = useState<OutBoundMode>("rule");
  const [currentProfile, setCurrentProfile] = useState("");
  const [isSystemProxyEnabled, setSystemProxyStatus] = useState(false);
  const [isEnhancedModeEnabled, setEnhancedModeStatus] = useState(false);
  const [isHttpCaptureEnabled, setHttpCaptureStatus] = useState(false);
  const [isMitmEnabled, setMitmStatus] = useState(false);
  const [isRewriteEnabled, setRewriteStatus] = useState(false);
  const [isScriptingEnabled, setScriptingStatus] = useState(false);
  const [allPolicyGroups, setAllPolicyGroups] = useState({});
  const [allSelectOptions, setAllSelectOptions] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState([]);

  async function fetchData() {
    try {
      const isMacOSVersion = await api(xKey, port).isMacOSVersion();

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
        allProfiles,
      ] = await Promise.all([
        api(xKey, port).getOutboundMode(),
        isMacOSVersion ? api(xKey, port).getSystemProxyStatus() : Promise.resolve({ data: { enabled: false } }),
        isMacOSVersion ? api(xKey, port).getEnhancedMode() : Promise.resolve({ data: { enabled: false } }),
        api(xKey, port).getHttpCaptureStatus(),
        api(xKey, port).getMitmStatus(),
        api(xKey, port).getRewriteStatus(),
        api(xKey, port).getScriptingStatus(),
        api(xKey, port).getPolicyGroups(),
        api(xKey, port).getProfile(),
        isMacOSVersion ? api(xKey, port).getProfiles() : Promise.resolve({ data: { profiles: [] } }),
        // ...
      ]);

      const allSelectOptions = await Promise.all(
        Object.entries(allPolicyGroups.data).map(async ([name]) => {
          const { data } = await api(xKey, port).getSelectOptionFromPolicyGroup(name);
          return data.policy;
        }),
      );

      setIsMacOSVersion(isMacOSVersion);
      setCurrentOutboundMode(currentOutboundMode.data.mode);
      setCurrentProfile(currentProfile.data.name);
      setSystemProxyStatus(currentSystemProxyStatus.data.enabled);
      setEnhancedModeStatus(currentEnhancedMode.data.enabled);
      setHttpCaptureStatus(currentHttpCaptureStatus.data.enabled);
      setMitmStatus(currentMitmStatus.data.enabled);
      setRewriteStatus(currentRewriteStatus.data.enabled);
      setScriptingStatus(currentScriptingStatus.data.enabled);
      setAllPolicyGroups(allPolicyGroups.data);
      setAllSelectOptions(allSelectOptions);
      setAllProfiles(allProfiles.data.profiles);
    } catch (error) {
      setIsError(true);
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your Surge version, X-Key, port and HTTP API function availability",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <List isLoading />;
  } else if (isError) {
    return <Detail markdown="No results" />;
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

        {isMacOSVersion && <SetAsSystemProxy xKey={xKey} port={port} isSystemProxyEnabled={isSystemProxyEnabled} />}

        {isMacOSVersion && <EnhancedMode xKey={xKey} port={port} isEnhancedModeEnabled={isEnhancedModeEnabled} />}

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
    );
  }
}
