import { ha } from "@lib/common";
import { useEntityOverrides } from "@lib/entity-overrides";
import { createEntityQuicklink } from "@lib/entity-quicklink";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon, Toast, showToast } from "@raycast/api";
import React from "react";
import { HAOpenUrlInAction } from "./actions";
import { EntityAttributesList } from "./attributes";
import { EntityRenameForm } from "./entity/rename-form";

export function RenameEntityAction({ state }: { state: State }) {
  return (
    <Action.Push
      title="Rename Entity"
      target={<EntityRenameForm state={state} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
    />
  );
}

export function ResetCustomNameAction({ state }: { state: State }) {
  const { getAlias, clearAlias } = useEntityOverrides();
  const alias = getAlias(state.entity_id);
  if (!alias) {
    return null;
  }
  return (
    <Action
      title="Reset Custom Name"
      icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.PrimaryText }}
      onAction={async () => {
        clearAlias(state.entity_id);
        await showToast({ style: Toast.Style.Success, title: "Custom Name Removed" });
      }}
    />
  );
}

export function HideEntityAction({ state }: { state: State }) {
  const { hideEntity } = useEntityOverrides();
  return (
    <Action
      title="Hide Entity"
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      icon={{ source: Icon.EyeDisabled, tintColor: Color.PrimaryText }}
      onAction={async () => {
        hideEntity(state.entity_id);
        await showToast({ style: Toast.Style.Success, title: "Entity Hidden" });
      }}
    />
  );
}

export function ToggleFavoriteAction({ state }: { state: State }) {
  const { isFavorite, toggleFavorite } = useEntityOverrides();
  const favorite = isFavorite(state.entity_id);
  return (
    <Action
      title={favorite ? "Remove from Favorites" : "Add to Favorites"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      icon={{ source: favorite ? Icon.StarDisabled : Icon.Star, tintColor: Color.Yellow }}
      onAction={async () => {
        toggleFavorite(state.entity_id);
        await showToast({
          style: Toast.Style.Success,
          title: favorite ? "Removed from Favorites" : "Added to Favorites",
        });
      }}
    />
  );
}

export function SaveAsQuicklinkAction({ state }: { state: State }) {
  const { getAlias } = useEntityOverrides();
  const quicklink = createEntityQuicklink(state, getAlias(state.entity_id));
  return (
    <Action.CreateQuicklink
      title="Save as Quicklink"
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      quicklink={quicklink}
    />
  );
}

export function OpenEntityHistoryAction({ state }: { state: State }) {
  const historyUrl = ha.navigateUrl(`history?entity_id=${state.entity_id}`);
  return (
    <HAOpenUrlInAction
      action="Open History In"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
    />
  );
}

export function OpenEntityLogbookAction({ state }: { state: State }) {
  const historyUrl = ha.navigateUrl(`logbook?entity_id=${state.entity_id}`);
  return (
    <HAOpenUrlInAction
      action="Open Logbook In"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
    />
  );
}

export function ShowAttributesAction({ state }: { state: State }) {
  if (state.attributes) {
    return (
      <Action.Push
        title="Show Attributes"
        target={<EntityAttributesList state={state} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
  } else {
    return null;
  }
}

export function CopyStateValueAction({ state }: { state: State }) {
  return (
    <Action.CopyToClipboard
      title="Copy State Value"
      content={state.state}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
    />
  );
}

export function CopyEntityIDAction({ state }: { state: State }) {
  return (
    <Action.CopyToClipboard
      title="Copy Entity ID"
      content={state.entity_id}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
    />
  );
}

export function EntityStandardActionSections({ state: s }: { state: State }) {
  return (
    <React.Fragment>
      <ActionPanel.Section title="Customization">
        <ToggleFavoriteAction state={s} />
        <SaveAsQuicklinkAction state={s} />
        <RenameEntityAction state={s} />
        <ResetCustomNameAction state={s} />
        <HideEntityAction state={s} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Attributes">
        <ShowAttributesAction state={s} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Values">
        <CopyEntityIDAction state={s} />
        <CopyStateValueAction state={s} />
      </ActionPanel.Section>
      <ActionPanel.Section title="History">
        <OpenEntityHistoryAction state={s} />
        <OpenEntityLogbookAction state={s} />
      </ActionPanel.Section>
    </React.Fragment>
  );
}
