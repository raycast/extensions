import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Action,
  ActionPanel,
  Application,
  Form,
  getApplications,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { ErrorView } from "./components/error-view";
import { useRimeInstallation } from "./hooks/use-rime-installation";
import { reloadAfterChange } from "./lib/actions";
import { parseApplicationOptions, updateApplicationOptions } from "./lib/app-options";
import { readText, writeTextAtomically } from "./lib/files";
import { getPreferences } from "./lib/preferences";
import type { AppMode, AppOption, RimeInstallation } from "./types";

type TriState = "inherit" | "on" | "off";
type AppModeFormValues = {
  mode: AppMode;
  asciiPunct: TriState;
  inline: TriState;
  vimMode: TriState;
};

type ListedApplication = {
  name: string;
  bundleId: string;
  path?: string;
};

function toTriState(value: boolean | undefined): TriState {
  if (value === true) return "on";
  if (value === false) return "off";
  return "inherit";
}

function fromTriState(value: TriState): boolean | undefined {
  if (value === "on") return true;
  if (value === "off") return false;
  return undefined;
}

function modeTitle(option?: AppOption): string {
  if (option?.asciiMode === true) return "Start in Latin Mode";
  if (option?.asciiMode === false) return "Start in Chinese Mode";
  return "Remember Last Mode";
}

function ApplicationModeForm({
  application,
  installation,
  option,
  onSaved,
}: {
  application: ListedApplication;
  installation: RimeInstallation;
  option?: AppOption;
  onSaved: (source: string) => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: AppModeFormValues) {
    const asciiMode = values.mode === "english" ? true : values.mode === "chinese" ? false : undefined;
    try {
      const source = await readText(installation.squirrelCustomPath, "patch:\n");
      const next = updateApplicationOptions(source, application.bundleId, {
        ascii_mode: asciiMode,
        ascii_punct: fromTriState(values.asciiPunct),
        inline: fromTriState(values.inline),
        vim_mode: fromTriState(values.vimMode),
      });
      await writeTextAtomically(
        installation.squirrelCustomPath,
        next,
        `${installation.userDataDir}/.raycast-rime-manager/backups`,
      );
      if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
      onSaved(next);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save App Settings",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={application.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save App Settings" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`${application.name}\n${application.bundleId}`} />
      <Form.Dropdown
        id="mode"
        title="When Opening the App"
        defaultValue={option?.asciiMode === true ? "english" : option?.asciiMode === false ? "chinese" : "remember"}
      >
        <Form.Dropdown.Item value="english" title="Switch to Latin Mode" icon="🇺🇸" />
        <Form.Dropdown.Item value="chinese" title="Switch to Chinese Mode" icon="🇨🇳" />
        <Form.Dropdown.Item value="remember" title="Remember Last Mode" icon={Icon.Clock} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="asciiPunct" title="Punctuation Mode" defaultValue={toTriState(option?.asciiPunct)}>
        <Form.Dropdown.Item value="inherit" title="Use Global Setting" />
        <Form.Dropdown.Item value="on" title="Latin Punctuation" />
        <Form.Dropdown.Item value="off" title="Chinese Punctuation" />
      </Form.Dropdown>
      <Form.Dropdown id="inline" title="Preedit Location" defaultValue={toTriState(option?.inline)}>
        <Form.Dropdown.Item value="inherit" title="Use Global Setting" />
        <Form.Dropdown.Item value="on" title="Inline" />
        <Form.Dropdown.Item value="off" title="Candidate Window" />
      </Form.Dropdown>
      <Form.Dropdown id="vimMode" title="Vim Mode" defaultValue={toTriState(option?.vimMode)}>
        <Form.Dropdown.Item value="inherit" title="Use Global Setting" />
        <Form.Dropdown.Item value="on" title="On" />
        <Form.Dropdown.Item value="off" title="Off" />
      </Form.Dropdown>
      <Form.Description text="Using a global setting removes only that per-app override and leaves other Rime options unchanged." />
    </Form>
  );
}

export default function Command() {
  const { data: installation, error, isLoading: isInspecting, revalidate } = useRimeInstallation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [options, setOptions] = useState<AppOption[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  const loadApplications = useCallback(async () => {
    if (!installation) return;
    setIsLoadingApps(true);
    try {
      const [installed, source] = await Promise.all([
        getApplications(),
        readText(installation.squirrelCustomPath, "patch:\n"),
      ]);
      setApplications(installed);
      setOptions(parseApplicationOptions(source));
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Load Applications",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      setIsLoadingApps(false);
    }
  }, [installation]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const optionMap = useMemo(() => new Map(options.map((option) => [option.bundleId, option])), [options]);
  const listedApplications = useMemo(() => {
    const byBundleId = new Map<string, ListedApplication>();
    for (const application of applications) {
      if (!application.bundleId) continue;
      byBundleId.set(application.bundleId, {
        name: application.localizedName || application.name,
        bundleId: application.bundleId,
        path: application.path,
      });
    }
    for (const option of options) {
      if (!byBundleId.has(option.bundleId)) {
        byBundleId.set(option.bundleId, { name: option.bundleId, bundleId: option.bundleId });
      }
    }
    return [...byBundleId.values()].sort((a, b) => {
      const configuredDifference = Number(optionMap.has(b.bundleId)) - Number(optionMap.has(a.bundleId));
      return configuredDifference || a.name.localeCompare(b.name);
    });
  }, [applications, optionMap, options]);

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  function sourceDidChange(source: string) {
    setOptions(parseApplicationOptions(source));
  }

  return (
    <List isLoading={isInspecting || isLoadingApps} searchBarPlaceholder="Search app names or bundle IDs…">
      <List.Section title="Applications" subtitle={`${listedApplications.length}`}>
        {listedApplications.map((application) => {
          const option = optionMap.get(application.bundleId);
          const extraTags = [
            ...(option?.asciiPunct === true ? [{ tag: "Latin Punctuation" }] : []),
            ...(option?.inline === true ? [{ tag: "Inline Preedit" }] : []),
            ...(option?.vimMode === true ? [{ tag: "Vim" }] : []),
          ];
          return (
            <List.Item
              key={application.bundleId}
              title={application.name}
              subtitle={application.bundleId}
              icon={application.path ? { fileIcon: application.path } : Icon.AppWindow}
              keywords={[application.bundleId]}
              accessories={[{ tag: modeTitle(option) }, ...extraTags]}
              actions={
                <ActionPanel>
                  {installation ? (
                    <Action.Push
                      title="Set Initial Input Mode"
                      icon={Icon.Keyboard}
                      target={
                        <ApplicationModeForm
                          application={application}
                          installation={installation}
                          option={option}
                          onSaved={sourceDidChange}
                        />
                      }
                    />
                  ) : null}
                  {application.path ? <Action.ShowInFinder path={application.path} /> : null}
                  <Action.CopyToClipboard title="Copy Bundle ID" content={application.bundleId} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
