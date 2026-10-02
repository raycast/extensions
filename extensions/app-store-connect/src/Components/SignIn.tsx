import { ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import CredentialFields, { CredentialFormLinks, KeyType, validateIssuerID } from "./CredentialFields";
import { readPrivateKeyFile } from "../Utils/privateKeyFile";
import { CREATING_API_KEYS_DOCS_URL } from "../Utils/appStoreConnect";
import { fetchAppStoreConnect, ATCError, assertPrivateKeyUsable } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team } from "../Model/useTeams";
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
  const { isLoading: isLoadingTeams, currentTeam, selectCurrentTeam, deleteTeam, addTeam } = useTeams();

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
      if (!values.apiKey || (!isIndividualKey && !values.issuerID)) {
        return;
      }

      setIsCheckConnection(true);
      // Declared out here so the catch rolls back the exact key it added; stays undefined
      // if we failed before persisting anything.
      let addedTeam: Team | undefined;

      try {
        // Inside the try: reading the key file can fail (removed after picking, a
        // directory, no permission), and outside it that threw past `finally` — leaving
        // the form spinning forever with nothing said about why.
        const encodedPrivateKey = readPrivateKeyFile(values.privateKey[0]);

        const team: Team = {
          // Stored as typed, blank included: an unnamed key is shown by its Key ID.
          name: values.name.trim(),
          issuerID: isIndividualKey ? undefined : values.issuerID,
          apiKey: values.apiKey,
          privateKey: encodedPrivateKey,
        };

        // Parse the key before persisting anything: an unusable key throws with no HTTP
        // status, and a fully-populated stored key set makes the extension consider
        // itself signed in on next launch — hiding this form behind a key that can
        // never sign a request.
        await assertPrivateKeyUsable(encodedPrivateKey);

        addedTeam = team;
        await addTeam(team);
        await selectCurrentTeam(team);
        await fetchAppStoreConnect("/apps");
        setIsAuthenticated(true);
        didSignIn();
      } catch (error) {
        // Roll back the credential this form ADDED, not "whatever is currently selected":
        // removeCurrentTeam() reads the live selection, so anything that changed it while
        // the request was in flight would be deleted instead of the rejected key.
        //
        // 401 only. A 429/5xx/offline blip must not discard a credential, and a 403 means
        // the key is valid but lacks permission for /apps, which deleting it would not fix.
        if (error instanceof ATCError && error.status === 401 && addedTeam) {
          await deleteTeam(addedTeam);
        }
        presentError(error);
      } finally {
        setIsCheckConnection(false);
      }
    },
    validation: {
      // `name` is intentionally unvalidated — blank is valid; see keyDisplayName().
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
          <Form.LinkAccessory target={CREATING_API_KEYS_DOCS_URL} text="Creating API Keys for App Store Connect API" />
        }
        isLoading={isCheckConnection}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Sign In" onSubmit={handleSubmit} />
            <CredentialFormLinks />
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
