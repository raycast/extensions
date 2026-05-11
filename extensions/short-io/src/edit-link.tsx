import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { UpdateShortLink } from "./utils/axios-utils";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import { ShortLink } from "./types/types";
import { MutatePromise } from "@raycast/utils";
import Style = Toast.Style;

export default function EditLink(props: { shortLink: ShortLink; mutate: MutatePromise<ShortLink[]> }) {
  const { shortLink, mutate } = props;
  const [slug, setSlug] = useState<string>(shortLink.path);
  const [title, setTitle] = useState<string>(isEmpty(shortLink.title) ? "" : shortLink.title + "");
  const [originalLink, setOriginalLink] = useState<string>(shortLink.originalURL);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={"Edit Link"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.TwoArrowsClockwise}
            title={"Update Link"}
            onAction={async () => {
              if (isEmpty(originalLink)) {
                await showToast(Style.Failure, "Error.", "Please enter a link to shorten.");
                return;
              }
              await showToast(Style.Animated, "Updating...");
              const updateResult = await UpdateShortLink(shortLink.idString, originalLink, slug, title);
              if (updateResult.success) {
                await mutate();
                pop();
                await showToast(Style.Success, "Success.", "Link updated.");
              } else {
                await showToast(Style.Failure, "Error.", updateResult.message);
              }
            }}
          />
          <ActionGoShortIo />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    >
      <Form.TextField id={"Original Link"} title={"Original Link"} value={originalLink} onChange={setOriginalLink} />
      <Form.TextField id={"Slug"} title={"Slug"} placeholder={"Optional"} value={slug} onChange={setSlug} />
      <Form.TextField id={"Title"} title={"Title"} placeholder={"Optional"} value={title} onChange={setTitle} />
    </Form>
  );
}
