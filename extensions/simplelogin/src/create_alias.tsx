import { Form, ActionPanel, Action, showHUD, Clipboard, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import getActiveSite from "./utils/browser";
import { getAliasOptions, createAlias, getMailboxes } from "./api/simplelogin_api";
import { Suffix, ParamNewAlias } from "./models/alias_options";
import { Mailboxes } from "./models/mailboxes";

export default function Command() {
  const [signedSuffixes, setSignedSuffixes] = useState<Suffix[] | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailboxes[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // prefix state (controlled) - will be populated from active browser tab when possible
  const [prefix, setPrefix] = useState<string>("");

  // validation
  const [prefixError, setPrefixError] = useState<string | undefined>();

  function dropAliasPrefixErrorIfNeeded() {
    if (prefixError && prefixError.length > 0) {
      setPrefixError(undefined);
    }
  }

  function handleSubmit(values: ParamNewAlias) {
    // Ensure we use the controlled prefix state when the form payload doesn't include it
    const payload: ParamNewAlias = {
      ...values,
      alias_prefix: values.alias_prefix && values.alias_prefix.length > 0 ? values.alias_prefix : prefix,
    } as ParamNewAlias;

    createAlias(payload).then((result) => {
      if (result != null) {
        console.log(result.email);
        showHUD("Alias created and copied to clipboard");
        Clipboard.copy(result.email);
        popToRoot({ clearSearchBar: true });
      }
    });
  }

  useEffect(() => {
    function fetchAliasOptions() {
      try {
        getAliasOptions().then((result) => {
          setSignedSuffixes(result.suffixes);
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

  // attempt to populate prefix from the active browser tab (macOS only - Windows lacks reliable extraction)
  useEffect(() => {
    // Only attempt prefill on macOS where AppleScript provides reliable browser access
    if (process.platform !== "darwin") {
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const host = await getActiveSite();
        if (!mounted || !host) return;
        // Optional: derive a nice prefix from hostname by stripping leading www.
        const cleaned = host.replace(/^www\./i, "");
        // For now store the full hostname (example.com). If you prefer just the left-most label use split('.')[0]
        setPrefix(cleaned);
        console.debug("Prefilled alias prefix from browser host:", cleaned);
      } catch (error) {
        console.error("Failed to read active site for prefix prefill", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
        value={prefix}
        error={prefixError}
        onChange={(value) => {
          dropAliasPrefixErrorIfNeeded();
          setPrefix(value);
        }}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
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
