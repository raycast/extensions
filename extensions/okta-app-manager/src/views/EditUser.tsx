import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getUser, updateUser } from "../api/users";

const FIELD_CONFIG: Record<string, string> = {
  login: "Username",
  firstName: "First name",
  lastName: "Last name",
  middleName: "Middle name",
  honorificPrefix: "Honorific prefix",
  honorificSuffix: "Honorific suffix",
  email: "Primary email",
  title: "Title",
  displayName: "Display name",
  nickName: "Nickname",
  profileUrl: "Profile Url",
  secondEmail: "Secondary email",
  mobilePhone: "Mobile phone",
  primaryPhone: "Primary phone",
  streetAddress: "Street address",
  city: "City",
  state: "State",
  zipCode: "Zip code",
  countryCode: "Country code",
  postalAddress: "Postal Address",
  preferredLanguage: "Preferred language",
  locale: "Locale",
  timezone: "Time zone",
  userType: "User type",
  employeeNumber: "Employee number",
  costCenter: "Cost center",
  organization: "Organization",
  division: "Division",
  department: "Department",
  managerId: "ManagerId",
  manager: "Manager",
};

export default function EditUser({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<Record<string, any>>({});
  const { pop } = useNavigation();

  useEffect(() => {
    async function load() {
      try {
        const user = await getUser(userId);
        setProfile(user.profile);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load user", message: e.message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  async function handleSubmit(values: Record<string, string>) {
    try {
      setLoading(true);
      await showToast({ style: Toast.Style.Animated, title: "Updating user..." });
      await updateUser(userId, values);
      await showToast({ style: Toast.Style.Success, title: "User updated" });
      pop();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Failed to update user", message: e.message });
    }
  }

  if (loading && Object.keys(profile).length === 0) {
    return <Form isLoading={true} />;
  }

  const sortedKeys = Object.keys(profile).sort((a, b) => {
    const keys = Object.keys(FIELD_CONFIG);
    const indexA = keys.indexOf(a);
    const indexB = keys.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {sortedKeys.map((key) => (
        <Form.TextField
          key={key}
          id={key}
          title={FIELD_CONFIG[key] || key}
          defaultValue={String(profile[key] || "")}
          placeholder={String(profile[key] || "")}
        />
      ))}
    </Form>
  );
}
