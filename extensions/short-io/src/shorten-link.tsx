import { Action, ActionPanel, Clipboard, Form, Icon, open, showToast, Toast } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { shortenLinkWithSlug } from "./utils/axios-utils";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import { fetchLink } from "./utils/input-item";
import { authFetchLink } from "./types/preferences";
import { useDefaultDomain } from "./hooks/useDefaultDomain";
import { alertDialog } from "./components/alert-dialog";
import { Domain } from "./types/types";
import Style = Toast.Style;

export default function ShortenLink(props: { defaultDomain?: Domain }) {
  const { data: defaultDomainData, isLoading: domainLoading } = useDefaultDomain(props.defaultDomain);
  const defaultDomain = useMemo(() => {
    if (defaultDomainData) {
      return defaultDomainData.hostname;
    } else {
      return "";
    }
  }, [defaultDomainData]);

  const [originalLink, setOriginalLink] = useState<string>("");
  const [originalLinkError, setOriginalLinkError] = useState<string | undefined>();
  const [slug, setSlug] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [shortLink, setShortLink] = useState<string>("");

  useEffect(() => {
    async function _fetchPath() {
      if (authFetchLink) {
        setOriginalLink(await fetchLink());
      }
    }

    _fetchPath().then();
  }, []);

  return (
    <Form
      isLoading={domainLoading}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Link}
            title={"Shorten Link"}
            onAction={async () => {
              if (isEmpty(defaultDomain)) {
                await alertDialog(Icon.Globe, "No domain found.", "Please add a domain first.", "Add Domain", () => {
                  open("https://app.short.io/domains/connect").then();
                });
                return;
              }
              if (isEmpty(originalLink)) {
                setOriginalLinkError("The field should't be empty!");
                return;
              }
              await showToast(Style.Animated, "Shortening...");
              const _shortLink = await shortenLinkWithSlug(defaultDomain + "", originalLink, slug, title);
              if (_shortLink.success) {
                setShortLink(_shortLink.shortLink);
                await Clipboard.copy(_shortLink.shortLink);
                const option: Toast.Options = {
                  title: "Success",
                  message: "Link copied to clipboard.",
                  primaryAction: {
                    title: "Paste to Active App",
                    onAction: () => {
                      Clipboard.paste(_shortLink.shortLink);
                    },
                  },
                  secondaryAction: {
                    title: "Open in Browser",
                    onAction: () => {
                      open(_shortLink.shortLink);
                    },
                  },
                };
                await showToast(option);
              } else {
                await showToast(Style.Failure, "Error.", _shortLink.message);
              }
            }}
          />
          <ActionGoShortIo />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    >
      <Form.Description title={"Domain"} text={defaultDomain} />
      <Form.TextField
        id={"Original Link"}
        title={"Original Link"}
        value={originalLink}
        error={originalLinkError}
        onChange={(newValue) => {
          setOriginalLink(newValue);
          if (newValue.length > 0) {
            setOriginalLinkError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setOriginalLinkError("The field should't be empty!");
          } else {
            setOriginalLinkError(undefined);
          }
        }}
      />
      <Form.TextField id={"Slug"} title={"Slug"} placeholder={"Optional"} value={slug} onChange={setSlug} />
      <Form.TextField id={"Title"} title={"Title"} placeholder={"Optional"} value={title} onChange={setTitle} />
      {!isEmpty(shortLink) && <Form.Description title={"Short Link"} text={shortLink} />}
    </Form>
  );
}
