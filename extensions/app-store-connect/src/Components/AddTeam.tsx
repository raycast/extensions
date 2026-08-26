import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import CredentialFields, { KeyType, validateIssuerID } from "./CredentialFields";
import { encodeBase64 } from "../Utils/base64";
import { fetchAppStoreConnect, ATCError, assertPrivateKeyUsable } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team, credentialLabel } from "../Model/useTeams";
import { useForm, FormValidation } from "@raycast/utils";
interface SignInProps {
  didSignIn: (team: Team) => void;
}

export default function AddTeam({ didSignIn }: SignInProps) {
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  const { selectCurrentTeam, addTeam, deleteTeam, currentTeam } = useTeams();
  // Held outside useForm: the issuerID validator depends on it, and reading useForm's
  // own `values` inside its config is a circular reference.
  const [keyType, setKeyType] = useState<KeyType>("team");
  const isIndividualKey = keyType === "individual";

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
      // Captured before selecting the new key, so a rollback can restore it.
      const previouslySelectedTeam = currentTeam;
      // Declared out here so the catch can roll back the exact key it added; it stays
      // undefined if we failed before persisting anything.
      let addedTeam: Team | undefined;

      try {
        const privateKeyContent = fs.readFileSync(file, "utf8");
        const encodedPrivateKey = encodeBase64(privateKeyContent);

        const team: Team = {
          name: credentialLabel(values.name, isIndividualKey, values.apiKey),
          issuerID: isIndividualKey ? undefined : values.issuerID,
          apiKey: values.apiKey,
          privateKey: encodedPrivateKey,
        };

        // Parse the key before persisting anything: an unusable key then fails with
        // nothing stored to roll back.
        await assertPrivateKeyUsable(encodedPrivateKey);

        addedTeam = team;
        await addTeam(team);
        await selectCurrentTeam(team);
        await fetchAppStoreConnect("/apps");
        didSignIn(team);
        showToast({
          style: Toast.Style.Success,
          title: "Key Added",
          message: team.name,
        });
      } catch (error) {
        // Roll back only the key just added, identified directly — `currentTeam` is the
        // render-time value, i.e. the PREVIOUSLY selected key, so deleting it would
        // discard a working credential and leave the rejected one selected.
        //
        // 401 only: a 403 means the key is valid but lacks permission for /apps, and
        // discarding a valid key over a role restriction is not recoverable by the user.
        const rejected = error instanceof ATCError && error.status === 401;
        if (rejected && addedTeam) {
          await deleteTeam(addedTeam);
          if (previouslySelectedTeam) {
            await selectCurrentTeam(previouslySelectedTeam);
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
      // Required for a team key, meaningless for an individual one.
      issuerID: (value) => validateIssuerID(value, isIndividualKey),
      // `name` is intentionally unvalidated — see credentialLabel().
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
