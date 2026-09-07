import { Action, ActionPanel, Icon, type Image } from "@raycast/api";
import { Fragment } from "react";
import { getActionDefinition } from "./actions";
import { ReferenceAction, ReferenceField } from "./model";

export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function displayValue(field: ReferenceField): string {
  return field.sensitive ? "••••••••" : field.effectiveValue;
}

export function iconForAction(action: ReferenceAction): Image.ImageLike {
  return getActionDefinition(action.kind)?.icon ?? Icon.QuestionMark;
}

export function FieldActions({ field }: { field: ReferenceField }) {
  const noun = field.sensitive ? "Secret" : "Value";
  return (
    <ActionPanel title={titleCase(field.label)}>
      {field.actions.map((action, index) => (
        <Fragment key={`${action.kind}-${index}`}>
          {getActionDefinition(action.kind)?.render(action.target)}
        </Fragment>
      ))}
      <Action.CopyToClipboard
        title={`Copy ${noun}`}
        content={field.effectiveValue}
        icon={field.sensitive ? Icon.Lock : Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.Paste title={`Paste ${noun}`} content={field.effectiveValue} icon={Icon.Clipboard} />
    </ActionPanel>
  );
}
