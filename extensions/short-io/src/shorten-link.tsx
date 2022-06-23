import { Action, ActionPanel, Clipboard, Form, Icon, open, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { shortenLinkWithSlug } from "./utils/axios-utils";
import { alertDialog, getDefaultDomain } from "./hooks/hooks";
import { isEmpty } from "./utils/common-utils";
import Style = Toast.Style;
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";

export default function ShortenLink(props: { paraDomain?: string }) {
  const paraDomain = typeof props.paraDomain !== "undefined" ? props.paraDomain : "";

  const [originalLink, setOriginalLink] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [shortLink, setShortLink] = useState<string>("");

  const { defaultDomain, domainLoading } = getDefaultDomain(paraDomain);

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
                await showToast(Style.Failure, "Error.", "Please enter a link to shorten.");
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
      <Form.TextField id={"Original Link"} title={"Original Link"} value={originalLink} onChange={setOriginalLink} />
      <Form.TextField id={"Slug"} title={"Slug"} placeholder={"Optional"} value={slug} onChange={setSlug} />
      <Form.TextField id={"Title"} title={"Title"} placeholder={"Optional"} value={title} onChange={setTitle} />
      {!isEmpty(shortLink) && <Form.Description title={"Short Link"} text={shortLink} />}
    </Form>
  );
}
