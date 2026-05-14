import { Action, ActionPanel, Form, Icon, Image, showToast, Toast, useNavigation } from "@raycast/api";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { useEffect, useMemo, useRef, useState } from "react";
import { GitLocalConfig, GitLocalConfigUpdates } from "../../types";
import React from "react";
import { showFailureToast } from "@raycast/utils";

type GitConfigField = {
  /**
   * The key of the config field in lowercase format.
   */
  key: string;
  group: "user" | "signing" | "core" | "unicode" | "environment" | "lfs" | "http";
  /**
   * The user friendly label of the config field.
   */
  label: string;
  /**
   * The user friendly explanation of the config field.
   */
  info?: string;
  icon: Image.ImageLike;
  defaultValue?: string;
  /**
   * The placeholder value of the config field.
   */
  placeholder?: string;
  type: "number" | "text" | "checkbox";
  alwaysVisible?: boolean;
};

/**
 * Supported local git config fields for use in GitConfigView.
 * Each field is mapped to a human-readable title for display in UI.
 */
const SUPPORTED_GIT_CONFIG_FIELDS: GitConfigField[] = [
  {
    group: "user",
    key: "user.name",
    label: "User Name",
    icon: Icon.Person,
    info: "Author name for commits",
    placeholder: "Your name",
    type: "text",
    alwaysVisible: true,
  },
  {
    group: "user",
    key: "user.email",
    label: "User Email",
    icon: Icon.Envelope,
    info: "Author email for commits",
    placeholder: "your@email.com",
    type: "text",
    alwaysVisible: true,
  },

  {
    group: "core",
    key: "init.defaultbranch",
    label: "Default Branch",
    icon: `git-branch.svg`,
    info: "Default branch name for new repositories",
    placeholder: "main",
    type: "text",
    alwaysVisible: true,
  },
  {
    group: "core",
    key: "core.bare",
    label: "Bare repository",
    icon: Icon.EditShape,
    info: "Create a bare repository without a working directory",
    type: "checkbox",
    defaultValue: "false",
  },
  {
    group: "core",
    key: "core.filemode",
    label: "Track file mode changes",
    icon: Icon.EditShape,
    info: "Track changes to executable bits",
    type: "checkbox",
    defaultValue: "true",
  },
  {
    group: "core",
    key: "core.sparsecheckout",
    label: "Sparse checkout",
    icon: `arrow-checkout.svg`,
    info: "Enable sparse checkout to only track a subset of files",
    type: "checkbox",
    defaultValue: "false",
  },
  {
    group: "core",
    key: "push.autosetupremote",
    label: "Auto-setup remote when pushing to a new branch",
    icon: Icon.Cloud,
    info: "Configure upstream on first push",
    type: "checkbox",
    defaultValue: "false",
  },

  {
    group: "signing",
    key: "commit.gpgsign",
    label: "Sign commits with GPG",
    icon: Icon.Lock,
    info: "Enable GPG signing when committing",
    type: "checkbox",
    defaultValue: "false",
  },
  {
    group: "signing",
    key: "tag.gpgsign",
    label: "Sign tags with GPG",
    icon: Icon.Lock,
    info: "Enable GPG signing when creating tags",
    type: "checkbox",
    defaultValue: "false",
  },
  {
    group: "signing",
    key: "user.signingkey",
    label: "Signing Key",
    icon: Icon.Key,
    info: 'GPG key to use for signing commits. Should be used with "Sign commits with GPG".',
    placeholder: "GPG key ID",
    type: "text",
  },

  {
    group: "http",
    key: "http.proxy",
    label: "HTTP Proxy",
    icon: Icon.Globe,
    info: "Proxy to use for HTTP requests. This is useful for repositories that are behind a proxy.",
    placeholder: "http://proxy.example.com:8080",
    type: "text",
  },
  {
    group: "http",
    key: "http.sslverify",
    label: "SSL Verification",
    icon: Icon.Lock,
    info: "Verify SSL certificates when making HTTP requests. This is useful for repositories that are behind a proxy.",
    type: "checkbox",
    defaultValue: "true",
  },
  {
    group: "http",
    key: "core.compression",
    label: "Compression",
    icon: Icon.Globe,
    info: "Compression level for git objects. 0 means no compression, 9 means maximum compression.",
    type: "number",
    placeholder: "9",
  },
  {
    group: "http",
    key: "http.postbuffer",
    label: "HTTP Post Buffer",
    icon: Icon.Globe,
    info: "HTTP Post buffer for git objects. The maximum size of the HTTP POST request body.",
    type: "number",
    placeholder: "41943040000",
  },
  {
    group: "http",
    key: "http.lowspeedlimit",
    label: "Low Speed Limit",
    icon: Icon.Globe,
    info: "Low speed limit for git objects. The minimum speed for git objects.",
    type: "number",
    placeholder: "1",
  },
  {
    group: "http",
    key: "http.lowspeedtime",
    label: "Low Speed Time",
    icon: Icon.Globe,
    info: "Low speed time for git objects. The time to wait for the next git object.",
    type: "number",
    placeholder: "320",
  },

  {
    group: "unicode",
    key: "core.ignorecase",
    label: "Ignore case in file names",
    icon: Icon.TextInput,
    info: "Ignore case in file names. This is useful for Windows systems.",
    type: "checkbox",
    defaultValue: "true",
  },
  {
    group: "unicode",
    key: "core.quotepath",
    label: "Quote Path",
    icon: Icon.TextInput,
    info: "Quote file path characters",
    type: "checkbox",
    defaultValue: "false",
  },
  {
    group: "unicode",
    key: "core.precomposeunicode",
    label: "Precompose Unicode",
    icon: Icon.TextInput,
    type: "checkbox",
    defaultValue: "true",
  },

  {
    group: "environment",
    key: "core.hookspath",
    label: "Hooks Path",
    icon: Icon.Code,
    info: "Custom directory for git hooks",
    placeholder: ".git/hooks",
    type: "text",
  },
  {
    group: "environment",
    key: "core.sshcommand",
    label: "SSH Command",
    icon: Icon.Terminal,
    info: "Custom SSH command for git operations",
    placeholder: "ssh -i ~/.ssh/id_rsa",
    type: "text",
  },

  {
    group: "lfs",
    key: "lfs.url",
    label: "LFS URL",
    icon: Icon.HardDrive,
    info: "URL of the Git LFS server. This is used to store large files in a separate repository.",
    placeholder: "https://git-lfs.example.com",
    type: "text",
  },
];

export function GitConfigView(context: RepositoryContext & NavigationContext) {
  const { pop } = useNavigation();
  const originalConfig = useRef<GitLocalConfig>({ local: {}, global: {} });
  const [draftConfig, setDraftConfig] = useState<GitLocalConfigUpdates>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentFieldsSections = useMemo(() => {
    if (isLoading) {
      return [];
    }

    const currentFields = SUPPORTED_GIT_CONFIG_FIELDS.filter(
      (field) => (field.key in draftConfig && draftConfig[field.key] !== undefined) || field.alwaysVisible,
    );

    const groups = Object.groupBy(currentFields, (field) => field.group);

    return Object.entries(groups).filter(([_, fields]) => fields.length > 0);
  }, [draftConfig, isLoading]);

  const missingFieldsSections = useMemo(() => {
    if (isLoading) {
      return [];
    }

    const missingFields = SUPPORTED_GIT_CONFIG_FIELDS.filter(
      (field) => !(field.key in draftConfig) || draftConfig[field.key] === undefined,
    );

    const groups = Object.groupBy(missingFields, (field) => field.group);

    return Object.entries(groups).filter(([_, fields]) => fields.length > 0);
  }, [draftConfig, isLoading]);

  /**
   * Loads the local git config for the repository.
   */
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const loadedConfig = await context.gitManager.getConfig();

      originalConfig.current = loadedConfig;
      setDraftConfig(loadedConfig.local);
      setIsLoading(false);
    })();
  }, [context.gitManager.repoPath]);

  const handleSubmit = async () => {
    const updates: GitLocalConfigUpdates = Object.fromEntries(
      Object.entries(draftConfig)
        // Remove empty values
        .map(([key, newValue]) => [key, newValue === "" ? undefined : newValue])
        .filter(([key, newValue]) => {
          if (newValue === undefined) {
            // Remove the key if it exists in the original config
            return (key as string) in originalConfig.current.local;
          }

          // If the key is not in the original config, add it
          if (!((key as string) in originalConfig.current.local)) {
            return true;
          }

          // if the value changed or removed
          return newValue !== originalConfig.current.local[key as string];
        }),
    );

    console.log("updates", updates);
    if (Object.keys(updates).length === 0) {
      await showToast({ style: Toast.Style.Success, title: "No changes to save" });
      pop();
      return;
    }

    try {
      setIsLoading(true);
      await context.gitManager.updateLocalConfig(updates);
      await showToast({ style: Toast.Style.Success, title: "Git Config saved" });
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save config" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle="Git Config"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Save Config" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
            <ActionPanel.Submenu
              title="Open Git Config"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            >
              <Action.Open title="Local Config" icon={Icon.House} target={context.gitManager.localConfigPath} />
              <Action.Open title="Global Config" icon={Icon.Globe} target={context.gitManager.globalConfigPath} />
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Submenu title="Add Preference" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }}>
            {missingFieldsSections.map(([group, fields]) => (
              <ActionPanel.Section key={group}>
                {fields
                  .filter((field) => !field.alwaysVisible)
                  .map((field) => (
                    <Action
                      key={field.key}
                      title={field.label}
                      icon={field.icon}
                      onAction={() =>
                        setDraftConfig((previous) => ({ ...previous, [field.key]: field.defaultValue ?? "" }))
                      }
                    />
                  ))}
              </ActionPanel.Section>
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu title="Remove Preference" icon={Icon.Minus} shortcut={{ modifiers: ["ctrl"], key: "x" }}>
            {currentFieldsSections.map(([group, fields]) => (
              <ActionPanel.Section key={group}>
                {fields
                  .filter((field) => !field.alwaysVisible)
                  .map((field) => (
                    <Action
                      key={field.key}
                      title={field.label}
                      icon={field.icon}
                      onAction={() => setDraftConfig((previous) => ({ ...previous, [field.key]: undefined }))}
                    />
                  ))}
              </ActionPanel.Section>
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      {currentFieldsSections.map(([group, fields]) => (
        <React.Fragment key={group}>
          {fields.map((field) =>
            field.type === "text" || field.type === "number" ? (
              <Form.TextField
                key={field.key}
                id={field.key}
                title={field.label}
                placeholder={
                  originalConfig.current.local[field.key] ??
                  originalConfig.current.global[field.key] ??
                  field.placeholder
                }
                info={field.info}
                value={draftConfig[field.key] ?? ""}
                onChange={(value) => setDraftConfig((previous) => ({ ...previous, [field.key]: value }))}
                error={field.type === "number" && isNaN(Number(draftConfig[field.key])) ? "Invalid number" : undefined}
              />
            ) : (
              <Form.Checkbox
                key={field.key}
                id={field.key}
                label={field.label}
                info={field.info}
                value={draftConfig[field.key] === "true"}
                onChange={(value) =>
                  setDraftConfig((previous) => ({ ...previous, [field.key]: value ? "true" : "false" }))
                }
              />
            ),
          )}
          <Form.Separator />
        </React.Fragment>
      ))}

      <Form.Description
        title="Tips"
        text={["Press ⌘ + N to add a new preference", "Press ⌃ + X to remove a preference"].join("\n")}
      />
    </Form>
  );
}
