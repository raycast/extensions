import { ActionPanel, Form, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import CredentialFields, { CredentialFormLinks, KeyType, validateIssuerID } from "./CredentialFields";
import { readPrivateKeyFile } from "../Utils/privateKeyFile";
import { CREATING_API_KEYS_DOCS_URL } from "../Utils/appStoreConnect";
import { fetchAppStoreConnect, ATCError, assertPrivateKeyUsable } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { useTeams, Team, keyDisplayName } from "../Model/useTeams";
import { useForm, FormValidation } from "@raycast/utils";
interface SignInProps {
  didSignIn: (team: Team) => void;
}

export default function AddTeam({ didSignIn }: SignInProps) {
  const { pop } = useNavigation();
  const [isCheckConnection, setIsCheckConnection] = useState(false);
  const { selectCurrentTeam, addTeam, deleteTeam, currentTeam, hasStoredTeam } = useTeams();
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
      setIsCheckConnection(true);
      // Captured before selecting the new key, so a rollback can restore it.
      const previouslySelectedTeam = currentTeam;
      // Declared out here so the catch can roll back the exact key it added; it stays
      // undefined if we failed before persisting anything.
      let addedTeam: Team | undefined;

      try {
        // A bad path used to return silently before the try, so submitting did nothing
        // and said nothing; readPrivateKeyFile throws and the catch below reports it.
        const encodedPrivateKey = readPrivateKeyFile(values.privateKey[0]);

        const team: Team = {
          // Stored as typed, blank included: an unnamed key is shown by its Key ID.
          name: values.name.trim(),
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
        // Back to the key list, which now shows this key selected. Staying on a
        // filled-in form after a success leaves nothing obvious to do next.
        pop();
        showToast({
          style: Toast.Style.Success,
          title: "Key Added",
          message: keyDisplayName(team),
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
          // `previouslySelectedTeam` is a render-time snapshot, so it may have been
          // deleted by another command while this request was in flight. Re-select it
          // only if it is still there; deleteTeam has already repaired the selection
          // otherwise.
          if (previouslySelectedTeam && (await hasStoredTeam(previouslySelectedTeam))) {
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
      // `name` is intentionally unvalidated — blank is valid; see keyDisplayName().
    },
  });
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory target={CREATING_API_KEYS_DOCS_URL} text="Creating API Keys for App Store Connect API" />
      }
      isLoading={isCheckConnection}
      actions={
        <ActionPanel>
          {/* "Add Key", not "Add Team": this form takes an individual key too, which
              belongs to a person rather than a team. */}
          <Action.SubmitForm title="Add Key" onSubmit={handleSubmit} />
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
