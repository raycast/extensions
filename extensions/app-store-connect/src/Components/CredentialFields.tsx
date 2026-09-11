import { Action, Form, Icon } from "@raycast/api";
import { Fragment } from "react";
import { API_KEYS_URL, USERS_AND_ACCESS_URL } from "../Utils/appStoreConnect";

export type KeyType = "team" | "individual";

const KEY_TYPE_INFO =
  "Team keys are created under Users and Access and carry an Issuer ID. An individual key " +
  "is generated from your own user profile, is scoped to your permissions, never expires, " +
  "and has no Issuer ID.";

/**
 * Validator for the Issuer ID field — required for a team key, meaningless for an
 * individual one, which has none.
 *
 * Lives here so both credential forms cannot disagree about when it applies.
 */
export function validateIssuerID(value: string | undefined, isIndividualKey: boolean): string | undefined {
  return !isIndividualKey && !value ? "The item is required" : undefined;
}

interface CredentialFieldsProps {
  keyType: KeyType;
  onKeyTypeChange: (keyType: KeyType) => void;
  /** Spread from useForm's itemProps — the two forms declare their own field shapes. */
  nameProps: Partial<Form.ItemProps<string>> & { id: string };
  issuerIDProps: Partial<Form.ItemProps<string>> & { id: string };
  apiKeyProps: Partial<Form.ItemProps<string>> & { id: string };
  privateKeyProps: Partial<Form.ItemProps<string[]>> & { id: string };
}

/**
 * The App Store Connect credential fields, shared by the first-run sign-in form and the
 * add-another-key form.
 *
 * Both forms render exactly these fields in exactly this order; keeping two copies meant
 * an edit to one — the info copy, the conditional Issuer ID, the Key ID label — silently
 * left the other disagreeing.
 */
export default function CredentialFields({
  keyType,
  onKeyTypeChange,
  nameProps,
  issuerIDProps,
  apiKeyProps,
  privateKeyProps,
}: CredentialFieldsProps) {
  const isIndividualKey = keyType === "individual";

  return (
    <Fragment>
      <Form.Dropdown
        id="keyType"
        title="Key Type"
        value={keyType}
        onChange={(value) => onKeyTypeChange(value as KeyType)}
        info={KEY_TYPE_INFO}
      >
        <Form.Dropdown.Item value="team" title="Team Key" icon={Icon.TwoPeople} />
        <Form.Dropdown.Item value="individual" title="Individual Key" icon={Icon.Person} />
      </Form.Dropdown>
      <Form.TextField
        title={isIndividualKey ? "Key Name" : "Team Name"}
        placeholder="Optional"
        {...nameProps}
        info="A label for this credential in Raycast only — it is never sent to Apple. Leave blank to name it after the key ID."
      />
      {!isIndividualKey && <Form.TextField title="Issuer ID" {...issuerIDProps} />}
      <Form.TextField title="Key ID" {...apiKeyProps} info="The Key ID shown next to the key in App Store Connect." />
      <Form.FilePicker title="Private Key" allowMultipleSelection={false} {...privateKeyProps} />
    </Fragment>
  );
}

/**
 * The links both credential forms offer.
 *
 * The docs link explains what a key IS; these two go to the pages where you actually get
 * one, which is the thing you need while this form is on screen. Shared so the two forms
 * cannot drift apart — the same reason the fields themselves live here.
 */
export function CredentialFormLinks() {
  return (
    <Fragment>
      <Action.OpenInBrowser title="Open API Keys" icon={Icon.Key} url={API_KEYS_URL} />
      <Action.OpenInBrowser title="Open Users and Access" icon={Icon.TwoPeople} url={USERS_AND_ACCESS_URL} />
    </Fragment>
  );
}
