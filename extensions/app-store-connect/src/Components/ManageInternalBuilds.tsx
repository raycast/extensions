import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useForm } from "@raycast/utils";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import {
  App,
  BuildWithBetaDetailAndBetaGroups,
  buildsWithBetaDetailSchema,
  preReleaseVersionSchemas,
  BetaGroup,
} from "../Model/schemas";
import { presentError } from "../Utils/utils";

interface VersionWithPlatform {
  id: string;
  platform: string;
  version: string;
}

interface Props {
  app: App;
  group: BetaGroup;
  didAddBuilds: (builds: BuildWithBetaDetailAndBetaGroups[]) => void;
  didRemoveBuilds: (builds: BuildWithBetaDetailAndBetaGroups[]) => void;
}

export default function ManageInternalBuilds({ app, group, didAddBuilds, didRemoveBuilds }: Props) {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(undefined);

  const [buildsPath, setBuildsPath] = useState<string | undefined>(undefined);
  const [currentBuildsPath, setCurrentBuildsPath] = useState<string | undefined>(undefined);

  const { data: builds, isLoading: isLoadingApp } = useAppStoreConnectApi(buildsPath, (response) => {
    return buildsWithBetaDetailSchema.parse(response);
  });
  const { data: currentBuilds, isLoading: isLoadingCurrentBuilds } = useAppStoreConnectApi(
    currentBuildsPath,
    (response) => {
      return buildsWithBetaDetailSchema.parse(response);
    },
  );

  const { data: preReleaseVersions, isLoading: isLoadingPreReleaseVersions } = useAppStoreConnectApi(
    `/preReleaseVersions?filter[app]=${app.id}&sort=-version&fields[preReleaseVersions]=builds,version,platform&limit=5`,
    (response) => {
      return preReleaseVersionSchemas.safeParse(response.data).data ?? null;
    },
  );

  const [versions, setVersions] = useState<VersionWithPlatform[] | undefined>(undefined);

  const [buildIDs, setBuildIDs] = useState<string[] | undefined>(undefined);

  const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);

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
      const selected = versions?.find((version) => version.id === selectedVersion);
      if (!selected) {
        return;
      }
      setBuildsPath(
        `/builds?filter[preReleaseVersion.platform]=${selected.platform}&filter[preReleaseVersion.version]=${selected.version}&filter[app]=${app.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`,
      );
      setCurrentBuildsPath(
        `/builds?filter[preReleaseVersion.platform]=${selected.platform}&filter[preReleaseVersion.version]=${selected.version}&filter[app]=${app.id}&filter[betaGroups]=${group.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`,
      );
    }
  }, [selectedVersion]);

  useEffect(() => {
    if (currentBuilds) {
      setBuildIDs(currentBuilds.map((build) => build.build.id));
    }
  }, [currentBuilds]);

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

  const submitForBetaReview = async () => {
    const builds = currentBuilds?.filter((build) => buildIDs?.includes(build.build.id));
    if (builds === undefined || builds.length === 0) {
      return;
    }
    for (const build of builds) {
      await fetchAppStoreConnect(`/betaAppReviewSubmissions`, "POST", {
        data: {
          type: "betaAppReviewSubmissions",
          relationships: {
            build: {
              data: {
                type: "builds",
                id: build.build.id,
              },
            },
          },
        },
      });
    }
  };

  const submitTitle = () => {
    const builds = currentBuilds?.filter((build) => buildIDs?.includes(build.build.id));
    for (const build of builds ?? []) {
      const needsApproval = build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION";
      if (needsApproval && !group.attributes.isInternalGroup) {
        return "Submit for beta review";
      }
    }
    return "Update";
  };

  const { handleSubmit, itemProps } = useForm<{ builds: string[] }>({
    onSubmit: async (values) => {
      setSubmitIsLoading(true);
      try {
        const removed = currentBuilds?.filter((build) => !values.builds.includes(build.build.id));
        const added = values.builds.filter(
          (build) => !currentBuilds?.find((currentBuild) => currentBuild.build.id === build),
        );
        if (removed && removed.length > 0) {
          for (const build of removed) {
            await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds `, "DELETE", {
              data: [
                {
                  type: "builds",
                  id: build.build.id,
                },
              ],
            });
          }
        }
        if (added && added.length > 0) {
          for (const build of added) {
            const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds `, "POST", {
              data: [
                {
                  type: "builds",
                  id: build,
                },
              ],
            });
            if (response && response.ok) {
              try {
                const json = await response.json();
                const added = buildsWithBetaDetailSchema.parse(json.data);
                didAddBuilds(added);
              } catch (error) {
                console.log(error);
              }
            }
          }
        }
        await submitForBetaReview();
        setSubmitIsLoading(false);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Updated",
        });
        if (removed && removed.length > 0) {
          didRemoveBuilds(removed);
        }
      } catch (error) {
        setSubmitIsLoading(false);
        presentError(error);
      }
    },
  });

  return (
    <Form
      isLoading={isLoadingApp || isLoadingPreReleaseVersions || isLoadingCurrentBuilds || submitIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle()} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="version"
        title="Select a version"
        value={selectedVersion}
        onChange={(version) => {
          setSelectedVersion(version);
        }}
      >
        {versions?.map((version) => (
          <Form.Dropdown.Item key={version.id} title={platformWithVersion(version)} value={version.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker {...itemProps.builds} title="Select a build">
        {builds?.map((build) => (
          <Form.TagPicker.Item
            key={build.build.id}
            title={"Build " + build.build.attributes.version}
            value={build.build.id}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
