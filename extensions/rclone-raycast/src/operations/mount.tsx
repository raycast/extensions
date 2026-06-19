import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { Fragment, useCallback, useMemo, useState } from "react";
import useOptionsInfo from "../hooks/useOptionsInfo";
import useGlobalOptions from "../hooks/useGlobalOptions";
import rclone from "../lib/rclone";
import { buildFlagInfo, flagHasGroup, OptionsInfoOption, serializeOptionValue, sortByName } from "../lib/operations";

export default function mountOperation({ initialRemote }: { initialRemote: string }) {
  const [source, setSource] = useState<string>(initialRemote ? `${initialRemote}:/` : "");
  const [mountpoint, setMountpoint] = useState<string>("");
  const [flagValues, setFlagValues] = useState<Record<string, string>>({});

  const { data: allFlagsData, isLoading: isLoadingAllFlags, error: allFlagsError } = useOptionsInfo();

  const { data: globalFlags, isLoading: isLoadingGlobalFlags, error: globalFlagsError } = useGlobalOptions();

  const mainFlags = allFlagsData?.main;

  const filterFlagsSource = allFlagsData?.filter;
  const vfsFlagsSource = allFlagsData?.vfs;
  const mountFlagsSource = allFlagsData?.mount;

  const filterFlags = useMemo(() => {
    if (!filterFlagsSource) {
      return [];
    }
    return [...filterFlagsSource].sort(sortByName);
  }, [filterFlagsSource]);

  const configFlags = useMemo(() => {
    if (!mainFlags) {
      return [];
    }
    return mainFlags
      .filter((flag) => {
        return (
          flagHasGroup(flag, "Performance") ||
          flagHasGroup(flag, "Listing") ||
          flagHasGroup(flag, "Networking") ||
          flagHasGroup(flag, "Check") ||
          flag?.Name === "use_server_modtime"
        );
      })
      .sort(sortByName);
  }, [mainFlags]);

  const vfsFlags = useMemo(() => {
    if (!vfsFlagsSource) {
      return [];
    }
    return [...vfsFlagsSource].sort(sortByName);
  }, [vfsFlagsSource]);

  const mountFlags = useMemo(() => {
    if (!mountFlagsSource) {
      return [];
    }
    return mountFlagsSource
      .filter((flag: OptionsInfoOption) => !["debug_fuse", "daemon", "daemon_timeout"].includes(flag.Name ?? ""))
      .sort(sortByName);
  }, [mountFlagsSource]);

  const sections = useMemo(
    () =>
      ({
        mount: {
          id: "mount",
          title: "Mount",
          flags: mountFlags,
          globalNamespace: "mount",
        },
        vfs: {
          id: "vfs",
          title: "VFS",
          flags: vfsFlags,
          globalNamespace: "vfs",
        },
        filter: {
          id: "filter",
          title: "Filter",
          flags: filterFlags,
          globalNamespace: "filter",
        },
        config: {
          id: "config",
          title: "Config",
          flags: configFlags,
          globalNamespace: "main",
        },
      }) as const,
    [mountFlags, vfsFlags, filterFlags, configFlags],
  );

  const availableSections = useMemo(
    () => Object.values(sections).filter((section) => section && section.flags.length > 0),
    [sections],
  );

  const flagSectionLookup = useMemo(() => {
    const lookup: Record<
      string,
      {
        sectionId: (typeof sections)[keyof typeof sections]["id"];
        globalNamespace: (typeof sections)[keyof typeof sections]["globalNamespace"];
      }
    > = {};
    availableSections.forEach((section) => {
      section.flags.forEach((flag) => {
        if (flag?.FieldName) {
          lookup[flag.FieldName] = { sectionId: section.id, globalNamespace: section.globalNamespace };
        }
      });
    });
    return lookup;
  }, [availableSections]);

  const flagMetadataByFieldName = useMemo(() => {
    const map: Record<string, OptionsInfoOption> = {};
    availableSections.forEach((section) => {
      section.flags.forEach((flag) => {
        if (flag?.FieldName) {
          map[flag.FieldName] = flag;
        }
      });
    });
    return map;
  }, [availableSections]);

  const getFieldDefaultValue = useCallback(
    (fieldName: string | undefined) => {
      if (!fieldName) {
        return "";
      }
      const namespace = flagSectionLookup[fieldName]?.globalNamespace;
      const bucket = namespace ? (globalFlags?.[namespace] as Record<string, unknown> | undefined) : undefined;
      const currentValue = serializeOptionValue(bucket?.[fieldName]);
      if (currentValue !== undefined && currentValue !== "[]") {
        return currentValue;
      }
      const metadata = flagMetadataByFieldName[fieldName];
      if (!metadata) {
        return "";
      }
      return (
        (() => {
          const serializedValue = serializeOptionValue(metadata.Value);
          if (serializedValue && serializedValue !== "[]") {
            return serializedValue;
          }
          return undefined;
        })() ??
        metadata.ValueStr ??
        metadata.DefaultStr ??
        (() => {
          const serializedDefault = serializeOptionValue(metadata.Default);
          if (serializedDefault && serializedDefault !== "[]") {
            return serializedDefault;
          }
          return undefined;
        })() ??
        ""
      );
    },
    [flagSectionLookup, globalFlags, flagMetadataByFieldName],
  );

  const isLoadingFlags = isLoadingAllFlags || isLoadingGlobalFlags;
  const flagsError = allFlagsError ?? globalFlagsError;

  const handleFlagValueChange = useCallback(
    (flagName: string, value: string) => {
      if (!flagName) {
        return;
      }
      const defaultValue = getFieldDefaultValue(flagName);
      const isDirty = value !== defaultValue;
      setFlagValues((prev) => {
        const next = { ...prev };
        if (isDirty) {
          next[flagName] = value;
        } else {
          delete next[flagName];
        }
        return next;
      });
    },
    [getFieldDefaultValue],
  );

  const handleSubmit = async () => {
    const trimmedSource = source.trim();
    const trimmedMountpoint = mountpoint.trim();

    if (!trimmedSource || !trimmedMountpoint) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing path",
        message: "Please provide both a source and destination.",
      });
      return;
    }

    const dirtyFlags = Object.entries(flagValues);
    const configOverrides: Record<string, string> = {};
    const filterOverrides: Record<string, string> = {};
    const mountOverrides: Record<string, string> = {};
    const vfsOverrides: Record<string, string> = {};

    dirtyFlags.forEach(([flagName]) => {
      const namespace = flagSectionLookup[flagName]?.globalNamespace ?? "main";
      if (namespace === "filter") {
        filterOverrides[flagName] = flagValues[flagName];
      } else if (namespace === "mount") {
        mountOverrides[flagName] = flagValues[flagName];
      } else if (namespace === "vfs") {
        vfsOverrides[flagName] = flagValues[flagName];
      } else {
        configOverrides[flagName] = flagValues[flagName];
      }
    });

    const configPayload = Object.keys(configOverrides).length > 0 ? JSON.stringify(configOverrides) : undefined;
    const filterPayload = Object.keys(filterOverrides).length > 0 ? JSON.stringify(filterOverrides) : undefined;
    const mountPayload = Object.keys(mountOverrides).length > 0 ? JSON.stringify(mountOverrides) : undefined;
    const vfsPayload = Object.keys(vfsOverrides).length > 0 ? JSON.stringify(vfsOverrides) : undefined;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting mount...",
      message: `Mounting ${trimmedSource} to ${trimmedMountpoint}`,
    });

    try {
      await rclone("/mount/mount", {
        params: {
          query: {
            fs: trimmedSource,
            mountPoint: trimmedMountpoint,
            mountType: "nfsmount",
            mountOpt: mountPayload,
            vfsOpt: vfsPayload,
            _config: configPayload,
            _filter: filterPayload,
            _async: true,
          },
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Mount started";
      toast.message = `Mount ${trimmedSource} at ${trimmedMountpoint} initiated`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start mount";
      toast.message = message;
    }
  };

  return (
    <Form
      navigationTitle="mount"
      isLoading={isLoadingFlags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Paths" text="Configure the source and mountpoint for the mount." />
      <Form.TextField
        id="source"
        title="Source"
        value={source}
        onChange={setSource}
        placeholder="remote:/path or /local/path"
      />
      <Form.TextField
        id="mountpoint"
        title="Mountpoint"
        value={mountpoint}
        onChange={setMountpoint}
        placeholder="C:\local\path or /local/path or * (on windows)"
      />
      <Form.Separator />

      {flagsError ? (
        <Form.Description text={`Failed to load flags: ${flagsError.message}`} />
      ) : (
        (() => {
          const renderedFields = new Set<string>();
          return availableSections.map((section, index) => (
            <Fragment key={section.id}>
              <Form.Description title={section.title} text={`Configure ${section.title.toLowerCase()} flags.`} />
              {section.flags
                .filter((flag) => {
                  const fieldName = flag.FieldName;
                  if (!fieldName || renderedFields.has(fieldName)) {
                    return false;
                  }
                  renderedFields.add(fieldName);
                  return true;
                })
                .map((flag, flagIndex) => {
                  const fieldName = flag.FieldName ?? "";
                  const formId = `flag-${section.id}-${fieldName}-${flagIndex}`;
                  const placeholderSuffix = flag.Type ? ` (${flag.Type})` : "";
                  const resolvedValue = flagValues[fieldName] ?? getFieldDefaultValue(fieldName);
                  return (
                    <Form.TextField
                      key={formId}
                      id={formId}
                      title={flag.Name ?? fieldName ?? "Unnamed flag"}
                      value={resolvedValue}
                      onChange={(newValue) => handleFlagValueChange(fieldName, newValue)}
                      info={buildFlagInfo(flag)}
                      placeholder={`Value${placeholderSuffix}`}
                    />
                  );
                })}
              {index < availableSections.length - 1 && <Form.Separator />}
            </Fragment>
          ));
        })()
      )}
    </Form>
  );
}
