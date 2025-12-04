import { Form, ActionPanel, Action, showToast, Toast, showHUD } from "@raycast/api";
import { listProfiles } from "common/listProfiles";
import { ProfilesItem } from "interfaces/profile";
import { useEffect, useState } from "react";
import { listNativeFilters, listThirdPartyFilters } from "common/listFilters";
import { FiltersItem } from "interfaces/nativeFilter";
import { FiltersItem as ThirdPartyFiltersItem } from "interfaces/thirdPartyFilter";
import { toggleFilter } from "common/toggleFilter";

const ChangeFilters = () => {
  const [profiles, setProfiles] = useState<ProfilesItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | undefined>(undefined);
  const [selectedProfileError, setSelectedProfileError] = useState<string | undefined>(undefined);

  const [nativeFilters, setNativeFilters] = useState<FiltersItem[]>([]);
  const [selectedNativeFilters, setSelectedNativeFilters] = useState<string[]>([]);

  const [thirdPartyFilters, setThirdPartyFilters] = useState<ThirdPartyFiltersItem[]>([]);
  const [selectedThirdPartyFilters, setSelectedThirdPartyFilters] = useState<string[]>([]);

  const [filtersToEnable, setFiltersToEnable] = useState<string[]>([]);
  const [filtersToDisable, setFiltersToDisable] = useState<string[]>([]);

  const getProfiles = async () => {
    const profiles = await listProfiles();
    setProfiles(profiles);
  };

  const getNativeFilters = async () => {
    let nativeFilters: FiltersItem[] = [];
    try {
      nativeFilters = await listNativeFilters(selectedProfile as string);
    } catch (err) {
      if (err instanceof Error) {
        await showToast({
          title: "Native filter fetch error",
          message: err.message,
          style: Toast.Style.Failure,
        });
        return;
      }
    }
    setNativeFilters(nativeFilters);
    const selectedFilters = nativeFilters.filter((filter) => filter.status);
    const selectedFiltersNames = selectedFilters.map((filter) => filter.PK);
    setSelectedNativeFilters(selectedFiltersNames);
  };

  const getThidPartyFilters = async () => {
    let thirdPartyFilters: ThirdPartyFiltersItem[] = [];
    try {
      thirdPartyFilters = await listThirdPartyFilters(selectedProfile as string);
    } catch (err) {
      if (err instanceof Error) {
        await showToast({
          title: "3rd-party filter fetch error",
          message: err.message,
          style: Toast.Style.Failure,
        });
        return;
      }
    }
    setThirdPartyFilters(thirdPartyFilters);
    const selectedFilters = thirdPartyFilters.filter((filter) => filter.status === 1);
    const selectedFiltersNames = selectedFilters.map((filter) => filter.PK);
    setSelectedThirdPartyFilters(selectedFiltersNames);
  };

  useEffect(() => {
    if (!selectedProfile) return;
    getNativeFilters();
    getThidPartyFilters();
  }, [selectedProfile]);

  useEffect(() => {
    getProfiles();
  }, []);

  const submit = async () => {
    if (!selectedProfile) {
      setSelectedProfileError("Profile is required");
      return;
    }

    const loadingToast = await showToast({
      title: "Updating filters...",
      style: Toast.Style.Animated,
    });

    for (const filterId of filtersToEnable) {
      try {
        await toggleFilter(selectedProfile, filterId, true);
      } catch (err) {
        if (err instanceof Error) {
          await loadingToast.hide();
          setFiltersToDisable([]);
          setFiltersToEnable([]);

          await showToast({
            title: "Filter toggle error",
            message: err.message,
            style: Toast.Style.Failure,
          });
          return;
        }
      }
    }

    for (const filterId of filtersToDisable) {
      try {
        await toggleFilter(selectedProfile, filterId, false);
      } catch (err) {
        if (err instanceof Error) {
          await loadingToast.hide();
          setFiltersToDisable([]);
          setFiltersToEnable([]);

          await showToast({
            title: "Filter toggle error",
            message: err.message,
            style: Toast.Style.Failure,
          });
          return;
        }
      }
    }

    await loadingToast.hide();

    setFiltersToDisable([]);
    setFiltersToEnable([]);

    await showHUD("Filters updated successfully ✅");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Submit" onAction={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="profile"
        title="Profile"
        placeholder="Select a profile"
        onChange={(newValue) => {
          setSelectedProfile(newValue);
        }}
        error={selectedProfileError}
      >
        {profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.PK as string} value={profile.PK.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="nativeFilters"
        title="Native Filters"
        placeholder="Select a native filter"
        onChange={(newValue) => {
          if (selectedNativeFilters.length > newValue.length) {
            const removedFilter = selectedNativeFilters.find((filter) => !newValue.includes(filter));
            if (removedFilter) {
              setFiltersToDisable([...filtersToDisable, removedFilter]);
            }
          } else {
            const addedFilter = newValue.find((filter) => !selectedNativeFilters.includes(filter));
            if (addedFilter) {
              setFiltersToEnable([...filtersToEnable, addedFilter]);
            }
          }

          setSelectedNativeFilters(newValue);
        }}
        value={selectedNativeFilters}
      >
        {nativeFilters.map((filter) => (
          <Form.TagPicker.Item key={filter.PK} value={filter.PK.toString()} title={filter.name} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker
        id="3rdPartyFilters"
        title="3rd-Party Filters"
        placeholder="Select a 3rd-party filter"
        onChange={(newValue) => {
          if (selectedThirdPartyFilters.length > newValue.length) {
            const removedFilter = selectedThirdPartyFilters.find((filter) => !newValue.includes(filter));
            if (removedFilter) {
              setFiltersToDisable([...filtersToDisable, removedFilter]);
            }
          } else {
            const addedFilter = newValue.find((filter) => !selectedThirdPartyFilters.includes(filter));
            if (addedFilter) {
              setFiltersToEnable([...filtersToEnable, addedFilter]);
            }
          }

          setSelectedThirdPartyFilters(newValue);
        }}
        value={selectedThirdPartyFilters}
      >
        {thirdPartyFilters.map((filter) => (
          <Form.TagPicker.Item key={filter.PK} value={filter.PK} title={filter.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
};

export default ChangeFilters;
