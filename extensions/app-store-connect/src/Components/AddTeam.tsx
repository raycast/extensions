import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team } from "../Model/useTeams";
import { useForm, FormValidation } from "@raycast/utils";
interface SignInProps {
  didSignIn: (team: Team) => void;
}

export default function AddTeam({ didSignIn }: SignInProps) {
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  const { selectCurrentTeam, addTeam, deleteTeam, currentTeam, teams } = useTeams();

  interface FormValues {
    privateKey: string[];
    apiKey: string;
    issuerID: string;
    name: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      privateKey: [],
      apiKey: "",
      issuerID: "",
      name: "",
    },
    onSubmit: async (values) => {
      const file = values.privateKey[0];
      if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
        return;
      }
      setIsCheckConnection(true);

      try {
        const privateKeyContent = fs.readFileSync(file, "utf8");
        const encodedPrivateKey = base64EncodePrivateKey(privateKeyContent);

        const team: Team = {
          name: values.name,
          issuerID: values.issuerID,
          apiKey: values.apiKey,
          privateKey: encodedPrivateKey,
        };

        await addTeam(team);
        await selectCurrentTeam(team);
        await fetchAppStoreConnect("/apps");
        didSignIn(team);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Added team",
        });
      } catch (error) {
        if (currentTeam) {
          await deleteTeam(currentTeam);
          if (teams.length > 0 && currentTeam.apiKey !== teams[teams.length - 1].apiKey) {
            selectCurrentTeam(teams[teams.length - 1]);
          }
        }
        presentError(error);
      } finally {
        setIsCheckConnection(false);
      }
    },
    validation: {
      privateKey: FormValidation.Required,
      apiKey: FormValidation.Required,
      issuerID: FormValidation.Required,
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api"
          text="Creating API Keys for App Store Connect API"
        />
      }
      isLoading={isCheckConnection}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Team" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Team Name"
        {...itemProps.name}
        info="Name of the team, this is only used for display purposes"
      />
      <Form.TextField {...itemProps.issuerID} title="Issuer ID" />
      <Form.TextField {...itemProps.apiKey} title="Key ID" />
      <Form.FilePicker {...itemProps.privateKey} title="Private Key" allowMultipleSelection={false} />
    </Form>
  );
}

function base64EncodePrivateKey(privateKey: string) {
  // Check if we're in a browser environment
  if (typeof btoa === "function") {
    return btoa(privateKey);
  }
  // For Node.js environment
  else if (typeof Buffer !== "undefined") {
    return Buffer.from(privateKey).toString("base64");
  } else {
    throw new Error("Unable to base64 encode: environment not supported");
  }
}
