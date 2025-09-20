import { Icon, ActionPanel, Action, Color, List, confirmAlert, Alert } from "@raycast/api";
import {
  BetaGroup,
  App,
  BuildWithBetaDetailAndBetaGroups,
  buildsWithBetaDetailSchema,
  preReleaseVersionSchemas,
} from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { useEffect, useState } from "react";
import BuildDetail from "./BuildDetail";
import IndividualTestersList from "./IndividualTestersList";
import ManageInternalBuilds from "./ManageInternalBuilds";
interface Props {
  group: BetaGroup;
  app: App;
}

interface VersionWithPlatform {
  id: string;
  platform: string;
  version: string;
}

export default function ExternalBetaGroupBuilds({ group, app }: Props) {
  const [selectedVersion, setSelectedVersion] = useState<VersionWithPlatform | undefined>(undefined);

  const [buildsPath, setBuildsPath] = useState<string | undefined>(undefined);

  const { data: builds, isLoading: isLoadingApp } = useAppStoreConnectApi(buildsPath, (response) => {
    return buildsWithBetaDetailSchema.parse(response);
  });

  const { data: preReleaseVersions, isLoading: isLoadingPreReleaseVersions } = useAppStoreConnectApi(
    `/preReleaseVersions?filter[app]=${app.id}&sort=-version&fields[preReleaseVersions]=builds,version,platform&limit=5`,
    (response) => {
      return preReleaseVersionSchemas.safeParse(response.data).data ?? null;
    },
  );

  const [versions, setVersions] = useState<VersionWithPlatform[] | undefined>(undefined);

  const [currentBuilds, setCurrentBuilds] = useState<BuildWithBetaDetailAndBetaGroups[]>([]);

  useEffect(() => {
    if (builds !== null) {
      setCurrentBuilds(builds);
    }
  }, [builds]);

  useEffect(() => {
    if (preReleaseVersions !== null) {
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
        `/builds?filter[preReleaseVersion.platform]=${selectedVersion.platform}&filter[preReleaseVersion.version]=${selectedVersion.version}&filter[app]=${app.id}&filter[betaGroups]=${group.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`,
      );
    }
  }, [selectedVersion]);

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

  const getProcessingStatus = (item: BuildWithBetaDetailAndBetaGroups) => {
    const betaDetails = item.buildBetaDetails;
    if (!betaDetails) {
      return "Unknown";
    }
    if (betaDetails.attributes.internalBuildState === "PROCESSING") {
      return "Processing";
    } else if (betaDetails.attributes.internalBuildState === "PROCESSING_EXCEPTION") {
      return "Processing Exception";
    } else if (betaDetails.attributes.internalBuildState === "MISSING_EXPORT_COMPLIANCE") {
      return "Missing Export Compliance";
    } else if (betaDetails.attributes.internalBuildState === "READY_FOR_BETA_TESTING") {
      return "Ready for Beta Testing";
    } else if (betaDetails.attributes.internalBuildState === "IN_BETA_TESTING") {
      return "Testing";
    } else if (betaDetails.attributes.internalBuildState === "EXPIRED") {
      return "Expired";
    } else if (betaDetails.attributes.internalBuildState === "IN_EXPORT_COMPLIANCE_REVIEW") {
      return "In Export Compliance Review";
    } else if (betaDetails.attributes.internalBuildState === "WAITING_FOR_BETA_REVIEW") {
      return "Waiting for Beta Review";
    } else if (betaDetails.attributes.internalBuildState === "IN_BETA_REVIEW") {
      return "In Beta Review";
    } else if (betaDetails.attributes.internalBuildState === "BETA_REJECTED") {
      return "Beta Rejected";
    } else if (betaDetails.attributes.internalBuildState === "BETA_APPROVED") {
      return "Approved";
    } else {
      return "Unknown";
    }
  };

  const getProccessingStatusIcon = (item: BuildWithBetaDetailAndBetaGroups) => {
    const betaDetails = item.buildBetaDetails;
    if (!betaDetails) {
      return Icon.Dot;
    }
    if (betaDetails.attributes.internalBuildState === "PROCESSING") {
      return Icon.Dot;
    } else if (betaDetails.attributes.internalBuildState === "PROCESSING_EXCEPTION") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (betaDetails.attributes.internalBuildState === "MISSING_EXPORT_COMPLIANCE") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (betaDetails.attributes.internalBuildState === "READY_FOR_BETA_TESTING") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (betaDetails.attributes.internalBuildState === "IN_BETA_TESTING") {
      return { source: Icon.Dot, tintColor: Color.Green };
    } else if (betaDetails.attributes.internalBuildState === "EXPIRED") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (betaDetails.attributes.internalBuildState === "IN_EXPORT_COMPLIANCE_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (betaDetails.attributes.internalBuildState === "WAITING_FOR_BETA_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (betaDetails.attributes.internalBuildState === "IN_BETA_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (betaDetails.attributes.internalBuildState === "BETA_REJECTED") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (betaDetails.attributes.internalBuildState === "BETA_APPROVED") {
      return { source: Icon.Dot, tintColor: Color.Green };
    } else {
      return Icon.Dot;
    }
  };

  const convertExpirationDateToDays = (build: BuildWithBetaDetailAndBetaGroups) => {
    const b = build.build;
    const expirationDate = new Date(b.attributes.expirationDate);
    const currentDate = new Date();
    const days = Math.round(Math.abs((expirationDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)));
    if (b.attributes.expired) {
      return undefined;
    } else if (days === 0) {
      return "Expires Today";
    } else if (days === 1) {
      return "Expires in 1 day";
    } else {
      return "Expires in " + days.toString() + " days";
    }
  };

  return (
    <List
      isLoading={isLoadingApp || isLoadingPreReleaseVersions}
      actions={
        <ActionPanel>
          {!group.attributes.hasAccessToAllBuilds && (
            <Action.Push
              title="Manage Builds"
              target={
                <ManageInternalBuilds
                  app={app}
                  group={group}
                  didAddBuilds={(builds) => {
                    // Make sure we don't add the same build twice
                    setCurrentBuilds(
                      currentBuilds.filter((b) => !builds.find((build) => build.build.id === b.build.id)),
                    );
                  }}
                  didRemoveBuilds={(builds) => {
                    setCurrentBuilds(
                      currentBuilds.filter((b) => !builds.find((build) => build.build.id === b.build.id)),
                    );
                  }}
                />
              }
            />
          )}
        </ActionPanel>
      }
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
      {currentBuilds?.map((bg) => (
        <List.Item
          title={"Build " + bg.build.attributes.version}
          subtitle={convertExpirationDateToDays(bg)}
          key={bg.build.id}
          accessories={[{ text: getProcessingStatus(bg), icon: getProccessingStatusIcon(bg) }]}
          actions={
            <ActionPanel>
              {!group.attributes.hasAccessToAllBuilds && (
                <>
                  <Action
                    title="Remove Build From Group"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={async () => {
                      setCurrentBuilds(currentBuilds.filter((b) => b.build.id !== bg.build.id));
                      (async () => {
                        if (
                          await confirmAlert({
                            title: "Are you sure?",
                            primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                          })
                        ) {
                          setCurrentBuilds(currentBuilds.filter((b) => b.build.id !== bg.build.id));
                          await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds `, "DELETE", {
                            data: [
                              {
                                type: "builds",
                                id: bg.build.id,
                              },
                            ],
                          });
                        }
                      })();
                    }}
                  />
                  <Action.Push
                    title="Manage Builds"
                    target={
                      <ManageInternalBuilds
                        app={app}
                        group={group}
                        didAddBuilds={(builds) => {
                          setCurrentBuilds(currentBuilds.concat(builds));
                        }}
                        didRemoveBuilds={(builds) => {
                          setCurrentBuilds(
                            currentBuilds.filter((b) => !builds.find((build) => build.build.id === b.build.id)),
                          );
                        }}
                      />
                    }
                  />
                </>
              )}
              <Action.Push
                title="Manage Beta Groups"
                target={<BuildDetail app={app} build={bg} groupsDidChange={() => {}} betaStateDidChange={() => {}} />}
              />
              <Action.Push title="Update Individual Testers" target={<IndividualTestersList app={app} build={bg} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
