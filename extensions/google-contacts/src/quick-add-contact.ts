import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { withAccessToken, getAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import { createContact, searchContacts } from "./api";

async function quickAddContact(props: LaunchProps<{ arguments: Arguments.QuickAddContact }>) {
  const { firstName, lastName, email } = props.arguments;
  const { token } = getAccessToken();

  try {
    // Check for duplicates
    const existing = await searchContacts(token, `${firstName} ${lastName}`);
    const isDuplicate = existing.some(
      (p) =>
        p.names?.[0]?.givenName?.toLowerCase() === firstName.toLowerCase() &&
        p.names?.[0]?.familyName?.toLowerCase() === lastName.toLowerCase(),
    );

    const person = {
      names: [{ givenName: firstName, familyName: lastName }],
      ...(email ? { emailAddresses: [{ value: email }] } : {}),
    };

    await createContact(token, person);

    if (isDuplicate) {
      await showToast({
        style: Toast.Style.Success,
        title: `Added ${firstName} ${lastName}`,
        message: "Note: a contact with this name already exists",
      });
    } else {
      await showHUD(`Added ${firstName} ${lastName}`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add contact",
      message: String(error),
    });
  }
}

export default withAccessToken(google())(quickAddContact);
