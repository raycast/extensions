import { ActionPanel, Form, Action, showToast, Toast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  BuildWithBetaDetailAndBetaGroups,
  betaTestersSchema,
  App,
  betaBuildLocalizationsSchema,
  BetaTester,
} from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import fs from "fs";

interface Props {
  build: BuildWithBetaDetailAndBetaGroups;
  app: App;
  didUpdateExistingTesters: (newTesters: BetaTester[]) => void;
  didUpdateNewTesters: (newTesters: BetaTester[]) => void;
}
type SubmitType =
  | "UPDATE_WHAT_TO_TEST"
  | "SUBMIT_FOR_BETA_REVIEW"
  | "ADD_EXISTING_TESTERS"
  | "ADD_NEW_TESTERS"
  | "ADD_FROM_CSV";

interface FormValues {
  testersIDs: string[];
  externalTesters: string;
  whatToTest: string;
  files: string[];
}

export default function AddIndividualTester({ build, app, didUpdateExistingTesters, didUpdateNewTesters }: Props) {
  const { data, isLoading } = useAppStoreConnectApi(`/builds/${build.build.id}/individualTesters`, (response) => {
    return betaTestersSchema.safeParse(response.data).data;
  });

  const { data: allUsers, isLoading: isLoadingUsers } = useAppStoreConnectApi(
    `/betaTesters?filter[apps]=${app.id}`,
    (response) => {
      return betaTestersSchema.safeParse(response.data).data;
    },
  );
  const { data: betaBuildLocalizations, isLoading: isLoadingBetaBuildLocalizations } = useAppStoreConnectApi(
    `/builds/${build.build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`,
    (response) => {
      return betaBuildLocalizationsSchema.safeParse(response.data).data ?? [];
    },
  );

  const [allUsersFromApp, setAllUsersFromApp] = useState<BetaTester[]>([]);
  const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);

  const getSubmitTitle = () => {
    const types = getSubmitTypes(
      itemProps.files.value,
      itemProps.testersIDs.value,
      itemProps.externalTesters.value,
      itemProps.whatToTest.value,
    );
    if (types.find((type) => type === "SUBMIT_FOR_BETA_REVIEW")) {
      return "Submit for beta review";
    } else {
      return "Update";
    }
  };

  const getSubmitTypes = (
    files?: string[],
    testersIDs?: string[],
    externalTesters?: string,
    currentWhatToTest?: string,
  ): SubmitType[] => {
    const types: SubmitType[] = [];
    if (testersIDs && testersIDs.length > 0) {
      types.push("ADD_EXISTING_TESTERS");
    }
    if (externalTesters && externalTesters.length > 0) {
      types.push("ADD_NEW_TESTERS");
    }
    if (
      betaBuildLocalizations &&
      betaBuildLocalizations.length > 0 &&
      currentWhatToTest !== betaBuildLocalizations[0].attributes.whatsNew
    ) {
      types.push("UPDATE_WHAT_TO_TEST");
    }
    if (files && files.length > 0) {
      types.push("ADD_FROM_CSV");
    }

    if (
      (build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" &&
        ((testersIDs && testersIDs.length > 0) || (externalTesters && externalTesters.length > 0))) ||
      (files && files.length > 0)
    ) {
      return ["SUBMIT_FOR_BETA_REVIEW"];
    }

    return types;
  };

  const updateWhatToTest = async (currentWhatToTest: string) => {
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
          whatsNew: currentWhatToTest,
        },
      },
    });
  };

  const addExistingUsers = async (testersIDs: string[]) => {
    setSubmitIsLoading(true);
    const usersToAdd = allUsers
      ?.filter((user) => {
        return testersIDs.includes(user.id);
      })
      .map((user) => ({
        type: "betaTesters",
        id: user.id,
      }));

    if (usersToAdd && usersToAdd.length === 0) {
      return;
    }

    const response = await fetchAppStoreConnect(`/builds/${build.build.id}/relationships/individualTesters`, "POST", {
      data: usersToAdd,
    });
    if (response && response.ok) {
      if (!allUsers) return;
      didUpdateExistingTesters(
        allUsers?.filter((user) => {
          return testersIDs.includes(user.id);
        }),
      );
    }
  };

  const addNewUsers = async (externalTesters: string) => {
    if (externalTesters.length === 0) return;
    setSubmitIsLoading(true);
    const values = externalTesters.split(",").map((item) => item.trim());

    const addedUsers: BetaTester[] = [];
    for (let i = 0; i < values.length; i += 3) {
      if (i + 2 < values.length) {
        const userToAdd = {
          type: "betaTesters",
          attributes: {
            firstName: values[i],
            lastName: values[i + 1],
            email: values[i + 2],
          },
          relationships: {
            builds: {
              data: [
                {
                  type: "builds",
                  id: build.build.id,
                },
              ],
            },
          },
        };
        const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
          data: userToAdd,
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
            },
          } as BetaTester);
        }
      }
    }
    didUpdateNewTesters(addedUsers);
  };

  const addFromCSV = async (file: string) => {
    setSubmitIsLoading(true);
    const fileContent = fs.readFileSync(file, "utf8");
    const values = fileContent.split(",").map((item) => item.trim());
    const addedUsers: BetaTester[] = [];
    for (let i = 0; i < values.length; i += 3) {
      if (i + 2 < values.length) {
        const userToAdd = {
          type: "betaTesters",
          attributes: {
            firstName: values[i],
            lastName: values[i + 1],
            email: values[i + 2],
          },
          relationships: {
            builds: {
              data: [
                {
                  type: "builds",
                  id: build.build.id,
                },
              ],
            },
          },
        };
        const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
          data: userToAdd,
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
            },
          } as BetaTester);
        }
      }
    }
    didUpdateNewTesters(addedUsers);
  };

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
              id: build.build.id,
            },
          },
        },
      },
    });
  };

  const { handleSubmit, setValue, itemProps } = useForm<FormValues>({
    initialValues: {
      testersIDs: [],
      externalTesters: "",
      whatToTest: "",
      files: [],
    },
    onSubmit: async (values) => {
      setSubmitIsLoading(true);
      try {
        if (values.whatToTest) {
          await updateWhatToTest(values.whatToTest);
        }

        if (values.testersIDs && values.testersIDs.length > 0) {
          await addExistingUsers(values.testersIDs);
        }

        if (values.externalTesters) {
          await addNewUsers(values.externalTesters);
        }

        if (values.files && values.files.length > 0) {
          const file = values.files[0];
          if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
            await addFromCSV(file);
          }
        }

        if (
          build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" &&
          (values.testersIDs.length > 0 || values.externalTesters || values.files.length > 0)
        ) {
          await submitForBetaReview();
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Submitted for beta review",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Updated",
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
    if (!allUsers || !data) return;
    if (data.length === 0) {
      setAllUsersFromApp(allUsers);
      return;
    }
    const usersToShow = allUsers.filter((user) => data.some((tester) => tester.id !== user.id));
    setAllUsersFromApp(usersToShow);
  }, [allUsers, data]);

  useEffect(() => {
    // TODO: Handle localizations
    if (betaBuildLocalizations !== null && betaBuildLocalizations.length > 0) {
      setValue("whatToTest", betaBuildLocalizations[0].attributes.whatsNew ?? "");
    }
  }, [betaBuildLocalizations]);

  useEffect(() => {
    if (betaBuildLocalizations !== null && betaBuildLocalizations.length > 0) {
      setValue("whatToTest", betaBuildLocalizations[0].attributes.whatsNew ?? "");
    }
  }, [betaBuildLocalizations]);

  return (
    <Form
      isLoading={isLoading || isLoadingUsers || submitIsLoading || isLoadingBetaBuildLocalizations}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Person} title={getSubmitTitle()} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Add Existing Testers" {...itemProps.testersIDs}>
        {allUsersFromApp?.map((bg) => (
          <Form.TagPicker.Item
            value={bg.id}
            title={bg.attributes.firstName + " " + bg.attributes.lastName + ` (${bg.attributes.email})`}
            key={bg.id}
            icon={Icon.Person}
          />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        title="Add New Testers"
        {...itemProps.externalTesters}
        placeholder="New testers in CSV format"
        info="External testers must be in the format: first name, last name, and email address. Example: John,Doe,john@example.com,Jane,Doe,jane@example.com"
      />
      <Form.FilePicker
        title="Import from CSV"
        {...itemProps.files}
        allowMultipleSelection={false}
        info="Import testers from a CSV file. The CSV file must be in the format: first name, last name, and email address"
      />
      <Form.TextArea {...itemProps.whatToTest} title="What to test" placeholder="What to test" />
    </Form>
  );
}
