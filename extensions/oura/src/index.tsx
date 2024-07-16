import { List, openExtensionPreferences, Action, ActionPanel } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { convertHeight, convertWeight } from "./utils/measurement";
import Unauthorized from "./unauthorized";

interface UserResponse {
  isLoading: boolean;
  error: Error;
  data: {
    id: string;
    age: number;
    weight: number;
    height: number;
    biological_sex: string;
    email: string;
  };
}

export default function Command() {
  const personalInfo = oura("usercollection/personal_info") as UserResponse;

  if (personalInfo.error) {
    return <Unauthorized />;
  }

  return (
    <List isLoading={personalInfo.isLoading}>
      <List.Item title={`Age`} subtitle={`${personalInfo?.data?.age}`} />
      <List.Item
        title={`Weight`}
        subtitle={`${convertWeight(personalInfo?.data?.weight)}`}
        actions={
          <ActionPanel>
            <Action title="Change Unit of Measurement" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      <List.Item
        title={`Height`}
        subtitle={`${convertHeight(personalInfo?.data?.height)}`}
        actions={
          <ActionPanel>
            <Action title="Change Unit of Measurement" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      <List.Item title={`Email`} subtitle={`${personalInfo?.data?.email}`} />
    </List>
  );
}
