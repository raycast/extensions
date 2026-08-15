import { ActionPanel, Action, Form, showToast, Toast, Icon, Color } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  App,
  betaGroupsSchema,
  BetaGroup,
  betaBuildLocalizationsSchema,
  BuildWithBetaDetailAndBetaGroups,
  ExternalBuildState,
} from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface BuildDetailProps {
  build: BuildWithBetaDetailAndBetaGroups;
  app: App;
  groupsDidChange: (groups: BetaGroup[]) => void;
  betaStateDidChange: (betaState: ExternalBuildState) => void;
}

interface FormValues {
  betaGroups: string[];
  whatToTest: string;
}

export default function BuildDetail({ build, app, groupsDidChange, betaStateDidChange }: BuildDetailProps) {
  const { data: betaGroups, isLoading: isLoadingBetaGroups } = useAppStoreConnectApi(
    `/betaGroups?filter[app]=${app.id}`,
    (response) => {
      return betaGroupsSchema.safeParse(response.data).data ?? null;
    },
  );
  const usedGroups = build.betaGroups;

  const { data: betaBuildLocalizations, isLoading: isLoadingBetaBuildLocalizations } = useAppStoreConnectApi(
    `/builds/${build.build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`,
    (response) => {
      return betaBuildLocalizationsSchema.safeParse(response.data).data ?? null;
    },
  );
  const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);

  const getSubmitTitle = (usedGroupsIDs: string[]) => {
    const hasExternalGroups = usedGroupsIDs.find((bg) => {
      return !betaGroups?.find((bg2) => bg2.id === bg)?.attributes.isInternalGroup;
    });
    const needsApproval =
      build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" && hasExternalGroups;
    if (needsApproval) {
      return "Submit for beta review";
    } else {
      return "Update";
    }
  };

  const updateWhatToTest = async (whatToTest: string) => {
    if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0) {
      return false;
    }
    if (whatToTest === betaBuildLocalizations[0].attributes.whatsNew) {
      return false;
    }
    const response = await fetchAppStoreConnect(`/betaBuildLocalizations/${betaBuildLocalizations[0].id}`, "PATCH", {
      data: {
        type: "betaBuildLocalizations",
        id: betaBuildLocalizations[0].id,
        attributes: {
          whatsNew: whatToTest,
        },
      },
    });
    if (response && !response.ok) {
      const error = constructError(response, "Could not update what to test");
      throw error;
    }
    return true;
  };

  const constructError = async (response: { text: () => Promise<string> }, fallbackMessage: string) => {
    const json = JSON.parse(await response.text());
    if ("errors" in json) {
      const errors = json.errors;
      if (errors.length > 0) {
        return new ATCError(errors[0].title, errors[0].detail);
      }
    } else {
      return new ATCError("Oh no!", fallbackMessage);
    }
  };

  const submitForBetaReview = async (usedGroupsIDs: string[]) => {
    const containsExternalGroups = usedGroupsIDs.find((bg) => {
      const betaGroup = betaGroups?.find((bg2) => {
        return bg2.id === bg;
      });
      return !betaGroup?.attributes.isInternalGroup;
    });
    if (
      build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" &&
      containsExternalGroups
    ) {
      const response = await fetchAppStoreConnect("/betaAppReviewSubmissions", "POST", {
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
      if (response && !response.ok) {
        const error = await constructError(response, "Could not submit for beta review");
        throw error;
      }
      return true;
    } else {
      return false;
    }
  };

  const addGroupsToBuild = async (usedGroupsIDs: string[], betaGroups: BetaGroup[]) => {
    const newGroupIDs = usedGroupsIDs.filter((bg) => !usedGroups?.find((bg2) => bg2.id === bg));
    const newGroups = betaGroups?.filter((bg) => newGroupIDs.find((bg2) => bg2 === bg.id));
    if (newGroups) {
      for (const group of newGroups) {
        const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds`, "POST", {
          data: [
            {
              type: "builds",
              id: build.build.id,
            },
          ],
        });
        if (response && !response.ok) {
          const error = constructError(response, "Could not add group to build");
          throw error;
        }
      }
      return true;
    }
    return false;
  };

  const removeGroupsFromBuild = async (usedGroupsIDs: string[], usedGroups: BetaGroup[]) => {
    const removedGroups = usedGroups.filter((bg) => !usedGroupsIDs.find((bg2) => bg2 === bg.id));
    if (removedGroups) {
      for (const group of removedGroups) {
        const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds`, "DELETE", {
          data: [
            {
              type: "builds",
              id: build.build.id,
            },
          ],
        });
        if (response && !response.ok) {
          const error = constructError(response, "Could not remove group from build");
          throw error;
        }
      }
      return true;
    }
    return false;
  };

  const isExpired = () => {
    return (
      build.buildBetaDetails.attributes.externalBuildState === "EXPIRED" ||
      build.buildBetaDetails.attributes.internalBuildState === "EXPIRED"
    );
  };

  const expireBuild = async () => {
    const response = await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
      data: {
        type: "builds",
        id: build.build.id,
        attributes: {
          expired: true,
        },
      },
    });
    if (response && !response.ok) {
      const error = constructError(response, "Could not expire build");
      throw error;
    }
  };

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      whatToTest: "",
    },
    onSubmit: async (values) => {
      try {
        if (betaGroups === null) {
          return;
        }
        setSubmitIsLoading(true);
        await updateWhatToTest(values.whatToTest);
        const submitted = await submitForBetaReview(values.betaGroups);
        const added = await addGroupsToBuild(values.betaGroups, betaGroups);
        if (added) {
          groupsDidChange(usedGroups ?? []);
        }

        const removed = await removeGroupsFromBuild(values.betaGroups, usedGroups);
        if (removed) {
          groupsDidChange(usedGroups ?? []);
        }
        if (submitted) {
          betaStateDidChange("WAITING_FOR_BETA_REVIEW");
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Submitted for beta review",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Build updated",
          });
        }
      } catch (error) {
        presentError(error);
      } finally {
        setSubmitIsLoading(false);
      }
    },
    validation: {
      whatToTest: FormValidation.Required,
    },
  });

  useEffect(() => {
    // TODO: Handle localizations
    if (betaBuildLocalizations !== null && betaBuildLocalizations.length > 0) {
      setValue("whatToTest", betaBuildLocalizations[0].attributes.whatsNew ?? "");
    }
  }, [betaBuildLocalizations]);

  useEffect(() => {
    if (usedGroups && betaGroups) {
      setValue(
        "betaGroups",
        usedGroups.map((bg) => bg.id),
      );
    }
  }, [usedGroups, betaGroups]);

  useEffect(() => {
    if (betaBuildLocalizations && betaBuildLocalizations.length > 0) {
      setValue("whatToTest", betaBuildLocalizations[0].attributes.whatsNew ?? "");
    }
  }, [betaBuildLocalizations]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={getSubmitTitle(itemProps.betaGroups.value ?? [])} onSubmit={handleSubmit} />
          {!isExpired() && (
            <Action
              title="Expire"
              onAction={async () => {
                (async () => {
                  try {
                    setSubmitIsLoading(true);
                    await expireBuild();
                    betaStateDidChange("EXPIRED");
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success!",
                      message: "Expired",
                    });
                    setSubmitIsLoading(false);
                  } catch (error) {
                    presentError(error);
                    setSubmitIsLoading(false);
                  }
                })();
              }}
            />
          )}
        </ActionPanel>
      }
      isLoading={isLoadingBetaGroups || isLoadingBetaBuildLocalizations || submitIsLoading}
    >
      <Form.TagPicker {...itemProps.betaGroups} id="betaGroups" title="Beta Groups">
        {betaGroups?.map((bg) => (
          <Form.TagPicker.Item
            value={bg.id}
            title={bg.attributes.name}
            key={bg.id}
            icon={{ source: Icon.Dot, tintColor: bg.attributes.isInternalGroup ? Color.Green : Color.Yellow }}
          />
        ))}
      </Form.TagPicker>
      <Form.TextArea {...itemProps.whatToTest} title="What To Test" />
    </Form>
  );
}

class ATCError extends Error {
  constructor(
    public title: string,
    public detail: string,
  ) {
    super(title);
    this.name = this.constructor.name;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ATCError);
    }
  }
}
