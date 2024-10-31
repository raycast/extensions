import { ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team } from "../Model/useTeams";
import { FormValidation, useForm } from "@raycast/utils";

interface SignInProps {
  children: ReactNode;
  didSignIn: () => void;
}

export default function SignIn({ children, didSignIn }: SignInProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  const { isLoading: isLoadingTeams, currentTeam, selectCurrentTeam, removeCurrentTeam, addTeam } = useTeams();

  useEffect(() => {
    (async () => {
      if (!isLoadingTeams) {
        if (currentTeam === undefined) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
          didSignIn();
        }
        setIsLoading(false);
      }
    })();
  }, [didSignIn, currentTeam, isLoadingTeams]);

  const { handleSubmit, itemProps } = useForm<{
    privateKey: string[];
    apiKey: string;
    issuerID: string;
    name: string;
  }>({
    onSubmit: async (values) => {
      const file = values.privateKey[0];
      if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
        return;
      }
      if (!values.apiKey || !values.issuerID) {
        return;
      }

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
        setIsAuthenticated(true);
        didSignIn();
      } catch (error) {
        removeCurrentTeam();
        presentError(error);
      } finally {
        setIsCheckConnection(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      issuerID: FormValidation.Required,
      apiKey: FormValidation.Required,
      privateKey: FormValidation.Required,
    },
  });

  if (isLoading) {
    return <Form></Form>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  } else {
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
            <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          title="Team name"
          {...itemProps.name}
          info="Name of the team, this is only used for display purposes"
        />
        <Form.TextField title="Issuer ID" {...itemProps.issuerID} />
        <Form.TextField title="API Key" {...itemProps.apiKey} />
        <Form.FilePicker title="Private Key" allowMultipleSelection={false} {...itemProps.privateKey} />
      </Form>
    );
  }
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
