import { List, showToast, Toast } from "@raycast/api";
import { nClient, Versions } from "./util/nClient";
import { useEffect, useState } from "react";
import { VersionSourceDropdown, VersionSourceDropdownValue } from "./components/VersionSourceDropdown";
import { VersionListItem } from "./components/VersionListItem";
import Style = Toast.Style;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [versionSourceFilter, setVersionSourceFilter] = useState<VersionSourceDropdownValue>(
    VersionSourceDropdownValue.Installed,
  );

  const [activeVersion, setActiveVersion] = useState<string | undefined>();
  const [localVersions, setLocalVersions] = useState<Versions>({});
  const [availableVersions, setAvailableVersions] = useState<Versions>({});

  const versionListContent: Versions = Object.assign({}, availableVersions, { ...localVersions });

  useEffect(() => {
    loadActiveAndLocalVersions()
      .then(() => setIsLoading(false))
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  async function loadActiveAndLocalVersions() {
    const localVersionsPromise = nClient.getLocalVersions();
    const activeVersionPromise = nClient.getActiveVersion();

    const [localVersions, activeVersion] = await Promise.all([localVersionsPromise, activeVersionPromise]);

    console.log(`localVersions: ${JSON.stringify(localVersions)};; activeVersion: ${activeVersion}`);
    setLocalVersions(localVersions);
    setActiveVersion(activeVersion);
  }

  async function onActivateVersionClick(version: string) {
    const toast = await showToast(Style.Animated, `Activating version ${version}`, "Hang on…");
    const success = await nClient.activateOrDownloadVersion(version);

    if (success) {
      toast.title = `Activated Version ${version}`;
      toast.message = undefined;
      toast.style = Style.Success;
      setActiveVersion(version);
    } else {
      toast.title = `Activating Version ${version} failed`;
      toast.message = undefined;
      toast.style = Style.Failure;
    }
  }

  async function onDeleteVersionClick(version: string) {
    const toast = await showToast(Style.Animated, `Deleting version ${version}`, "Hang on…");
    const success = await nClient.deleteVersion(version);

    if (success) {
      toast.title = `Deleted Version ${version}`;
      toast.message = undefined;
      toast.style = Style.Success;

      await loadActiveAndLocalVersions();
    } else {
      toast.title = `Deleting Version ${version} failed`;
      toast.message = undefined;
      toast.style = Style.Failure;
    }
  }

  async function onDownloadAndActivateVersionClick(version: string) {
    const toast = await showToast(Style.Animated, `Downloading version ${version}`, "Hang on…");
    const success = await nClient.activateOrDownloadVersion(version);

    if (success) {
      toast.title = `Downloaded and Activated Version ${version}`;
      toast.message = undefined;
      toast.style = Style.Success;

      await loadActiveAndLocalVersions();
    } else {
      toast.title = `Download of Version ${version} failed`;
      toast.message = undefined;
      toast.style = Style.Failure;
    }
  }

  async function onSearchBarFilterUpdated(versionSourceFilter: VersionSourceDropdownValue) {
    setVersionSourceFilter(versionSourceFilter);
    setSearchText("");

    if (versionSourceFilter === VersionSourceDropdownValue.All) {
      const availableVersions = await nClient.getAvailableVersions();
      setAvailableVersions(availableVersions);
    } else {
      setAvailableVersions({});
    }
  }

  if (!isLoading && Object.keys(versionListContent).length === 0) {
    return (
      <List
        filtering={true}
        searchText={searchText}
        onSearchTextChange={(search) => {
          setSearchText(search);
        }}
        searchBarAccessory={
          <VersionSourceDropdown
            filter={versionSourceFilter}
            onFilterUpdated={(newValue: VersionSourceDropdownValue) => onSearchBarFilterUpdated(newValue)}
          />
        }
      >
        {versionSourceFilter === VersionSourceDropdownValue.Installed ? (
          <List.Item title="No installed node versions found" />
        ) : (
          <List.Item title="No installed or remote node versions found" />
        )}
      </List>
    );
  }

  return (
    <List
      filtering={true}
      searchText={searchText}
      onSearchTextChange={(search) => setSearchText(search)}
      isLoading={isLoading}
      searchBarAccessory={
        <VersionSourceDropdown
          filter={versionSourceFilter}
          onFilterUpdated={(newValue) => onSearchBarFilterUpdated(newValue)}
        />
      }
    >
      {Object.keys(versionListContent).map((key) => {
        const version = versionListContent[key];

        return VersionListItem(
          version,
          version.version == activeVersion,
          (version) => onActivateVersionClick(version),
          (version) => onDeleteVersionClick(version),
          (version) => onDownloadAndActivateVersionClick(version),
        );
      })}
    </List>
  );
}
