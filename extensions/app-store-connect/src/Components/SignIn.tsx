import { ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import CredentialFields, { KeyType, validateIssuerID } from "./CredentialFields";
import { encodeBase64 } from "../Utils/base64";
import { fetchAppStoreConnect, ATCError, assertPrivateKeyUsable } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team, credentialLabel } from "../Model/useTeams";
import { FormValidation, useForm } from "@raycast/utils";

interface SignInProps {
  children: ReactNode;
  didSignIn: () => void;
}

interface SignInFormValues {
  privateKey: string[];
  apiKey: string;
  issuerID: string;
  name: string;
}

export default function SignIn({ children, didSignIn }: SignInProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  // Held outside useForm: the issuerID validator depends on it, and reading useForm's
  // own `values` inside its config is a circular reference.
  const [keyType, setKeyType] = useState<KeyType>("team");
  const isIndividualKey = keyType === "individual";
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

  const { handleSubmit, itemProps } = useForm<SignInFormValues>({
    onSubmit: async (values) => {
      const file = values.privateKey[0];
      if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
        return;
      }
      if (!values.apiKey || (!isIndividualKey && !values.issuerID)) {
        return;
      }

      setIsCheckConnection(true);

      const privateKeyContent = fs.readFileSync(file, "utf8");
      const encodedPrivateKey = encodeBase64(privateKeyContent);

      const team: Team = {
        name: credentialLabel(values.name, isIndividualKey, values.apiKey),
        issuerID: isIndividualKey ? undefined : values.issuerID,
        apiKey: values.apiKey,
        privateKey: encodedPrivateKey,
      };

      try {
        // Parse the key before persisting anything: an unusable key throws with no HTTP
        // status, and a fully-populated stored key set makes the extension consider
        // itself signed in on next launch — hiding this form behind a key that can
        // never sign a request.
        await assertPrivateKeyUsable(encodedPrivateKey);

        await addTeam(team);
        await selectCurrentTeam(team);
        await fetchAppStoreConnect("/apps");
        setIsAuthenticated(true);
        didSignIn();
      } catch (error) {
        // 401 only. removeCurrentTeam() deletes the persisted record, so a 429/5xx/
        // offline blip must not trigger it — and a 403 means the key is valid but
        // lacks permission for /apps, which discarding it would not fix.
        if (error instanceof ATCError && error.status === 401) {
          removeCurrentTeam();
        }
        presentError(error);
      } finally {
        setIsCheckConnection(false);
      }
    },
    validation: {
      // `name` is intentionally unvalidated — see credentialLabel().
      // Required for a team key, meaningless for an individual one.
      issuerID: (value) => validateIssuerID(value, isIndividualKey),
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
        <CredentialFields
          keyType={keyType}
          onKeyTypeChange={setKeyType}
          nameProps={itemProps.name}
          issuerIDProps={itemProps.issuerID}
          apiKeyProps={itemProps.apiKey}
          privateKeyProps={itemProps.privateKey}
        />
      </Form>
    );
  }
}
