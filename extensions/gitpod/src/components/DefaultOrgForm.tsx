import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { IOrganizationError } from "../api/Gitpod/Models/IOrganizationError";
import { IOrganization } from "../api/Gitpod/Models/IOrganizations";
import { dashboardPreferences } from "../preferences/dashboard_preferences";

import { ErrorListView, errorMessage } from "./errorListView";

interface defaultOrgParams {
  revalidate?: () => Promise<void>;
}

export default function DefaultOrgForm({ revalidate }: defaultOrgParams) {
  const preferences = getPreferenceValues<dashboardPreferences>();

  const { pop } = useNavigation();

  const [isUnauthorised, setIsUnauthorized] = useState<boolean>(false);
  const [isNetworkError, setNetworkError] = useState<boolean>(false);
  const [data, setData] = useState<IOrganization[]>([]);

  const { isLoading, error } = usePromise(
    async () => {
      const data = await IOrganization.fetchOrganization(preferences.access_token ?? "");
      setData(data);
    },
    [],
    {
      onError: (error: Error) => {
        const e = error as any as { code: string };
        if (e.code === "ENOTFOUND") {
          setNetworkError(true);
        }
        const gitpodError = error as IOrganizationError;
        if (gitpodError.code === 401 || gitpodError.code === 500) {
          setIsUnauthorized(true);
        }
      },
    }
  );

  if (isUnauthorised || isNetworkError) {
    return <ErrorListView message={isUnauthorised ? errorMessage.invalidAccessToken : errorMessage.networkError} />;
  }

  return error ? (
    <Detail metadata={"Failed to Fetch Organization, Try Again"} />
  ) : (
    <Form
      navigationTitle="Select default organization"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values) => {
              await LocalStorage.setItem("default_organization", values["default_organization"]);
              const toast = await showToast({
                title: "Saving default organization",
                style: Toast.Style.Animated,
              });
              revalidate && (await revalidate());
              setTimeout(() => {
                toast.hide();
                pop();
              }, 2000);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="default_organization" placeholder="Select Default Organization" title="Default Organization">
        {data.length === 0 ? (
          <Form.Dropdown.Item title="Loading Organization" value="" />
        ) : (
          data?.map((org) => <Form.Dropdown.Item title={org.name} value={org.orgId} />)
        )}
      </Form.Dropdown>
    </Form>
  );
}
