import { ActionPanel, Form, Action, showToast, Toast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { appSchemas, UserInvitation, userInvitationsSchema } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface FormValues {
  allAppsVisible: boolean;
  email: string;
  firstName: string;
  lastName: string;
  provisioningAllowed: boolean;
  roles: string[];
  canCreateApps: boolean;
  visibleApps: string[];
}

interface Props {
  didInviteNewUser: (user: UserInvitation) => void;
}

export default function InviteTeamMember({ didInviteNewUser }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: allApps, isLoading: isLoadingApps } = useAppStoreConnectApi(`/apps`, (response) => {
    return appSchemas.safeParse(response.data).data ?? null;
  });
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit(values) {
      (async () => {
        setIsLoading(true);
        try {
          const visibleApps = values.allAppsVisible ? allApps?.map((app) => app.id) : values.visibleApps;
          const data = {
            data: {
              type: "userInvitations",
              relationships: {
                visibleApps: {
                  data: visibleApps?.map((id) => ({
                    type: "apps",
                    id,
                  })),
                },
              },
              attributes: {
                email: values.email,
                firstName: values.firstName,
                lastName: values.lastName,
                roles: values.roles.concat(values.canCreateApps ? ["CREATE_APPS"] : []),
                provisioningAllowed: values.provisioningAllowed,
              },
            },
          };
          const response = await fetchAppStoreConnect(`/userInvitations`, "POST", data);
          setIsLoading(false);
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Invite sent",
          });
          if (response && response.ok) {
            const json = await response.json();
            const invited = userInvitationsSchema.safeParse(json.data);
            if (invited.success) {
              didInviteNewUser(invited.data);
            }
          }
        } catch (error) {
          setIsLoading(false);
          presentError(error);
        }
      })();
    },
    validation: {
      email: FormValidation.Required,
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      roles: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (allApps) {
      setValue(
        "visibleApps",
        (allApps || []).map((app) => app.id),
      );
    }
  }, [allApps]);

  const roles = ["ADMIN", "APP_MANAGER", "CUSTOMER_SUPPORT", "DEVELOPER", "FINANCE", "MARKETING", "SALES"];

  const roleString = (role: string) => {
    const lowerCase = role.toLowerCase();
    const capitalized = lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
    const replaceUnderscore = capitalized.replace("_", " ");
    return replaceUnderscore;
  };
  return (
    <Form
      isLoading={isLoading || isLoadingApps}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Invite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Firstname" {...itemProps.firstName} />
      <Form.TextField title="Lastname" {...itemProps.lastName} />
      <Form.TextField title="Email" {...itemProps.email} />
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
      <Form.Checkbox
        label="Can create apps"
        {...itemProps.canCreateApps}
        info="Invitee will be able to create new apps"
      />
    </Form>
  );
}
