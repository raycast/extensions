import { Form, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { betaTestersSchema, App, BetaGroup, BetaTester, usersSchema, User, betaTesterSchema } from "../Model/schemas";
import { useEffect, useState } from "react";
import { presentError } from "../Utils/utils";
interface InternalBetaGroupTestersProps {
  group: BetaGroup;
  app: App;
  didUpdateNewTesters: (newTesters: BetaTester[]) => void;
}
interface InternalBetaGroupTestersFormValues {
  testers: string[];
}
export default function InternalBetaGroupTesters({ group, app, didUpdateNewTesters }: InternalBetaGroupTestersProps) {
  const [betaUsersPath, setBetaUsersPath] = useState<string | undefined>(undefined);
  const { data: allUsers, isLoading: isLoadingUsers } = useAppStoreConnectApi(
    `/users?filter[roles]=ACCOUNT_HOLDER,ADMIN,APP_MANAGER,DEVELOPER,MARKETING&filter[visibleApps]=${app.id}`,
    (response) => {
      return usersSchema.safeParse(response.data).data ?? null;
    },
    true,
  );
  const { data: betaUsers, isLoading: isLoadingBetaUsers } = useAppStoreConnectApi(
    betaUsersPath,
    (response) => {
      return betaTestersSchema.safeParse(response.data).data ?? null;
    },
    true,
  );
  const [availableUsers, setAvailableUsers] = useState<User[]>();
  const [submitIsLoading, setSubmitIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<InternalBetaGroupTestersFormValues>({
    onSubmit(values) {
      setSubmitIsLoading(true);
      (async () => {
        try {
          const added: BetaTester[] = [];
          const emails = values.testers.map((id) => allUsers?.find((user) => user.id === id)?.attributes.username);
          const response = await fetchAppStoreConnect(`/betaTesters?filter[email]=${emails.join(",")}`, "GET");
          if (response) {
            const json = await response.json();
            const parsed = betaTestersSchema.safeParse(json.data);
            if (parsed.data) {
              for (const betaTester of parsed.data) {
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
              }
            }
          }
          setSubmitIsLoading(false);
          if (added.length > 0) {
            showToast({
              style: Toast.Style.Success,
              title: "Success!",
              message: values.testers.length === 1 ? "Added tester" : "Added testers",
            });
            if (allUsers) {
              didUpdateNewTesters(added);
            }
          }
        } catch (error) {
          setSubmitIsLoading(false);
          presentError(error);
        }
      })();
    },
    validation: {
      testers: (value) => {
        value = value || [];
        if (value.length === 0) {
          return "You must select at least one tester";
        }
      },
    },
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
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
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
    </Form>
  );
}
