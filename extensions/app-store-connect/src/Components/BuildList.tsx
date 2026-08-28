import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { platformWithVersion, VersionWithPlatform } from "../Utils/statusHelpers";
import { useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";
import {
  App,
  BuildWithBetaDetailAndBetaGroups,
  buildsWithBetaDetailSchema,
  preReleaseVersionSchemas,
} from "../Model/schemas";
import BuildItem from "./BuildItem";
import { testFlightUrl } from "../Utils/appStoreConnect";

interface BuildListProps {
  app: App;
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
            <List.Dropdown.Item key={version.id} title={platformWithVersion(version)} value={version.id} />
          ))}
        </List.Dropdown>
      }
    >
      {isLoadingApp || isLoadingPreReleaseVersions || (builds && builds.length > 0) ? (
        <List.Section title={app.attributes.name}>
          {builds?.map((item: BuildWithBetaDetailAndBetaGroups) => (
            <BuildItem key={item.build.id} build={item} app={app} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Hammer, tintColor: Color.SecondaryText }}
          title={versions && versions.length > 0 ? "No Builds for This Version" : "No Builds Yet"}
          description={
            versions && versions.length > 0
              ? `${app.attributes.name} has no builds for ${platformWithVersion(selectedVersion)}. Pick another version above, or upload a build from Xcode.`
              : `${app.attributes.name} has no builds yet. Upload one from Xcode or Transporter and it will appear here once it finishes processing.`
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in App Store Connect" icon={Icon.Globe} url={testFlightUrl(app.id)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
