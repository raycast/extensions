import { ActionPanel, Form, Action, showToast, Toast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { appSchemas, User, userSchema, userSchemaWithApps } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface FormValues {
  allAppsVisible: boolean;
  provisioningAllowed: boolean;
  roles: string[];
  canCreateApps: boolean;
  visibleApps: string[];
}

interface Props {
  user: User;
  userChanged: (user: User) => void;
}

export default function EditTeamMember({ userChanged, user }: Props) {
  const { data, isLoading: isLoadingUser } = useAppStoreConnectApi(
    `/users/${user.id}?include=visibleApps`,
    (response) => {
      return userSchemaWithApps.safeParse(response).data ?? null;
    },
  );
  const { data: allApps, isLoading: isLoadingApps } = useAppStoreConnectApi(`/apps`, (response) => {
    return appSchemas.safeParse(response.data).data ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit(values) {
      if (data) {
        (async () => {
          setIsLoading(true);
          try {
            const body = {
              data: {
                type: "users",
                id: data.data.id,
                relationships: {
                  visibleApps: {
                    data: values.visibleApps.map((id) => ({
                      type: "apps",
                      id,
                    })),
                  },
                },
                attributes: {
                  roles: values.roles.concat(values.canCreateApps ? ["CREATE_APPS"] : []),
                  provisioningAllowed: values.provisioningAllowed,
                  allAppsVisible: values.allAppsVisible,
                },
              },
            };
            const response = await fetchAppStoreConnect(`/users/${data.data.id}`, "PATCH", body);
            setIsLoading(false);
            showToast({
              style: Toast.Style.Success,
              title: "Success!",
              message: "User updated",
            });
            if (response && response.ok) {
              const json = await response.json();
              const invited = userSchema.safeParse(json.data);
              if (invited.success) {
                userChanged(invited.data);
              }
            }
          } catch (error) {
            setIsLoading(false);
            presentError(error);
          }
        })();
      }
    },
    validation: {
      roles: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (data) {
      setValue(
        "visibleApps",
        (data?.included || []).map((app) => app.id),
      );
      setValue("allAppsVisible", data?.data.attributes.allAppsVisible);
      setValue("provisioningAllowed", data?.data.attributes.provisioningAllowed);
      setValue("roles", data?.data.attributes.roles);
    }
  }, [data]);

  const roles = ["ADMIN", "APP_MANAGER", "CUSTOMER_SUPPORT", "DEVELOPER", "FINANCE", "MARKETING", "SALES"];

  const roleString = (role: string) => {
    const lowerCase = role.toLowerCase();
    const capitalized = lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
    const replaceUnderscore = capitalized.replace("_", " ");
    return replaceUnderscore;
  };
  return (
    <Form
      isLoading={isLoading || isLoadingUser || isLoadingApps}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Roles" {...itemProps.roles}>
        {roles.map((role) => (
          <Form.TagPicker.Item value={role} title={roleString(role)} key={role} icon={Icon.Person} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox
        label="All apps visible"
        {...itemProps.allAppsVisible}
        info="Invitee will be able to see all apps"
      />
      {!itemProps.allAppsVisible.value && (
        <Form.TagPicker title="Visible apps" {...itemProps.visibleApps}>
          {allApps?.map((app) => (
            <Form.TagPicker.Item value={app.id} title={app.attributes.name} key={app.id} icon={Icon.Mobile} />
          ))}
        </Form.TagPicker>
      )}
      <Form.Checkbox
        label="Provisioning allowed"
        {...itemProps.provisioningAllowed}
        info="Invitee will be able to access the provisioning functionality on the Apple Developer website"
      />
    </Form>
  );
  return null;
}
