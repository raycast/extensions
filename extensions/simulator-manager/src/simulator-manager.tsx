import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { CATEGORIES } from "./constants";
import { DeviceList } from "./components/DeviceList";
import { SearchBar } from "./components/SearchBar";
import { useDeviceManager } from "./hooks/useDeviceManager";
import { useCategoryManager } from "./hooks/useCategoryManager";
import { useEnvironmentChecker } from "./hooks/useEnvironmentChecker";
import { DeviceDisplayCategory } from "./types";

interface Preferences {
  androidSdkPath?: string;
  deviceTypesToDisplay?: DeviceDisplayCategory;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();

  const { selectedCategory, deviceTypesToDisplay, handleCategoryChange, showDropdown } = useCategoryManager(
    preferences.deviceTypesToDisplay,
  );

  const { androidSdkFound, xcodeFound, isChecking: isCheckingEnvironment } = useEnvironmentChecker();

  const {
    devices,
    fetchDevices,
    isLoading: isLoadingDevices,
  } = useDeviceManager({
    androidSdkFound,
    deviceTypesToDisplay,
    searchText,
    selectedCategory,
    xcodeFound,
  });

  const isLoading = isLoadingDevices || isCheckingEnvironment;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search devices..."
      searchBarAccessory={
        <SearchBar
          categories={CATEGORIES}
          onCategoryChange={handleCategoryChange}
          selectedCategory={selectedCategory}
          showDropdown={showDropdown}
        />
      }
    >
      <DeviceList
        androidSdkFound={androidSdkFound}
        devices={devices}
        isLoading={isLoading}
        onRefresh={fetchDevices}
        searchText={searchText}
        selectedCategory={selectedCategory}
        xcodeFound={xcodeFound}
      />
    </List>
  );
}
