import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useGetAllFeatures } from "../hooks/useGetAllFeatures";
import { generateErrorMessage, parseEnvironment } from "../helpers";
import { TError, TFeatureToggleParams } from "../types";
import { archiveFeature, disableFeature, enableFeature } from "../api";
import { useCachedState } from "@raycast/utils";
import CreateFeature from "./CreateFeature";
import dayjs from "../utils/dayjs";
import Error from "../components/Error";

export default function Features() {
  const [projectId] = useCachedState("project-id", "");
  const { isLoading, data, revalidate, error } = useGetAllFeatures(projectId);

  const { push } = useNavigation();

  const errResponse = error as TError;

  if (error) {
    return <Error errCode={errResponse.code} revalidate={revalidate} />;
  }

  const handleEnableFeature = async (params: TFeatureToggleParams) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Toggling feature ${params.featureName}...`,
    });

    try {
      await enableFeature(params);
      await revalidate();

      toast.style = Toast.Style.Success;
      toast.title = "Feature Enabled";
      toast.message = `Enabled ${params.featureName} in ${parseEnvironment(params.environment)}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;

      const errResponse = err as TError;

      toast.title = "Failed";
      toast.message = generateErrorMessage(errResponse.code);
    }
  };

  const handleDisableFeature = async (params: TFeatureToggleParams) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Toggling feature ${params.featureName}...`,
    });

    try {
      await disableFeature(params);
      await revalidate();

      toast.style = Toast.Style.Success;
      toast.title = "Feature Disabled";
      toast.message = `Disabled ${params.featureName} in ${parseEnvironment(params.environment)}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;

      const errResponse = err as TError;

      toast.title = "Failed";
      toast.message = generateErrorMessage(errResponse.code);
    }
  };

  const handleArchiveFeature = async (name: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Archiving...`,
    });
    try {
      await archiveFeature({
        featureName: name,
        projectId,
      });

      await revalidate();

      toast.style = Toast.Style.Success;
      toast.title = "Feature Archived";
    } catch (err) {
      toast.style = Toast.Style.Failure;

      const errResponse = err as TError;

      toast.title = "Failed";
      toast.message = generateErrorMessage(errResponse.code);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Features..." navigationTitle="Features">
      {data?.map((feature) => {
        const environments: List.Item.Props["accessories"] = feature.environments.map((env) => {
          return {
            icon: {
              source: env.enabled ? Icon.CheckCircle : Icon.XMarkCircle,
              tintColor: env.enabled ? "#22c55e" : "#f43f5e",
            },
            text: parseEnvironment(env.type),
          };
        });
        const url = new URL(getPreferenceValues<Preferences>().api);
        const detailUrl = `${url.origin}/projects/${projectId}/features/${feature.name}`;

        const createdAt = dayjs(feature.createdAt).format("DD MMM YYYY HH:mm").toString();
        const timeFromNow = dayjs(feature.createdAt).fromNow();

        return (
          <List.Item
            key={feature.name}
            title={feature.name}
            icon={Icon.Flag}
            subtitle={`#${feature.type}`}
            accessories={[
              ...environments,
              feature.createdAt
                ? {
                    text: timeFromNow,
                    tooltip: createdAt,
                    icon: Icon.Clock,
                  }
                : {},
            ]}
            actions={
              <ActionPanel title="Feature">
                <Action.OpenInBrowser title="Go to Dashboard" url={detailUrl} />
                <Action
                  title="Create New Feature"
                  icon={Icon.PlusCircle}
                  onAction={() => push(<CreateFeature revalidate={revalidate} />)}
                />
                <ActionPanel.Submenu title="Toggle Feature" icon={Icon.Eye}>
                  {feature.environments.map((env) => {
                    const title = `${env.enabled ? "Disable" : "Enable"} in ${parseEnvironment(env.type)}`;
                    const icon = env.enabled ? Icon.XMarkCircle : Icon.CheckCircle;

                    const handleToggle = () => {
                      if (env.enabled) {
                        handleDisableFeature({
                          environment: env.type,
                          featureName: feature.name,
                          projectId,
                        });
                        return;
                      }

                      handleEnableFeature({
                        environment: env.type,
                        featureName: feature.name,
                        projectId,
                      });
                    };

                    return <Action title={title} icon={icon} key={env.type} onAction={() => handleToggle()} />;
                  })}
                </ActionPanel.Submenu>
                <Action.CopyToClipboard title="Copy Feature Name" content={feature.name} />

                <Action
                  title="Archive Feature"
                  icon={Icon.Bookmark}
                  onAction={async () => {
                    await confirmAlert({
                      title: "Are you sure you want to archive this feature toggle?",
                      primaryAction: {
                        title: "Archive togggle",
                        onAction: () => handleArchiveFeature(feature.name),
                      },
                      dismissAction: {
                        title: "Cancel",
                      },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
