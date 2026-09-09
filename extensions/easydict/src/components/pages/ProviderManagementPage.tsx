/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { Fragment, useState } from "react";

import { createProfileFromLegacySettings, LEGACY_AI_PROVIDER_NAMES } from "@/ai-providers/legacy";
import { getLegacyAIProviderConfiguration } from "@/ai-providers/legacyConfiguration";
import { getDefaultRaycastAIModel } from "@/ai-providers/modelCatalog";
import { OPENAI_COMPATIBLE_PRESETS, type OpenAICompatiblePresetName } from "@/ai-providers/presets";
import { createEmptyAIProviderState } from "@/ai-providers/repository";
import { isAIProviderProfileRunnable } from "@/ai-providers/runtime";
import type {
  AIProviderProfile,
  LegacyAIProviderName,
  OpenAICompatibleProfile,
  RaycastAIProfile,
} from "@/ai-providers/types";
import { getProviderIcon, getQueryTypeIcon } from "@/components/ui/Icons";
import { myPreferences } from "@/consts";
import {
  getAIProviderKey,
  moveProviderInOrder,
  reconcileProviderOrder,
  syncAIProviderOrders,
} from "@/core/query/providerOrder";
import type { useAIProviderProfiles } from "@/hooks/useAIProviderProfiles";
import {
  type BuiltinProviderService,
  builtinProviderServices,
  getCombinedAvailableProviderKeys,
  getCombinedProviderOrder,
} from "@/providers/registry";

import { AIProviderForm } from "./AIProviderForm";

type AIProvidersController = ReturnType<typeof useAIProviderProfiles>;

type ProviderRow = { kind: "builtin"; service: BuiltinProviderService } | { kind: "ai"; profile: AIProviderProfile };

export default function ProviderManagementPage({ controller }: { controller: AIProvidersController }) {
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>();
  const profiles = controller.profiles ?? [];
  const legacyConfiguration = getLegacyAIProviderConfiguration();
  const legacySources = LEGACY_AI_PROVIDER_NAMES.filter((provider) => legacyConfiguration[provider].apiKey);
  const servicesOrder = myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [];
  const providerOrder = getCombinedProviderOrder(profiles, controller.storedState?.providerOrder, servicesOrder);
  const builtinServices: ProviderRow[] = builtinProviderServices.map((service) => ({ kind: "builtin", service }));
  const rows: ProviderRow[] = [
    ...builtinServices,
    ...profiles.map((profile) => ({ kind: "ai" as const, profile })),
  ].sort((left, right) => {
    const leftKey = left.kind === "ai" ? getAIProviderKey(left.profile) : left.service.providerKey;
    const rightKey = right.kind === "ai" ? getAIProviderKey(right.profile) : right.service.providerKey;
    return providerOrder.indexOf(leftKey) - providerOrder.indexOf(rightKey);
  });
  const visibleProviderKeys = rows.map((row) =>
    row.kind === "ai" ? getAIProviderKey(row.profile) : row.service.providerKey,
  );
  async function saveProfiles(
    updateProfiles: (profiles: AIProviderProfile[]) => AIProviderProfile[],
    updateOrder?: (profiles: AIProviderProfile[], savedOrder: string[] | undefined) => string[] | undefined,
  ) {
    const nextState = await controller.update((storedState) => {
      const nextProfiles = updateProfiles(storedState.profiles);
      const currentOrder = updateOrder?.(nextProfiles, storedState.providerOrder) ?? storedState.providerOrder;
      const fallbackOrder = getCombinedProviderOrder(nextProfiles, undefined, servicesOrder);
      const previousFallbackOrder = getCombinedProviderOrder(storedState.profiles, undefined, servicesOrder);
      const previousKeys = new Set(getCombinedAvailableProviderKeys(storedState.profiles));
      const appendNewKeys = fallbackOrder.filter((key) => !previousKeys.has(key));
      const nextProviderOrder = reconcileProviderOrder(
        currentOrder,
        getCombinedAvailableProviderKeys(nextProfiles),
        currentOrder ? fallbackOrder : [...previousFallbackOrder, ...appendNewKeys],
      );
      return {
        ...storedState,
        profiles: syncAIProviderOrders(nextProfiles, nextProviderOrder),
        providerOrder: nextProviderOrder,
      };
    });
    if (nextState.profiles.filter((profile) => profile.adapter === "raycast-ai" && profile.enabled).length > 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Multiple Raycast AI providers enabled",
        message: "Extension AI requests are rate-limited; rapid queries may fail.",
      });
    }
  }

  function addAction(
    title: string,
    profile: AIProviderProfile,
    icon = Icon.Plus,
    showPresetSelector = false,
    description?: string,
  ) {
    return (
      <Action.Push
        title={title}
        icon={icon}
        target={
          <AIProviderForm
            profile={profile}
            isNewProvider
            showPresetSelector={showPresetSelector}
            description={description}
            onSave={(saved) => saveProfiles((currentProfiles) => [...currentProfiles, saved])}
          />
        }
      />
    );
  }

  if (controller.isLoading) return <List isLoading searchBarPlaceholder="Loading providers..." />;

  if (!controller.storedState) {
    const message = getConfigurationErrorMessage(controller);
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="AI Provider Configuration Error"
          description={message}
          actions={
            <ActionPanel>
              <Action
                title="Retry Loading Configuration"
                icon={Icon.RotateClockwise}
                onAction={controller.revalidate}
              />
              <Action
                title="Reset AI Provider Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Reset AI provider configuration?",
                    message: "This permanently removes all saved dynamic providers and API keys.",
                    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                  });
                  if (confirmed) {
                    await controller.update(() => ({
                      ...createEmptyAIProviderState(),
                      migratedLegacyProviders: [...LEGACY_AI_PROVIDER_NAMES],
                    }));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function moveProvider(providerKey: string, offset: -1 | 1) {
    setSelectedProviderKey(providerKey);
    await saveProfiles(
      (currentProfiles) => currentProfiles,
      (currentProfiles, savedOrder) => {
        const currentOrder = getCombinedProviderOrder(currentProfiles, savedOrder, servicesOrder);
        return moveProviderInOrder(currentOrder, providerKey, offset);
      },
    );
    setSelectedProviderKey(providerKey);
  }

  function moveActions(providerKey: string) {
    const index = visibleProviderKeys.indexOf(providerKey);
    return (
      <>
        {index > 0 && (
          <Action
            title="Move up"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => moveProvider(providerKey, -1)}
          />
        )}
        {index < visibleProviderKeys.length - 1 && (
          <Action
            title="Move Down"
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => moveProvider(providerKey, 1)}
          />
        )}
      </>
    );
  }

  function addProviderSection() {
    return (
      <ActionPanel.Section title="Add Provider">
        {addAction("Add OpenAI-Compatible Provider", createOpenAIProfile("custom", profiles.length), Icon.Plus, true)}
        {addAction("Add Raycast AI Provider", createRaycastAIProfile(profiles.length), Icon.RaycastLogoNeg)}
        {legacySources.map((provider) => (
          <Fragment key={provider}>
            {addAction(
              `Add from Legacy ${getLegacyProviderTitle(provider)} Settings…`,
              { ...createProfileFromLegacySettings(provider, legacyConfiguration, profiles.length), enabled: false },
              Icon.Download,
              false,
              "Copied from legacy Extension Settings. This creates a separate provider, initially disabled. Enable it in Manage Providers after saving. Editing or deleting it does not change the old settings.",
            )}
          </Fragment>
        ))}
      </ActionPanel.Section>
    );
  }

  return (
    <List
      isLoading={controller.isLoading}
      searchBarPlaceholder="Search providers..."
      selectedItemId={selectedProviderKey}
      onSelectionChange={(id) => setSelectedProviderKey(id ?? undefined)}
    >
      {profiles.length === 0 && (
        <List.Item
          key="provider-actions"
          id="provider-actions"
          icon={Icon.Plus}
          title="Add Providers"
          subtitle="Create an AI provider for translation or dictionary entries"
          actions={<ActionPanel>{addProviderSection()}</ActionPanel>}
        />
      )}
      {rows.map((row) => {
        if (row.kind === "builtin") {
          const { service } = row;
          return (
            <List.Item
              key={service.providerKey}
              id={service.providerKey}
              icon={getQueryTypeIcon(service.type)}
              title={service.label}
              accessories={[{ tag: "Built-in" }, { tag: getBuiltinPreferenceStatusTag(service) }]}
              actions={
                <ActionPanel>
                  <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  {moveActions(service.providerKey)}
                  {addProviderSection()}
                </ActionPanel>
              }
            />
          );
        }

        const { profile } = row;
        const runnable = isAIProviderProfileRunnable(profile);
        const providerKey = getAIProviderKey(profile);
        return (
          <List.Item
            key={providerKey}
            id={providerKey}
            icon={getProviderIcon(profile.icon, profile.name)}
            title={profile.name}
            subtitle={`${profile.adapter === "raycast-ai" ? "Raycast AI" : "OpenAI-Compatible"} · ${profile.model}`}
            accessories={getAIProviderAccessories(profile, runnable)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Provider"
                  icon={Icon.Pencil}
                  target={
                    <AIProviderForm
                      profile={profile}
                      onSave={(saved) =>
                        saveProfiles((currentProfiles) =>
                          currentProfiles.map((candidate) => (candidate.id === saved.id ? saved : candidate)),
                        )
                      }
                    />
                  }
                />
                <Action
                  title={profile.enabled ? "Disable Provider" : "Enable Provider"}
                  icon={profile.enabled ? Icon.Pause : Icon.Play}
                  onAction={() =>
                    saveProfiles((currentProfiles) =>
                      currentProfiles.map((candidate) =>
                        candidate.id === profile.id ? { ...candidate, enabled: !candidate.enabled } : candidate,
                      ),
                    )
                  }
                />
                <Action
                  title="Duplicate Provider"
                  icon={Icon.Duplicate}
                  onAction={() =>
                    saveProfiles((currentProfiles) => [
                      ...currentProfiles,
                      { ...profile, id: randomUUID(), name: `${profile.name} Copy`, enabled: false },
                    ])
                  }
                />
                {moveActions(providerKey)}
                <Action
                  title="Delete Provider"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete ${profile.name}?`,
                      message:
                        "This removes the saved provider and its API key. It will not be imported again automatically.",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (confirmed) {
                      setSelectedProviderKey(undefined);
                      await saveProfiles((currentProfiles) =>
                        currentProfiles.filter((candidate) => candidate.id !== profile.id),
                      );
                    }
                  }}
                />
                {addProviderSection()}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getAIProviderStatusTag(profile: AIProviderProfile, runnable: boolean) {
  if (!runnable) return { value: "Invalid", color: Color.Red };
  return profile.enabled ? { value: "Enabled", color: Color.Green } : { value: "Disabled", color: Color.SecondaryText };
}

function getAIProviderAccessories(profile: AIProviderProfile, runnable: boolean) {
  return [{ tag: "AI Provider" }, { tag: getAIProviderStatusTag(profile, runnable) }];
}

function getBuiltinPreferenceStatusTag(service: BuiltinProviderService) {
  const indirectlyEnabledBy = "implicitlyEnabledBy" in service ? service.implicitlyEnabledBy : undefined;
  if (!service.enabledInPreferences && indirectlyEnabledBy) {
    return { value: `Enabled via ${indirectlyEnabledBy}`, color: Color.Green };
  }
  return service.enabledInPreferences
    ? { value: "Enabled", color: Color.Green }
    : { value: "Disabled", color: Color.SecondaryText };
}

function getConfigurationErrorMessage(controller: AIProvidersController): string {
  switch (controller.state.kind) {
    case "invalid":
      return controller.state.message;
    case "unsupported":
      return `Unsupported configuration version: ${String(controller.state.version)}`;
    case "error":
      return controller.state.error.message;
    default:
      return "The provider configuration could not be loaded.";
  }
}

function createOpenAIProfile(presetName: OpenAICompatiblePresetName, order: number): OpenAICompatibleProfile {
  const preset = OPENAI_COMPATIBLE_PRESETS[presetName];
  return {
    id: randomUUID(),
    adapter: "openai-compatible",
    enabled: true,
    order,
    apiKey: "",
    wordResultMode: "translation",
    ...preset,
  };
}

function createRaycastAIProfile(order: number): RaycastAIProfile {
  return {
    id: randomUUID(),
    adapter: "raycast-ai",
    name: "Raycast AI",
    enabled: false,
    order,
    model: getDefaultRaycastAIModel(),
    icon: { kind: "preset", name: "raycast" },
    wordResultMode: "translation",
  };
}

function getLegacyProviderTitle(provider: LegacyAIProviderName): string {
  return provider === "openai" ? "OpenAI" : "Gemini";
}
