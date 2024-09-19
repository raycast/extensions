import { ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team } from "../Model/useTeams";

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

  if (isLoading) {
    return <Form></Form>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  } else {
    return (
      <Form
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
                    setIsAuthenticated(true);
                    didSignIn();
                  } catch (error) {
                    removeCurrentTeam();
                    presentError(error);
                  }
                  setIsCheckConnection(false);
                  setIsLoading(false);
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
        <Form.TextField id="apiKey" placeholder="API Key" />
        <Form.FilePicker id="privateKey" title="Private key" allowMultipleSelection={false} />
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
