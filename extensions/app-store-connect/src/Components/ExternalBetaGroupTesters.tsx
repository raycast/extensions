import { Form, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { betaTestersSchema, App, BetaGroup, BetaTester, usersSchema, User, betaTesterSchema } from "../Model/schemas";
import { useEffect, useState } from "react";
import { presentError } from "../Utils/utils";
import fs from "fs";

interface ExternalBetaGroupTestersProps {
  group: BetaGroup;
  app: App;
  didUpdateNewTesters: (newTesters: BetaTester[]) => void;
}
interface ExternalBetaGroupTestersFormValues {
  testers: string[];
  externalTesters: string;
  csvFile: string[];
}
export default function ExternalBetaGroupTesters({ group, app, didUpdateNewTesters }: ExternalBetaGroupTestersProps) {
  const [betaUsersPath, setBetaUsersPath] = useState<string | undefined>(undefined);
  const { data: allUsers, isLoading: isLoadingUsers } = useAppStoreConnectApi(
    `/users?filter[roles]=ACCOUNT_HOLDER,ADMIN,APP_MANAGER,DEVELOPER,MARKETING&filter[visibleApps]=${app.id}`,
    (response) => {
      return usersSchema.safeParse(response.data).data ?? null;
    },
  );
  const { data: betaUsers, isLoading: isLoadingBetaUsers } = useAppStoreConnectApi(betaUsersPath, (response) => {
    return betaTestersSchema.safeParse(response.data).data ?? null;
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>();
  const [submitIsLoading, setSubmitIsLoading] = useState(false);

  const addRemoveExternalTesters = async (testers: string[]) => {
    if (testers.length === 0) return [];
    const added: BetaTester[] = [];
    const emails = testers.map((id) => allUsers?.find((user) => user.id === id)?.attributes.username);
    const response = await fetchAppStoreConnect(`/betaTesters?filter[email]=${emails.join(",")}`, "GET");
    if (response) {
      const json = await response.json();
      const parsed = betaTestersSchema.safeParse(json.data);
      if (parsed.data) {
        for (const betaTester of parsed.data) {
          try {
            const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
              data: {
                type: "betaTesters",
                attributes: {
                  firstName: betaTester.attributes.firstName,
                  lastName: betaTester.attributes.lastName,
                  email: betaTester.attributes.email,
                },
                relationships: {
                  betaGroups: {
                    data: [
                      {
                        type: "betaGroups",
                        id: group.id,
                      },
                    ],
                  },
                },
              },
            });
            if (response) {
              const json = await response.json();
              const parsed = betaTesterSchema.safeParse(json.data);
              if (parsed.data) {
                added.push(parsed.data);
              }
            }
          } catch (error) {
            presentError(error);
          }
        }
      }
    }
    return added;
  };
  const addNewUsers = async (externalTesters: string) => {
    if (externalTesters.length === 0) return [];
    setSubmitIsLoading(true);
    const values = externalTesters.split(",").map((item) => item.trim());

    const addedUsers: BetaTester[] = [];
    for (let i = 0; i < values.length; i += 3) {
      try {
        if (i + 2 < values.length) {
          const userToAdd = {
            type: "betaTesters",
            attributes: {
              firstName: values[i],
              lastName: values[i + 1],
              email: values[i + 2],
            },
            relationships: {
              betaGroups: {
                data: [
                  {
                    type: "betaGroups",
                    id: group.id,
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
      } catch (error) {
        presentError(error);
      }
    }
    return addedUsers;
  };

  const addFromCSV = async (files: string[]) => {
    if (files.length === 0) return [];
    const file = files[0];
    if (!fs.existsSync(file) && !fs.lstatSync(file).isFile()) {
      return [];
    }

    const fileContent = fs.readFileSync(file, "utf8");
    const values = fileContent.split(",").map((item) => item.trim());
    const addedUsers: BetaTester[] = [];
    for (let i = 0; i < values.length; i += 3) {
      try {
        if (i + 2 < values.length) {
          const userToAdd = {
            type: "betaTesters",
            attributes: {
              firstName: values[i],
              lastName: values[i + 1],
              email: values[i + 2],
            },
            relationships: {
              betaGroups: {
                data: [
                  {
                    type: "betaGroups",
                    id: group.id,
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
      } catch (error) {
        presentError(error);
      }
    }
    return addedUsers;
  };

  const { handleSubmit, itemProps } = useForm<ExternalBetaGroupTestersFormValues>({
    onSubmit(values) {
      setSubmitIsLoading(true);
      (async () => {
        let added: BetaTester[] = [];
        const errors: string[] = [];
        const addedExisting = await addRemoveExternalTesters(values.testers);
        if (Array.isArray(addedExisting)) {
          added = addedExisting;
        } else if (typeof addedExisting === "string") {
          errors.push(addedExisting);
        }
        const addedNew = await addNewUsers(values.externalTesters);
        if (Array.isArray(addedNew)) {
          added = added.concat(addedNew);
        } else if (typeof addedNew === "string") {
          errors.push(addedNew);
        }
        const addedFromCSV = await addFromCSV(values.csvFile);
        if (Array.isArray(addedFromCSV)) {
          added = added.concat(addedFromCSV);
        } else if (typeof addedFromCSV === "string") {
          errors.push(addedFromCSV);
        }
        setSubmitIsLoading(false);
        if (added.length > 0) {
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: added.length === 1 ? "Added tester" : "Added testers",
          });
          if (allUsers) {
            didUpdateNewTesters(added);
          }
        }
      })();
    },
    validation: {},
  });
  useEffect(() => {
    if (allUsers) {
      if (!allUsers) {
        return;
      }
      setBetaUsersPath(
        `/betaTesters?filter[email]=${allUsers.map((user) => user.attributes.username).join(",")}&filter[betaGroups]=${group.id}`,
      );
    }
  }, [allUsers]);

  useEffect(() => {
    if (betaUsers && allUsers) {
      const notInBetaUsers = allUsers.filter(
        (user) => !betaUsers.some((betaUser) => betaUser.attributes.email === user.attributes.username),
      );
      setAvailableUsers(notInBetaUsers);
    }
  }, [betaUsers, allUsers]);

  return (
    <Form
      isLoading={isLoadingUsers || isLoadingBetaUsers || submitIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker {...itemProps.testers} title="Add Existing Testers">
        {availableUsers?.map((bg) => (
          <Form.TagPicker.Item
            value={bg.id}
            title={bg.attributes.firstName + " " + bg.attributes.lastName + ` (${bg.attributes.username})`}
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
        title="CSV File"
        allowMultipleSelection={false}
        info="Import testers from a CSV file. The CSV file must be in the format: first name, last name, and email address"
        {...itemProps.csvFile}
      />
    </Form>
  );
}
