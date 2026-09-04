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
import { useState } from "react";

import {
  getEffectiveLegacyAIProviderAssignment,
  getImportableLegacyAIProviderNames,
  getLegacyAIProviderReplacement,
  importLegacyAIProviders,
  LEGACY_AI_PROVIDER_NAMES,
  normalizeLegacyAIProviderAssignments,
} from "@/ai-providers/legacy";
import {
  getLegacyAIProviderConfiguration,
  getLegacyAIProviderName,
  isLegacyAIProviderAvailable,
  isLegacyAIProviderConfigured,
} from "@/ai-providers/legacyConfiguration";
import { getDefaultRaycastAIModel } from "@/ai-providers/modelCatalog";
import { OPENAI_COMPATIBLE_PRESETS, type OpenAICompatiblePresetName } from "@/ai-providers/presets";
import { createEmptyAIProviderState } from "@/ai-providers/repository";
import { isAIProviderProfileRunnable } from "@/ai-providers/runtime";
import type {
  AIProviderProfile,
  LegacyAIProviderName,
  OpenAICompatibleProfile,
  RaycastAIProfile,
  StoredAIProviderStateV1,
} from "@/ai-providers/types";
import { getProviderIcon, getQueryTypeIcon } from "@/components/ui/Icons";
import { myPreferences } from "@/consts";
import {
  getAIProviderKey,
  reconcileAIProviderReplacementOrder,
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

import { AIProviderForm, type LegacyReplacementOption } from "./AIProviderForm";

type AIProvidersController = ReturnType<typeof useAIProviderProfiles>;
type SaveProfilesOptions = Pick<StoredAIProviderStateV1, "providerOrder" | "legacyProviderAssignments">;

type ProviderRow =
  | { kind: "builtin"; service: BuiltinProviderService }
  | { kind: "legacy"; service: BuiltinProviderService; provider: LegacyAIProviderName }
  | { kind: "ai"; profile: AIProviderProfile };

export default function ProviderManagementPage({ controller }: { controller: AIProvidersController }) {
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>();
  const profiles = controller.profiles ?? [];
  const legacyConfiguration = getLegacyAIProviderConfiguration();
  const assignments = controller.storedState?.legacyProviderAssignments;
  const importableLegacyProviders = controller.storedState
    ? getImportableLegacyAIProviderNames(controller.storedState, legacyConfiguration)
    : [];
  const restorableLegacyProviders = LEGACY_AI_PROVIDER_NAMES.filter(
    (provider) =>
      isLegacyAIProviderConfigured(provider, legacyConfiguration) &&
      getEffectiveLegacyAIProviderAssignment(provider, profiles, assignments)?.kind === "retired",
  );

  const servicesOrder = myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [];
  const providerOrder = getCombinedProviderOrder(
    profiles,
    controller.storedState?.providerOrder,
    servicesOrder,
    assignments,
  );
  const builtinServices = builtinProviderServices.flatMap((service): ProviderRow[] => {
    const legacyProvider = getLegacyAIProviderName(service.type);
    if (!legacyProvider) return [{ kind: "builtin", service }];
    if (!isLegacyAIProviderAvailable(legacyProvider, profiles, assignments, legacyConfiguration)) return [];
    return [{ kind: "legacy", service, provider: legacyProvider }];
  });
  const rows: ProviderRow[] = [
    ...builtinServices,
    ...profiles.map((profile) => ({ kind: "ai" as const, profile })),
  ].sort((left, right) => {
    const leftKey = left.kind === "ai" ? getAIProviderKey(left.profile, assignments) : left.service.providerKey;
    const rightKey = right.kind === "ai" ? getAIProviderKey(right.profile, assignments) : right.service.providerKey;
    return providerOrder.indexOf(leftKey) - providerOrder.indexOf(rightKey);
  });
  const visibleProviderKeys = rows.map((row) =>
    row.kind === "ai" ? getAIProviderKey(row.profile, assignments) : row.service.providerKey,
  );
  async function saveProfiles(nextProfiles: AIProviderProfile[], options: SaveProfilesOptions = {}) {
    const storedState = controller.storedState;
    if (!storedState) return;
    const nextAssignments = normalizeLegacyAIProviderAssignments(
      nextProfiles,
      options.legacyProviderAssignments ?? storedState.legacyProviderAssignments,
    );
    const savedOrder = options.providerOrder ?? storedState.providerOrder;
    const fallbackOrder = getCombinedProviderOrder(nextProfiles, undefined, servicesOrder, nextAssignments);
    const previousFallbackOrder = getCombinedProviderOrder(
      storedState.profiles,
      undefined,
      servicesOrder,
      storedState.legacyProviderAssignments,
    );
    const previousKeys = new Set(
      getCombinedAvailableProviderKeys(storedState.profiles, storedState.legacyProviderAssignments),
    );
    const appendNewKeys = fallbackOrder.filter((key) => !previousKeys.has(key));
    const nextProviderOrder = reconcileProviderOrder(
      savedOrder,
      getCombinedAvailableProviderKeys(nextProfiles, nextAssignments),
      savedOrder ? fallbackOrder : [...previousFallbackOrder, ...appendNewKeys],
    );
    const normalizedProfiles = syncAIProviderOrders(nextProfiles, nextProviderOrder, nextAssignments);
    await controller.update({
      ...storedState,
      profiles: normalizedProfiles,
      providerOrder: nextProviderOrder,
      legacyProviderAssignments: nextAssignments,
    });
    if (normalizedProfiles.filter((profile) => profile.adapter === "raycast-ai" && profile.enabled).length > 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Multiple Raycast AI providers enabled",
        message: "Extension AI requests are rate-limited; rapid queries may fail.",
      });
    }
  }

  async function saveProfileWithReplacement(
    savedProfile: AIProviderProfile,
    replacement: LegacyAIProviderName | undefined,
    isNewProvider: boolean,
  ) {
    const currentReplacement = getLegacyAIProviderReplacement(savedProfile.id, assignments);
    const nextProfiles = isNewProvider
      ? [...profiles, savedProfile]
      : profiles.map((candidate) => (candidate.id === savedProfile.id ? savedProfile : candidate));
    if (currentReplacement === replacement) {
      await saveProfiles(nextProfiles);
      return;
    }

    const nextAssignments = { ...assignments };
    if (currentReplacement) delete nextAssignments[currentReplacement];
    if (replacement) {
      const existing = getEffectiveLegacyAIProviderAssignment(replacement, profiles, assignments);
      if (existing?.kind === "profile" && existing.profileId !== savedProfile.id) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${getLegacyProviderTitle(replacement)} is already replaced`,
        });
        return;
      }
      nextAssignments[replacement] = { kind: "profile", profileId: savedProfile.id };
    }

    const nextOrder = reconcileAIProviderReplacementOrder(providerOrder, savedProfile, currentReplacement, replacement);

    await saveProfiles(nextProfiles, {
      providerOrder: nextOrder,
      legacyProviderAssignments: nextAssignments,
    });
    if (currentReplacement && savedProfile.enabled && legacyConfiguration[currentReplacement].enabled) {
      await showToast({
        style: Toast.Style.Success,
        title: "Legacy provider restored",
        message: `${savedProfile.name} and ${getLegacyProviderTitle(currentReplacement)} are both enabled.`,
      });
    }
  }

  function getReplacementOptions(profileId: string): LegacyReplacementOption[] {
    const currentReplacement = getLegacyAIProviderReplacement(profileId, assignments);
    return LEGACY_AI_PROVIDER_NAMES.filter((provider) => {
      if (provider === currentReplacement) return true;
      return isLegacyAIProviderAvailable(provider, profiles, assignments, legacyConfiguration);
    }).map((provider) => ({ value: provider, title: `${getLegacyProviderTitle(provider)} (Legacy Settings)` }));
  }

  function addAction(title: string, profile: AIProviderProfile, icon = Icon.Plus, showPresetSelector = false) {
    return (
      <Action.Push
        title={title}
        icon={icon}
        target={
          <AIProviderForm
            profile={profile}
            isNewProvider
            showPresetSelector={showPresetSelector}
            legacyReplacementOptions={getReplacementOptions(profile.id)}
            onSave={(saved, replacement) => saveProfileWithReplacement(saved, replacement, true)}
          />
        }
      />
    );
  }

  async function importLegacyProviders(providerNames: LegacyAIProviderName[]) {
    if (!controller.storedState) return;
    const imported = importLegacyAIProviders(controller.storedState, legacyConfiguration, providerNames);
    await saveProfiles(imported.profiles, {
      providerOrder: imported.providerOrder,
      legacyProviderAssignments: imported.legacyProviderAssignments,
    });
    const importedNames = providerNames.map(getLegacyProviderTitle).join(" and ");
    await showToast({ style: Toast.Style.Success, title: `${importedNames} imported` });
  }

  async function restoreLegacyProvider(provider: LegacyAIProviderName) {
    const nextAssignments = { ...assignments };
    delete nextAssignments[provider];
    await saveProfiles(profiles, { legacyProviderAssignments: nextAssignments });
    await showToast({ style: Toast.Style.Success, title: `${getLegacyProviderTitle(provider)} restored` });
  }

  function importLegacyAction(provider: LegacyAIProviderName) {
    return (
      <Action
        title={`Import ${getLegacyProviderTitle(provider)} as AI Provider`}
        icon={Icon.Download}
        onAction={() => importLegacyProviders([provider])}
      />
    );
  }

  if (!controller.storedState && !controller.isLoading) {
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
                title="Reset AI Provider Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Reset AI provider configuration?",
                    message: "This permanently removes all saved dynamic providers and API keys.",
                    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                  });
                  if (confirmed) await controller.update(createEmptyAIProviderState());
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function moveProvider(providerKey: string, offset: -1 | 1) {
    const visibleIndex = visibleProviderKeys.indexOf(providerKey);
    const adjacentKey = visibleProviderKeys[visibleIndex + offset];
    if (visibleIndex < 0 || !adjacentKey) return;
    const currentIndex = providerOrder.indexOf(providerKey);
    const nextIndex = providerOrder.indexOf(adjacentKey);
    if (currentIndex < 0 || nextIndex < 0) return;
    const nextOrder = [...providerOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    setSelectedProviderKey(providerKey);
    await saveProfiles(profiles, { providerOrder: nextOrder });
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

  function legacySettingsSection(excludedImport?: LegacyAIProviderName) {
    const visibleImports = importableLegacyProviders.filter((provider) => provider !== excludedImport);
    if (visibleImports.length === 0 && restorableLegacyProviders.length === 0 && importableLegacyProviders.length < 2)
      return null;
    return (
      <ActionPanel.Section title="Legacy Settings">
        {visibleImports.map((provider) => (
          <Action
            key={`import-${provider}`}
            title={`Import ${getLegacyProviderTitle(provider)} as AI Provider`}
            icon={Icon.Download}
            onAction={() => importLegacyProviders([provider])}
          />
        ))}
        {importableLegacyProviders.length > 1 && (
          <Action
            title="Import All Legacy AI Settings"
            icon={Icon.Download}
            onAction={() => importLegacyProviders(importableLegacyProviders)}
          />
        )}
        {restorableLegacyProviders.map((provider) => (
          <Action
            key={`restore-${provider}`}
            title={`Restore Legacy ${getLegacyProviderTitle(provider)}`}
            icon={Icon.RotateClockwise}
            onAction={() => restoreLegacyProvider(provider)}
          />
        ))}
      </ActionPanel.Section>
    );
  }

  function addProviderSection() {
    return (
      <ActionPanel.Section title="Add Provider">
        {addAction("Add OpenAI-Compatible Provider", createOpenAIProfile("custom", profiles.length), Icon.Plus, true)}
        {addAction("Add Raycast AI Provider", createRaycastAIProfile(profiles.length), Icon.RaycastLogoNeg)}
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
          title={
            importableLegacyProviders.length > 0 || restorableLegacyProviders.length > 0
              ? "Add, Import, or Restore Providers"
              : "Add Providers"
          }
          subtitle="Create an AI provider or manage legacy settings"
          actions={
            <ActionPanel>
              {addProviderSection()}
              {legacySettingsSection()}
            </ActionPanel>
          }
        />
      )}
      {rows.map((row) => {
        if (row.kind !== "ai") {
          const { service } = row;
          const isLegacy = row.kind === "legacy";
          return (
            <List.Item
              key={service.providerKey}
              id={service.providerKey}
              icon={getQueryTypeIcon(service.type)}
              title={service.label}
              subtitle={isLegacy ? "Legacy Settings" : undefined}
              accessories={[
                { tag: isLegacy ? "Legacy" : "Built-in" },
                { tag: getBuiltinPreferenceStatusTag(service.enabledInPreferences) },
              ]}
              actions={
                <ActionPanel>
                  {isLegacy && importLegacyAction(row.provider)}
                  <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  {moveActions(service.providerKey)}
                  {addProviderSection()}
                  {legacySettingsSection(isLegacy ? row.provider : undefined)}
                </ActionPanel>
              }
            />
          );
        }

        const { profile } = row;
        const runnable = isAIProviderProfileRunnable(profile);
        const replacement = getLegacyAIProviderReplacement(profile.id, assignments);
        const providerKey = getAIProviderKey(profile, assignments);
        return (
          <List.Item
            key={providerKey}
            id={providerKey}
            icon={getProviderIcon(profile.icon, profile.name)}
            title={profile.name}
            subtitle={`${profile.adapter === "raycast-ai" ? "Raycast AI" : "OpenAI-Compatible"} · ${profile.model}`}
            accessories={getAIProviderAccessories(profile, runnable, replacement)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Provider"
                  icon={Icon.Pencil}
                  target={
                    <AIProviderForm
                      profile={profile}
                      legacyReplacement={replacement}
                      legacyReplacementOptions={getReplacementOptions(profile.id)}
                      onSave={(saved, nextReplacement) => saveProfileWithReplacement(saved, nextReplacement, false)}
                    />
                  }
                />
                <Action
                  title={profile.enabled ? "Disable Provider" : "Enable Provider"}
                  icon={profile.enabled ? Icon.Pause : Icon.Play}
                  onAction={() =>
                    saveProfiles(
                      profiles.map((candidate) =>
                        candidate.id === profile.id ? { ...candidate, enabled: !candidate.enabled } : candidate,
                      ),
                    )
                  }
                />
                <Action
                  title="Duplicate Provider"
                  icon={Icon.Duplicate}
                  onAction={() =>
                    saveProfiles([
                      ...profiles,
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
                      message: replacement
                        ? `This removes the saved provider and its API key. Legacy ${getLegacyProviderTitle(replacement)} will remain retired until you restore it manually.`
                        : "This removes the saved provider and its API key.",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (confirmed) {
                      setSelectedProviderKey(undefined);
                      const nextAssignments = { ...assignments };
                      if (replacement) nextAssignments[replacement] = { kind: "retired" };
                      await saveProfiles(
                        profiles.filter((candidate) => candidate.id !== profile.id),
                        {
                          legacyProviderAssignments: nextAssignments,
                        },
                      );
                    }
                  }}
                />
                {addProviderSection()}
                {legacySettingsSection()}
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

function getAIProviderAccessories(profile: AIProviderProfile, runnable: boolean, replacement?: LegacyAIProviderName) {
  return [
    { tag: "AI Provider" },
    ...(replacement ? [{ tag: `Replaces ${getLegacyProviderTitle(replacement)}` }] : []),
    { tag: getAIProviderStatusTag(profile, runnable) },
  ];
}

function getBuiltinPreferenceStatusTag(enabled: boolean | undefined) {
  return enabled ? { value: "Enabled", color: Color.Green } : { value: "Disabled", color: Color.SecondaryText };
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
