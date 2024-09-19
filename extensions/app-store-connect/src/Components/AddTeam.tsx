import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team } from "../Model/useTeams";

interface SignInProps {
  didSignIn: (team: Team) => void;
}

export default function AddTeam({ didSignIn }: SignInProps) {
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  const { selectCurrentTeam, addTeam } = useTeams();

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
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values: { privateKey: string[]; apiKey: string; issuerID: string; name: string }) => {
              const file = values.privateKey[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              if (values.apiKey === undefined) {
                return false;
              }
              if (values.issuerID === undefined) {
                return false;
              }
              (async () => {
                setIsCheckConnection(true);

                const privateKeyContent = fs.readFileSync(file, "utf8");

                const encodedPrivateKey = base64EncodePrivateKey(privateKeyContent);

                const team: Team = {
                  name: values.name,
                  issuerID: values.issuerID,
                  apiKey: values.apiKey,
                  privateKey: encodedPrivateKey,
                };

                try {
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
                  presentError(error);
                }
                setIsCheckConnection(false);
              })();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        placeholder="Team name"
        info="Name of the team, this is only used for display purposes"
      />
      <Form.TextField id="issuerID" placeholder="Issuer ID" />
      <Form.TextField id="apiKey" placeholder="Key ID" />
      <Form.FilePicker id="privateKey" title="Private key" allowMultipleSelection={false} />
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
