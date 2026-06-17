/*
https://rclone.org/rc/#operations-copyfile

operations/copyfile: Copy a file from source remote to destination remote
This takes the following parameters:

srcFs - a remote name string e.g. "drive:" for the source, "/" for local filesystem
srcRemote - a path within that remote e.g. "file.txt" for the source
dstFs - a remote name string e.g. "drive2:" for the destination, "/" for local filesystem
dstRemote - a path within that remote e.g. "file2.txt" for the destination
*/
import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { Fragment, useCallback, useMemo, useState } from "react";
import useOptionsInfo from "../hooks/useOptionsInfo";
import useGlobalOptions from "../hooks/useGlobalOptions";
import rclone from "../lib/rclone";
import { buildFlagInfo, flagHasGroup, OptionsInfoOption, serializeOptionValue, sortByName } from "../lib/operations";

export default function copyfileOperation({ initialRemote }: { initialRemote: string }) {
  const [source, setSource] = useState<string>(initialRemote ? `${initialRemote}:/` : "");
  const [destination, setDestination] = useState<string>("");
  const [flagValues, setFlagValues] = useState<Record<string, string>>({});

  const { data: allFlagsData, isLoading: isLoadingAllFlags, error: allFlagsError } = useOptionsInfo();

  const { data: globalFlags, isLoading: isLoadingGlobalFlags, error: globalFlagsError } = useGlobalOptions();

  const mainFlags = allFlagsData?.main;

  const copyFlags = useMemo(() => {
    if (!mainFlags) {
      return [];
    }
    return mainFlags.filter((flag) => flagHasGroup(flag, "Copy")).sort(sortByName);
  }, [mainFlags]);

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

  const sections = useMemo(
    () =>
      ({
        copy: {
          id: "copy",
          title: "Copy",
          flags: copyFlags,
          globalNamespace: "main",
        },
        config: {
          id: "config",
          title: "Config",
          flags: configFlags,
          globalNamespace: "main",
        },
      }) as const,
    [copyFlags, configFlags],
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
    const trimmedDestination = destination.trim();

    if (!trimmedSource || !trimmedDestination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing path",
        message: "Please provide both a source and destination.",
      });
      return;
    }

    if (trimmedSource === trimmedDestination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid paths",
        message: "Source and destination cannot be the same.",
      });
      return;
    }

    const dirtyFlags = Object.entries(flagValues);
    const configOverrides: Record<string, string> = {};

    dirtyFlags.forEach(([flagName]) => {
      configOverrides[flagName] = flagValues[flagName];
    });

    const configPayload = Object.keys(configOverrides).length > 0 ? JSON.stringify(configOverrides) : undefined;

    const splitSource = trimmedSource.split(":");
    const srcFs = splitSource[0];
    const srcRemote = splitSource[1];

    if (!srcFs || !srcRemote) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid source path",
        message: "Source path must be in the format 'remote:/path'.",
      });
      return;
    }

    const splitDestination = trimmedDestination.split(":");
    const dstFs = splitDestination[0];
    const dstRemote = splitDestination[1];

    if (!dstFs || !dstRemote) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid destination path",
        message: "Destination path must be in the format 'remote:/path'.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting copy...",
      message: `Copying ${trimmedSource} to ${trimmedDestination}`,
    });

    try {
      await rclone("/operations/copyfile", {
        params: {
          query: {
            srcFs: srcFs,
            srcRemote: srcRemote,
            dstFs: dstFs,
            dstRemote: dstRemote,
            _config: configPayload,
            _async: true,
          },
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Copy started";
      toast.message = `Copy from ${trimmedSource} to ${trimmedDestination} initiated`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start copy";
      toast.message = message;
    }
  };

  return (
    <Form
      navigationTitle="copyfile"
      isLoading={isLoadingFlags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Paths" text="Configure the source and destination for the copy." />
      <Form.TextField
        id="source"
        title="Source"
        value={source}
        onChange={setSource}
        placeholder="remote:/path or /local/path"
      />
      <Form.TextField
        id="destination"
        title="Destination"
        value={destination}
        onChange={setDestination}
        placeholder="remote:/path or /local/path"
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
