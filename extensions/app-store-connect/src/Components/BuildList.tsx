import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";
import {
  App,
  BuildWithBetaDetailAndBetaGroups,
  buildsWithBetaDetailSchema,
  preReleaseVersionSchemas,
} from "../Model/schemas";
import BuildItem from "./BuildItem";

interface BuildListProps {
  app: App;
}

interface VersionWithPlatform {
  id: string;
  platform: string;
  version: string;
}

export default function BuildList({ app }: BuildListProps) {
  const [selectedVersion, setSelectedVersion] = useState<VersionWithPlatform | undefined>(undefined);

  const [buildsPath, setBuildsPath] = useState<string | undefined>(undefined);

  const {
    data: builds,
    isLoading: isLoadingApp,
    pagination,
  } = useAppStoreConnectApi(buildsPath, (response) => {
    return buildsWithBetaDetailSchema.parse(response);
  });

  const { data: preReleaseVersions, isLoading: isLoadingPreReleaseVersions } = useAppStoreConnectApi(
    `/preReleaseVersions?filter[app]=${app.id}&sort=-version&fields[preReleaseVersions]=builds,version,platform&limit=5`,
    (response) => {
      return preReleaseVersionSchemas.safeParse(response.data).data ?? null;
    },
  );

  const [versions, setVersions] = useState<VersionWithPlatform[] | undefined>(undefined);

  const [preReleaseVersionDone, setPreReleaseVersionDone] = useState<boolean>(false);

  useEffect(() => {
    if (preReleaseVersions !== null && !preReleaseVersionDone) {
      setPreReleaseVersionDone(true);
      const versions = preReleaseVersions.map((appStoreVersion) => {
        return {
          id: appStoreVersion.id,
          platform: appStoreVersion.attributes.platform,
          version: appStoreVersion.attributes.version,
        } as VersionWithPlatform;
      });
      setVersions(versions);
    }
  }, [preReleaseVersions]);

  useEffect(() => {
    if (selectedVersion !== undefined) {
      setBuildsPath(
        `/builds?filter[preReleaseVersion.platform]=${selectedVersion.platform}&filter[preReleaseVersion.version]=${selectedVersion.version}&filter[app]=${app.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`,
      );
    }
  }, [selectedVersion]);

  useEffect(() => {
    if (pagination) {
      if (pagination.hasMore) {
        pagination.onLoadMore(-1);
      }
    }
  }, [pagination]);

  const platformWithVersion = (appStoreVersion: VersionWithPlatform | undefined) => {
    if (!appStoreVersion) {
      return "";
    }
    switch (appStoreVersion.platform) {
      case "IOS":
        return "iOS " + appStoreVersion.version;
      case "MAC_OS":
        return "macOS " + appStoreVersion.version;
      case "TV_OS":
        return "tvOS " + appStoreVersion.version;
      case "VISION_OS":
        return "visionOS " + appStoreVersion.version;
      default:
        return appStoreVersion.platform + " " + appStoreVersion.version;
    }
  };

  return (
    <List
      pagination={pagination}
      isLoading={isLoadingApp || isLoadingPreReleaseVersions}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select App Version"
          value={platformWithVersion(selectedVersion)}
          onChange={(newValue) => {
            if (versions === undefined) {
              return;
            }
            setBuildsPath("");
            const newVersion = versions.find((version) => version.id === newValue);
            setSelectedVersion(newVersion);
          }}
        >
          {(versions ?? [])?.map((version: VersionWithPlatform) => (
            <List.Dropdown.Item title={platformWithVersion(version)} value={version.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={app.attributes.name}>
        {builds?.map((item: BuildWithBetaDetailAndBetaGroups) => <BuildItem build={item} app={app} />)}
      </List.Section>
    </List>
  );
}
