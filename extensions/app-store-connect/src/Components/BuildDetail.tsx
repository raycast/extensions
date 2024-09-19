import { ActionPanel, Form, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import React, { useEffect, useRef, useState } from "react";
import { Build, App, betaGroupsSchema, buildSchemasWithBetaGroups, BetaGroup, betaBuildLocalizationsSchema, BuildWithBetaDetailAndBetaGroups, buildsWithBetaDetailSchema, AppStoreVersion } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface BuildDetailProps {
    build: BuildWithBetaDetailAndBetaGroups;
    app: App;
    groupsDidChange: (groups: BetaGroup[]) => void;
    betaStateDidChange: (betaState: string) => void;
}

type SubmitType = "UPDATE_WHAT_TO_TEST" | "SUBMIT_FOR_BETA_REVIEW" | "ADD_GROUPS_TO_BUILD" | "REMOVE_GROUPS_FROM_BUILD";

export default function BuildDetail({ build, app, groupsDidChange, betaStateDidChange }: BuildDetailProps) {
    const { data: betaGroups, isLoading: isLoadingBetaGroups } = useAppStoreConnectApi(`/betaGroups?filter[app]=${app.id}`, (response) => {
        return betaGroupsSchema.safeParse(response.data).data ?? null;
    });
    const usedGroups = build.betaGroups;

    const { data: betaBuildLocalizations, isLoading: isLoadingBetaBuildLocalizations } = useAppStoreConnectApi(`/builds/${build.build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`, (response) => {
        return betaBuildLocalizationsSchema.safeParse(response.data).data ?? null;
    });

    const [usedGroupsIDs, setUsedGroupIDs] = useState<string[]>([]);
    const [currentWhatToTest, setCurrentWhatToTest] = useState<string>("");
    const [whatToTestError, setWhatToTestError] = useState<string | undefined>();
    const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);
    const previousUsedGroups = useRef<BetaGroup[] | undefined>(undefined);

    function dropWhatToTestErrorIfNeeded() {
        if (whatToTestError !== undefined) {
            setWhatToTestError(undefined);
        }
    }

    useEffect(() => {
        if (usedGroups && betaGroups) {
            setUsedGroupIDs(usedGroups.map(bg => bg.id));
        }
    }, [usedGroups, betaGroups]);


    useEffect(() => {
        // TODO: Handle localizations
        if (betaBuildLocalizations !== null && betaBuildLocalizations.length > 0) {
            setCurrentWhatToTest(betaBuildLocalizations[0].attributes.whatsNew ?? "");
        }

    }, [betaBuildLocalizations]);

    useEffect(() => {
        dropWhatToTestErrorIfNeeded();
    }, [currentWhatToTest]);


    const getSubmitTitle = () => {
        const hasExternalGroups = usedGroupsIDs.find(bg => {
            return !betaGroups?.find(bg2 => bg2.id === bg)?.attributes.isInternalGroup;
        });
        const needsApproval = build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" && hasExternalGroups;
        if (needsApproval) {
            return "Submit for beta review";
        } else {
            return "Update"
        }
    };

    const updateWhatToTest = async () => {
        if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0) {
            return false;
        }
        if (currentWhatToTest === betaBuildLocalizations[0].attributes.whatsNew) {
            return false;
        }
        const response = await fetchAppStoreConnect(`/betaBuildLocalizations/${betaBuildLocalizations[0].id}`, "PATCH", {
            data: {
                type: "betaBuildLocalizations",
                id: betaBuildLocalizations[0].id,
                attributes: {
                    whatsNew: currentWhatToTest
                }
            }
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

    const removeSubmittedForBetaReview = async () => {
        const response = await fetchAppStoreConnect(`/betaAppReviewSubmissions/${build.build.id}`, "DELETE");
        if (response && !response.ok) {
            const error = constructError(response, "Could not remove submitted for beta review");
            throw error;
        }
        return true;
    };

    const submitForBetaReview = async () => {
        const containsExternalGroups = usedGroupsIDs.find(bg => {
            const betaGroup = betaGroups?.find(bg2 => {
                return bg2.id === bg;
            });
            return !betaGroup?.attributes.isInternalGroup;
        });
        if (build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" && containsExternalGroups) {
            const response = await fetchAppStoreConnect("/betaAppReviewSubmissions", "POST", {
                data: {
                    type: "betaAppReviewSubmissions",
                    relationships: {
                        build: {
                            data: {
                                type: "builds",
                                id: build.build.id
                            }
                        }
                    }
                }
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

    const addGroupsToBuild = async () => {
        const newGroupIDs = usedGroupsIDs.filter(bg => !usedGroups?.find(bg2 => bg2.id === bg));
        const newGroups = betaGroups?.filter(bg => newGroupIDs.find(bg2 => bg2 === bg.id));
        if (newGroups) {
            for (const group of newGroups) {
                const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds`, "POST", {
                    data: [
                        {
                            type: "builds",
                            id: build.build.id
                        }
                    ]
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

    const removeGroupsFromBuild = async () => {
        const removedGroups = usedGroups.filter(bg => !usedGroupsIDs.find(bg2 => bg2 === bg.id));
        if (removedGroups) {
            for (const group of removedGroups) {
                const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds`, "DELETE", {
                    data: [
                        {
                            type: "builds",
                            id: build.build.id
                        }
                    ]
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
        return build.buildBetaDetails.attributes.externalBuildState === "EXPIRED" || build.buildBetaDetails.attributes.internalBuildState === "EXPIRED";
    }

    const expireBuild = async () => {
        const response = await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
            data: {
                type: "builds",
                id: build.build.id,
                attributes: {
                    expired: true
                }
            }
        });
        if (response && !response.ok) {
            const error = constructError(response, "Could not expire build");
            throw error;
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title={getSubmitTitle()} onSubmit={() => {
                        if (validateWhatToTest(currentWhatToTest, usedGroups ?? [])) {
                            (async () => {
                                try {
                                    if (betaGroups === null) {
                                        return;
                                    }
                                    setSubmitIsLoading(true);
                                    await updateWhatToTest();
                                    const submitted = await submitForBetaReview();
                                    const added = await addGroupsToBuild();
                                    if (added) {
                                        groupsDidChange(usedGroups ?? []);
                                    }

                                    const removed = await removeGroupsFromBuild();
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
                                    setSubmitIsLoading(false);

                                } catch (error) {
                                    console.log("presentError");
                                    presentError(error);
                                    setSubmitIsLoading(false);
                                }
                            })();
                        } else {
                            setWhatToTestError("You must specify what to test");
                        }
                    }} />
                    {!isExpired() && <Action title="Expire" onAction={async () => {
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
                    }} />}
                </ActionPanel>
            }
            isLoading={isLoadingBetaGroups || isLoadingBetaBuildLocalizations || submitIsLoading}>
            <Form.TagPicker id="betaGroups" title="Beta Groups" value={usedGroupsIDs} onChange={setUsedGroupIDs} >
                {betaGroups?.map((bg) => (
                    <Form.TagPicker.Item value={bg.id} title={bg.attributes.name} key={bg.id} icon={{ source: Icon.Dot, tintColor: bg.attributes.isInternalGroup ? Color.Green : Color.Yellow }} />
                ))}
            </Form.TagPicker>
            <Form.TextArea
                id="description"
                placeholder="What to test"
                error={whatToTestError}
                value={currentWhatToTest}
                onChange={(newValue) => setCurrentWhatToTest(newValue)}
                onBlur={(event) => {
                    const value = event.target.value;
                    if (validateWhatToTest(value, usedGroups)) {
                        dropWhatToTestErrorIfNeeded();
                    } else {
                        setWhatToTestError("You must specify what to test.");
                    }
                }}
            />
        </Form>
    );
}

class ATCError extends Error {
    constructor(
        public title: string,
        public detail: string
    ) {
        super(title);
        this.name = this.constructor.name;

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ATCError);
        }
    }
}

function validateWhatToTest(whatToTest: string | undefined, usedGroups: BetaGroup[]) {
    const notInternal = usedGroups.find(bg => {
        return !bg.attributes.isInternalGroup;
    });
    if (!whatToTest && notInternal) {
        return false;
    }

    if (whatToTest === "" && notInternal) {
        return false;
    }
    return true;
}


