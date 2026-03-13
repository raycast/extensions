import { List, ActionPanel, Action, Icon, Color, Keyboard } from "@raycast/api";
import {
  App,
  BuildWithBetaDetailAndBetaGroups,
  BetaGroup,
  betaBuildUsagesSchema,
  ExternalBuildState,
} from "../Model/schemas";
import BuildDetail from "./BuildDetail";
import { useEffect } from "react";
import { useState } from "react";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import IndividualTestersList from "./IndividualTestersList";
import { presentError } from "../Utils/utils";

interface BuildItemProps {
  app: App;
  build: BuildWithBetaDetailAndBetaGroups;
}
export default function BuildItem({ build, app }: BuildItemProps) {
  const [betaGroups, setBetaGroups] = useState<BetaGroup[]>([]);
  const [externalBuildState, setExternalBuildState] = useState<ExternalBuildState | undefined>();

  const { data: betaBuildUsages } = useAppStoreConnectApi(
    `/builds/${build.build.id}/metrics/betaBuildUsages`,
    (response) => {
      return betaBuildUsagesSchema.safeParse(response.data).data ?? null;
    },
  );

  useEffect(() => {
    setBetaGroups(build.betaGroups);
    setExternalBuildState(build.buildBetaDetails.attributes.externalBuildState);
  }, [build]);

  const firstBetaBuildUsage = betaBuildUsages?.[0];

  const getProcessingStatus = (status: string | undefined) => {
    if (!status) {
      return "Unknown";
    }
    if (status === "PROCESSING") {
      return "Processing";
    } else if (status === "PROCESSING_EXCEPTION") {
      return "Processing Exception";
    } else if (status === "MISSING_EXPORT_COMPLIANCE") {
      return "Missing Export Compliance";
    } else if (status === "READY_FOR_BETA_TESTING") {
      return "Ready for Beta Testing";
    } else if (status === "IN_BETA_TESTING") {
      return "Testing";
    } else if (status === "EXPIRED") {
      return "Expired";
    } else if (status === "READY_FOR_BETA_SUBMISSION") {
      return "Ready to Submit";
    } else if (status === "IN_EXPORT_COMPLIANCE_REVIEW") {
      return "In Export Compliance Review";
    } else if (status === "WAITING_FOR_BETA_REVIEW") {
      return "Waiting for Beta Review";
    } else if (status === "IN_BETA_REVIEW") {
      return "In Beta Review";
    } else if (status === "BETA_REJECTED") {
      return "Beta Rejected";
    } else if (status === "BETA_APPROVED") {
      return "Approved";
    } else {
      return "Unknown";
    }
  };

  const getProccessingStatusIcon = (item: string | undefined) => {
    if (!item) {
      return Icon.Dot;
    }
    if (item === "PROCESSING") {
      return Icon.Dot;
    } else if (item === "PROCESSING_EXCEPTION") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (item === "MISSING_EXPORT_COMPLIANCE") {
      return { source: Icon.Warning, tintColor: Color.Yellow };
    } else if (item === "READY_FOR_BETA_TESTING") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "IN_BETA_TESTING") {
      return { source: Icon.Dot, tintColor: Color.Green };
    } else if (item === "EXPIRED") {
      return { source: Icon.Dot, tintColor: Color.Red };
    } else if (item === "READY_FOR_BETA_SUBMISSION") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "IN_EXPORT_COMPLIANCE_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "WAITING_FOR_BETA_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "IN_BETA_REVIEW") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "BETA_REJECTED") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else if (item === "BETA_APPROVED") {
      return { source: Icon.Dot, tintColor: Color.Yellow };
    } else {
      return Icon.Dot;
    }
  };

  const accessoriesForBuild = (): React.ComponentProps<typeof List.Item>["accessories"] => {
    const item = build;
    const getProcessingStatusArray = [
      {
        tooltip: "Beta status: " + getProcessingStatus(externalBuildState),
        icon: getProccessingStatusIcon(externalBuildState),
      },
    ];
    let betaGroupsAccessory: React.ComponentProps<typeof List.Item>["accessories"];
    if (betaGroups && betaGroups.length > 0) {
      const betaGroupsCommaSeparated = betaGroups.map((bg) => {
        return bg.attributes?.name ?? "";
      });
      const betaGroupsShortCommaSeparated = betaGroupsCommaSeparated.map((bg) => {
        const name = bg.substring(0, 2).toUpperCase();
        return name;
      });
      const betaGroupsCommaSeparatedString = betaGroupsShortCommaSeparated.join(", ");
      betaGroupsAccessory = [
        {
          text: betaGroupsCommaSeparatedString,
          icon: { source: Icon.TwoPeople, tintColor: Color.Blue },
          tooltip: "Beta Groups: " + betaGroupsCommaSeparated.join(", "),
        },
      ] as React.ComponentProps<typeof List.Item>["accessories"];
    }

    let usage: React.ComponentProps<typeof List.Item>["accessories"] = [];
    if (firstBetaBuildUsage !== undefined) {
      const dataPoints = firstBetaBuildUsage.dataPoints;
      if (dataPoints.length > 0) {
        const dataPoint = dataPoints[0];
        const hyphenIfZero = (value: number) => {
          if (value === 0) {
            return "-";
          } else {
            return value.toString();
          }
        };
        usage = [
          {
            text: hyphenIfZero(dataPoint.values.inviteCount),
            tooltip: "Invites: " + dataPoint.values.inviteCount.toString(),
            icon: { source: Icon.Envelope, tintColor: Color.Yellow },
          },
          {
            text: hyphenIfZero(dataPoint.values.installCount),
            tooltip: "Installs: " + dataPoint.values.installCount.toString(),
            icon: { source: Icon.ArrowDown, tintColor: Color.Green },
          },
          {
            text: hyphenIfZero(dataPoint.values.sessionCount),
            tooltip: "Sessions: " + dataPoint.values.sessionCount.toString(),
            icon: { source: Icon.Mobile, tintColor: Color.Green },
          },
          {
            text: hyphenIfZero(dataPoint.values.crashCount),
            tooltip: "Crashes: " + dataPoint.values.crashCount.toString(),
            icon: { source: Icon.Exclamationmark, tintColor: Color.Red },
          },
        ] as React.ComponentProps<typeof List.Item>["accessories"];
      }
    } else {
      usage = [
        { text: "-", tooltip: "Invites", icon: { source: Icon.Envelope, tintColor: Color.Yellow } },
        { text: "-", tooltip: "Installs", icon: { source: Icon.ArrowDown, tintColor: Color.Green } },
        { text: "-", tooltip: "Sessions", icon: { source: Icon.Mobile, tintColor: Color.Green } },
        { text: "-", tooltip: "Crashes", icon: { source: Icon.Exclamationmark, tintColor: Color.Red } },
      ] as React.ComponentProps<typeof List.Item>["accessories"];
    }

    if (item.betaGroups.length === 0) {
      return usage?.concat(getProcessingStatusArray);
    } else {
      if (usage) {
        return (betaGroupsAccessory ?? []).concat(usage).concat(getProcessingStatusArray);
      }
      return (betaGroupsAccessory ?? []).concat(getProcessingStatusArray);
    }
  };

  const expirationIcon = () => {
    const b = build.build;
    const expirationDate = new Date(b.attributes.expirationDate);
    const currentDate = new Date();
    const days = Math.round(Math.abs((expirationDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)));
    const daysString = days.toString();

    if (b.attributes.expired) {
      return { tooltip: "Expired", value: Icon.Clock };
    } else if (days === 0) {
      return { tooltip: "Expires Today", value: { source: Icon.Clock, tintColor: Color.Yellow } };
    } else if (days === 1) {
      return { tooltip: "Expires in " + daysString + " day", value: Icon.Clock };
    } else {
      return { tooltip: "Expires in " + daysString + " days", value: Icon.Clock };
    }
  };

  const canInviteTesters = () => {
    const betaDetails = build.buildBetaDetails;
    if (!betaDetails) {
      return false;
    }
    if (betaDetails.attributes.externalBuildState === "EXPIRED") {
      return false;
    } else if (betaDetails.attributes.externalBuildState === "PROCESSING_EXCEPTION") {
      return false;
    } else if (isMissingExportCompliance()) {
      return false;
    } else if (build.build.attributes.processingState === "PROCESSING") {
      return false;
    }
    return true;
  };

  const isMissingExportCompliance = () => {
    return build.buildBetaDetails.attributes.externalBuildState === "MISSING_EXPORT_COMPLIANCE";
  };

  const setExportCompliance = async (encryption: boolean) => {
    await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
      data: {
        type: "builds",
        id: build.build.id,
        attributes: {
          usesNonExemptEncryption: encryption,
        },
      },
    });
  };
  const isExpired = () => {
    return (
      build.buildBetaDetails.attributes.externalBuildState === "EXPIRED" ||
      build.buildBetaDetails.attributes.internalBuildState === "EXPIRED"
    );
  };

  const expireBuild = async () => {
    await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
      data: {
        type: "builds",
        id: build.build.id,
        attributes: {
          expired: true,
        },
      },
    });
  };

  const manageBetaGroupsAction = () => {
    return (
      <Action.Push
        title="Manage Beta Groups"
        target={
          <BuildDetail
            app={app}
            build={build}
            groupsDidChange={(groups: BetaGroup[]) => {
              build.betaGroups = groups;
              setBetaGroups(groups);
            }}
            betaStateDidChange={(betaState) => {
              build.buildBetaDetails.attributes.externalBuildState = betaState;
              setExternalBuildState(betaState);
            }}
          />
        }
      />
    );
  };

  const manageIndividualTestersAction = () => {
    return <Action.Push title="Manage Individual Testers" target={<IndividualTestersList app={app} build={build} />} />;
  };

  const expireBuildAction = () => {
    return (
      <Action
        title="Expire"
        shortcut={Keyboard.Shortcut.Common.Remove}
        style={Action.Style.Destructive}
        onAction={async () => {
          const oldState = build.buildBetaDetails.attributes.externalBuildState;
          (async () => {
            try {
              build.buildBetaDetails.attributes.externalBuildState = "EXPIRED";
              setExternalBuildState("EXPIRED");
              await expireBuild();
            } catch (error) {
              presentError(error);
              build.buildBetaDetails.attributes.externalBuildState = oldState;
              setExternalBuildState(oldState);
            }
          })();
        }}
      />
    );
  };

  return (
    <List.Item
      id={build.build.id}
      icon={expirationIcon()}
      title={
        "Build " +
        build.build.attributes.version +
        (build.build.attributes.processingState === "PROCESSING" ? " (Processing)" : "")
      }
      accessories={accessoriesForBuild()}
      actions={
        <ActionPanel>
          {canInviteTesters() && (
            <>
              {manageBetaGroupsAction()}
              {manageIndividualTestersAction()}
            </>
          )}
          {isMissingExportCompliance() && (
            <Action
              title="Set Is Not Using Non-Exempt Encryption"
              onAction={async () => {
                const oldState = build.buildBetaDetails.attributes.externalBuildState;
                (async () => {
                  try {
                    build.buildBetaDetails.attributes.externalBuildState = "READY_FOR_BETA_SUBMISSION";
                    setExternalBuildState("READY_FOR_BETA_SUBMISSION");
                    await setExportCompliance(false);
                  } catch (error) {
                    presentError(error);
                    build.buildBetaDetails.attributes.externalBuildState = oldState;
                    setExternalBuildState(oldState);
                  }
                })();
              }}
            />
          )}
          {isMissingExportCompliance() && (
            <Action
              title="Set Is Using Non-Exempt Encryption"
              onAction={async () => {
                const oldState = build.buildBetaDetails.attributes.externalBuildState;
                (async () => {
                  try {
                    build.buildBetaDetails.attributes.externalBuildState = "READY_FOR_BETA_SUBMISSION";
                    setExternalBuildState("READY_FOR_BETA_SUBMISSION");
                    await setExportCompliance(true);
                  } catch (error) {
                    presentError(error);
                    build.buildBetaDetails.attributes.externalBuildState = oldState;
                    setExternalBuildState(oldState);
                  }
                })();
              }}
            />
          )}
          {!isExpired() && expireBuildAction()}
        </ActionPanel>
      }
    />
  );
}
