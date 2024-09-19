import { ActionPanel, Form, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { BuildWithBetaDetailAndBetaGroups, betaTestersSchema, App, betaBuildLocalizationsSchema, BetaTester } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import fs from "fs";

interface Props {
    build: BuildWithBetaDetailAndBetaGroups;
    app: App;
    didUpdateExistingTesters: (newTesters: BetaTester[]) => void;
    didUpdateNewTesters: (newTesters: BetaTester[]) => void;
}
type SubmitType = "UPDATE_WHAT_TO_TEST" | "SUBMIT_FOR_BETA_REVIEW" | "ADD_EXISTING_TESTERS" | "ADD_NEW_TESTERS" | "ADD_FROM_CSV";

export default function AddIndividualTester({ build, app, didUpdateExistingTesters, didUpdateNewTesters }: Props) {
    const { data, isLoading } = useAppStoreConnectApi(`/builds/${build.build.id}/individualTesters`, (response) => {
        return betaTestersSchema.safeParse(response.data).data;
    });

    const { data: allUsers, isLoading: isLoadingUsers } = useAppStoreConnectApi(`/betaTesters?filter[apps]=${app.id}`, (response) => {
        return betaTestersSchema.safeParse(response.data).data;
    });
    const { data: betaBuildLocalizations, isLoading: isLoadingBetaBuildLocalizations } = useAppStoreConnectApi(`/builds/${build.build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`, (response) => {
        return betaBuildLocalizationsSchema.safeParse(response.data).data ?? [];
    });


    const [testersIDs, setTestersIDs] = useState<string[]>([]);
    const [allUsersFromApp, setAllUsersFromApp] = useState<BetaTester[]>([]);
    const [whatToTestError, setWhatToTestError] = useState<string | undefined>();
    const [currentWhatToTest, setCurrentWhatToTest] = useState<string>("");
    const [externalTesters, setExternalTesters] = useState<string>("");
    const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);

    function dropWhatToTestErrorIfNeeded() {
        if (whatToTestError !== undefined) {
            setWhatToTestError(undefined);
        }
    }

    useEffect(() => {
        if (!allUsers || !data) return;
        if (data.length === 0) {
            setAllUsersFromApp(allUsers);
            return;
        }
        const usersToShow = allUsers
            .filter((user) => data.some((tester) => tester.id !== user.id));
        setAllUsersFromApp(usersToShow);
    }, [allUsers, data]);

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
        const types = getSubmitTypes();
        if (types.find(type => type === "SUBMIT_FOR_BETA_REVIEW")) {
            return "Submit for beta review";
        } else {
            return "Update"
        }
    };

    const getSubmitTypes = (files?: string[]): SubmitType[] => {
        const types: SubmitType[] = [];
        if (testersIDs.length > 0) {
            types.push("ADD_EXISTING_TESTERS");
        }
        if (externalTesters.length > 0) {
            types.push("ADD_NEW_TESTERS");
        }
        if (betaBuildLocalizations && betaBuildLocalizations.length > 0 && currentWhatToTest !== betaBuildLocalizations[0].attributes.whatsNew) {
            types.push("UPDATE_WHAT_TO_TEST");
        }
        if (files && files.length > 0) {
            types.push("ADD_FROM_CSV");
        }

        if (build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" && (testersIDs.length > 0 || externalTesters.length > 0) || files && files.length > 0) {
            return ["SUBMIT_FOR_BETA_REVIEW"];
        }


        return types;
    };

    const updateWhatToTest = async () => {
        setSubmitIsLoading(true);
        if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0) {
            return;
        }
        if (currentWhatToTest === betaBuildLocalizations[0].attributes.whatsNew) {
            return;
        }
        await fetchAppStoreConnect(`/betaBuildLocalizations/${betaBuildLocalizations[0].id}`, "PATCH", {
            data: {
                type: "betaBuildLocalizations",
                id: betaBuildLocalizations[0].id,
                attributes: {
                    whatsNew: currentWhatToTest
                }
            }
        });
    };

    const addExistingUsers = async () => {
        setSubmitIsLoading(true);
        const usersToAdd = allUsers?.filter((user) => {
            return testersIDs.includes(user.id);
        }).map((user) => ({
            type: "betaTesters",
            id: user.id
        }));

        if (usersToAdd && usersToAdd.length === 0) {
            return;
        }

        const response = await fetchAppStoreConnect(`/builds/${build.build.id}/relationships/individualTesters`, "POST", {
            data: usersToAdd
        });
        if (response && response.ok) {
            if (!allUsers) return;
            didUpdateExistingTesters(allUsers?.filter((user) => {
                return testersIDs.includes(user.id);
            }));
        }
    };

    const addNewUsers = async () => {
        if (externalTesters.length === 0) return;
        setSubmitIsLoading(true);
        const usersToAdd = [];
        const values = externalTesters.split(',').map(item => item.trim());

        const addedUsers: BetaTester[] = [];
        for (let i = 0; i < values.length; i += 3) {
            if (i + 2 < values.length) {
                const userToAdd = {
                    type: "betaTesters",
                    attributes: {
                        firstName: values[i],
                        lastName: values[i + 1],
                        email: values[i + 2]
                    },
                    relationships: {
                        builds: {
                            data: [{
                                type: "builds",
                                id: build.build.id
                            }]
                        }
                    }
                }
                const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
                    data: userToAdd
                });
                if (response && response.ok) {
                    const json = await response.json();
                    addedUsers.push({
                        type: "betaTesters",
                        id: json.data.id,
                        attributes: {
                            firstName: json.data.attributes.firstName,
                            lastName: json.data.attributes.lastName,
                            email: json.data.attributes.email,
                            inviteType: json.data.inviteType,
                            state: json.data.state,
                        }
                    } as BetaTester);
                }
            }
        }
        didUpdateNewTesters(addedUsers);
    };

    const addFromCSV = async (file: string) => {
        setSubmitIsLoading(true);
        const fileContent = fs.readFileSync(file, "utf8");
        const usersToAdd = [];
        const values = fileContent.split(',').map(item => item.trim());
        const addedUsers: BetaTester[] = [];
        for (let i = 0; i < values.length; i += 3) {
            if (i + 2 < values.length) {
                const userToAdd = {
                    type: "betaTesters",
                    attributes: {
                        firstName: values[i],
                        lastName: values[i + 1],
                        email: values[i + 2]
                    },
                    relationships: {
                        builds: {
                            data: [{
                                type: "builds",
                                id: build.build.id
                            }]
                        }
                    }
                }
                const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
                    data: userToAdd
                });
                if (response && response.ok) {
                    const json = await response.json();
                    addedUsers.push({
                        type: "betaTesters",
                        id: json.data.id,
                        attributes: {
                            firstName: json.data.attributes.firstName,
                            lastName: json.data.attributes.lastName,
                            email: json.data.attributes.email,
                            inviteType: json.data.inviteType,
                            state: json.data.state,
                        }
                    } as BetaTester);
                }
            }
        }
        didUpdateNewTesters(addedUsers);
    }

    const submitForBetaReview = async () => {
        setSubmitIsLoading(true);
        if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0) {
            return;
        }
        await fetchAppStoreConnect(`/betaAppReviewSubmissions`, "POST", {
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
    };

    return (
        <Form
            isLoading={isLoading || isLoadingUsers || submitIsLoading || isLoadingBetaBuildLocalizations}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title={getSubmitTitle()} onSubmit={(values: { files: string[], testers: string[], externalTesters: string, whatToTest: string }) => {
                        if (validateWhatToTest(currentWhatToTest)) {
                            const types = getSubmitTypes(values.files);
                            if (types.length === 1 && types[0] === "SUBMIT_FOR_BETA_REVIEW") {
                                (async () => {
                                    await updateWhatToTest();
                                    await addExistingUsers();
                                    await addNewUsers();
                                    if (values.files && values.files.length > 0) {
                                        const file = values.files[0];
                                        if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
                                            await addFromCSV(file);
                                        }
                                    }
                                    await submitForBetaReview();
                                    setSubmitIsLoading(false);
                                    showToast({
                                        style: Toast.Style.Success,
                                        title: "Success!",
                                        message: "Submitted for beta review",
                                    });
                                })();
                            } else {
                                (async () => {
                                    try {
                                        for (const type of types) {
                                            switch (type) {
                                                case "UPDATE_WHAT_TO_TEST":
                                                    await updateWhatToTest();
                                                    break;
                                                case "ADD_EXISTING_TESTERS":
                                                    await addExistingUsers();
                                                    break;
                                                case "ADD_NEW_TESTERS":
                                                    await addNewUsers();
                                                    break;
                                                case "ADD_FROM_CSV":
                                                    const file = values.files[0];
                                                    if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
                                                        await addFromCSV(file);
                                                    }
                                                    break;
                                            }
                                        }
                                    } catch (error) {
                                        presentError(error);
                                    }
                                })();
                                showToast({
                                    style: Toast.Style.Success,
                                    title: "Success!",
                                    message: "Updated build",
                                });
                                setSubmitIsLoading(false);
                            }
                        } else {
                            setWhatToTestError("You must specify what to test.");
                            setSubmitIsLoading(false);
                        }
                    }} />
                </ActionPanel>
            }
        >
            <Form.TagPicker id="testers" title="Add Existing Testers" value={testersIDs} onChange={setTestersIDs} >
                {allUsersFromApp?.map((bg) => (
                    <Form.TagPicker.Item value={bg.id} title={bg.attributes.firstName + " " + bg.attributes.lastName + ` (${bg.attributes.email})`} key={bg.id} icon={Icon.Person} />
                ))}
            </Form.TagPicker>
            <Form.TextArea id="externalTesters" title="Add New Testers" value={externalTesters} onChange={setExternalTesters} placeholder="New testers in CSV format" info="External testers must be in the format: first name, last name, and email address. Example: John,Doe,john@example.com,Jane,Doe,jane@example.com" />
            <Form.FilePicker title="Import from CSV" id="files" allowMultipleSelection={false} info="Import testers from a CSV file. The CSV file must be in the format: first name, last name, and email address" />
            <Form.TextArea
                id="description"
                placeholder="What to test"
                error={whatToTestError}
                value={currentWhatToTest}
                onChange={(newValue) => setCurrentWhatToTest(newValue)}
                onBlur={(event) => {
                    const value = event.target.value;
                    if (validateWhatToTest(value)) {
                        dropWhatToTestErrorIfNeeded();
                    } else {
                        setWhatToTestError("You must specify what to test.");
                    }
                }}
            />
        </Form>
    );
}

function validateWhatToTest(whatToTest: string | undefined): boolean {
    if (!whatToTest) {
        return false;
    }

    if (whatToTest === "") {
        return false;
    }
    return true;
}