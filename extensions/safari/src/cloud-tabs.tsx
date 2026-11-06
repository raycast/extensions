import { getPreferenceValues, List } from "@raycast/api";
import { useThrottle } from "ahooks";
import _ from "lodash";
import { useMemo, useState } from "react";
import { DeviceListSection, FallbackSearchSection } from "./components";
import ProfileDropdown from "./components/ProfileDropdown";
import { useDevices } from "./hooks";
import { filterTabsByProfile, getUniqueProfiles, resolveSelectedProfile } from "./profile";
import { Device, Tab } from "./types";
import { search } from "./utils";

export default function Command() {
  const { devices, isLoading, permissionView, refreshDevices } = useDevices();
  const [searchText, setSearchText] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const throttleSearchText = useThrottle(searchText, { wait: 200 });

  const profiles = useMemo(() => getUniqueProfiles(devices.flatMap((device: Device) => device.tabs ?? [])), [devices]);
  const effectiveProfile = resolveSelectedProfile(selectedProfile, profiles);

  if (permissionView.current) {
    return permissionView.current;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<ProfileDropdown profiles={profiles} onSelection={setSelectedProfile} />}
    >
      {_.map(devices, (device: Device) => {
        if (effectiveProfile !== "all" && device.uuid !== "local") {
          return null;
        }
        const searched = search(
          typeof device.tabs === "undefined" ? [] : device.tabs,
          [
            { name: "title", weight: 3 },
            { name: "title_formatted", weight: 2 },
            { name: "url", weight: 1 },
            { name: "profileName", weight: 1 },
          ],
          throttleSearchText,
        ) as Tab[];
        const tabs = effectiveProfile === "all" ? searched : filterTabsByProfile(searched, effectiveProfile);
        return <DeviceListSection key={device.uuid} device={device} filteredTabs={tabs} refresh={refreshDevices} />;
      })}
      <FallbackSearchSection searchText={searchText} fallbackSearchType={getPreferenceValues().fallbackSearchType} />
    </List>
  );
}
