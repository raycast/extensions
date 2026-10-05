import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import {
  CC_LICENSE_URL,
  GAFFIOT_CREDITS,
  GAFFIOT_HOME_URL,
  GAFFIOT_JSON_URL,
  GAFFIOT_SOURCE_URL,
  LEGAL_MARKDOWN,
} from "./legal";

/** Vue « Mentions légales » : texte intégral + métadonnées d'attribution. */
export function LegalView() {
  return (
    <Detail
      navigationTitle="Legal Notice — Gaffiot 2016"
      markdown={LEGAL_MARKDOWN}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Work" text={GAFFIOT_CREDITS.title} />
          <Detail.Metadata.Label title="Version" text={GAFFIOT_CREDITS.edition} />
          <Detail.Metadata.Label title="Copyright" text={GAFFIOT_CREDITS.copyright} />
          <Detail.Metadata.Label title="Authors" text={GAFFIOT_CREDITS.authors} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="License" text="CC BY-NC-ND 4.0" target={CC_LICENSE_URL} />
          <Detail.Metadata.Link title="Reference Resource" text="gerardgreco.free.fr" target={GAFFIOT_SOURCE_URL} />
          <Detail.Metadata.Link title="Source File (JSON)" text="digital-gaffiot-json" target={GAFFIOT_JSON_URL} />
          <Detail.Metadata.Label title="Source File Date" text={GAFFIOT_CREDITS.sourceDate} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Use">
            <Detail.Metadata.TagList.Item text="Personal" color="#7b1e2b" />
            <Detail.Metadata.TagList.Item text="Non-Commercial" color="#7b1e2b" />
            <Detail.Metadata.TagList.Item text="Unmodified Text" color="#7b1e2b" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Reference Resource" url={GAFFIOT_SOURCE_URL} />
          <Action.OpenInBrowser title="Open CC BY-NC-ND 4.0 License" icon={Icon.Document} url={CC_LICENSE_URL} />
          <Action.OpenInBrowser title="Open Gaffiot 2016 Website" icon={Icon.Globe} url={GAFFIOT_HOME_URL} />
          <Action.CopyToClipboard title="Copy Legal Notice" content={LEGAL_MARKDOWN} />
        </ActionPanel>
      }
    />
  );
}

/** Action réutilisable qui pousse la vue des mentions légales. */
export function LegalAction() {
  return (
    <Action.Push
      title="Legal Notice (Gaffiot 2016)"
      icon={Icon.Info}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      target={<LegalView />}
    />
  );
}
