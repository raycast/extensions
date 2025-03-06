import { Form, ActionPanel, Action, showHUD, Clipboard, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAliasOptions, createAlias, getMailboxes } from "./api/simplelogin_api";
import { Suffix, ParamNewAlias } from "./models/alias_options";
import { Mailboxes } from "./models/mailboxes";

export default function Command() {
  const [signedSuffixes, setSignedSuffixes] = useState<Suffix[] | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailboxes[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // validation
  const [prefixError, setPrefixError] = useState<string | undefined>();

  function dropAliasPrefixErrorIfNeeded() {
    if (prefixError && prefixError.length > 0) {
      setPrefixError(undefined);
    }
  }

  function handleSubmit(values: ParamNewAlias) {
    createAlias(values).then((result) => {
      if (result != null) {
        console.log(result.email);
        showHUD("Alias created and copied to clipboard");
        Clipboard.copy(result.email);
        popToRoot({ clearSearchBar: true });
      }
    });
  }

  useEffect(() => {
    const loadingIndicator = {
      options: false,
      mailboxes: false,
    };
    function fetchAliasOptions() {
      try {
        getAliasOptions().then((result) => {
          setSignedSuffixes(result.suffixes);
          loadingIndicator["options"] = true;
        });
      } catch (error) {
        console.log("error while loading");
      }
    }
    fetchAliasOptions();

    function fetchMailboxes() {
      try {
        getMailboxes().then((result) => {
          setMailboxes(result);
          loadingIndicator["options"] = true;
        });
      } catch (error) {
        console.log("error while loading");
      }
    }
    fetchMailboxes();
  }, []);

  useEffect(() => {
    if (signedSuffixes != null && mailboxes != null) {
      setIsLoading(false);
    }
  }, [signedSuffixes, mailboxes]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new SimpleLogin alias:" />
      <Form.TextField
        id="alias_prefix"
        title="Alias prefix"
        placeholder="Enter prefix"
        error={prefixError}
        onChange={dropAliasPrefixErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPrefixError("A prefix is required");
          } else {
            dropAliasPrefixErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="signed_suffix" title="Suffix">
        <>
          {signedSuffixes != null &&
            signedSuffixes.map((item) => (
              <Form.Dropdown.Item value={item.signed_suffix} title={item.suffix} key={item.signed_suffix} />
            ))}
        </>
      </Form.Dropdown>
      <Form.Dropdown id="mailbox_id" title="Mailbox">
        <>
          {mailboxes != null &&
            mailboxes.map((item) => (
              <Form.Dropdown.Item
                value={"" + item.id}
                title={item.email + " (" + item.nb_alias + " aliases)"}
                key={item.id}
              />
            ))}
        </>
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="alias_name" title="Display name (optional)" placeholder="Enter display name" />
      <Form.TextArea id="note" title="Description (optional)" placeholder="Enter description" />
    </Form>
  );
}
