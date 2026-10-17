/*
https://rclone.org/rc/#operations-copyurl

operations/copyurl: Copy the URL to the object
This takes the following parameters:

fs - a remote name string e.g. "drive:"
remote - a path within that remote e.g. "dir"
url - string, URL to read from
autoFilename - boolean, set to true to retrieve destination file name from url
See the copyurl command for more information on the above.
*/
import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { Fragment, useCallback, useMemo, useState } from "react";
import useOptionsInfo from "../hooks/useOptionsInfo";
import useGlobalOptions from "../hooks/useGlobalOptions";
import rclone from "../lib/rclone";
import { buildFlagInfo, flagHasGroup, OptionsInfoOption, serializeOptionValue, sortByName } from "../lib/operations";

export default function copyurlOperation({ initialRemote }: { initialRemote: string }) {
  const [url, setUrl] = useState<string>("");
  const [destination, setDestination] = useState<string>(initialRemote ? `${initialRemote}:/` : "");
  const [flagValues, setFlagValues] = useState<Record<string, string>>({});

  const { data: allFlagsData, isLoading: isLoadingAllFlags, error: allFlagsError } = useOptionsInfo();

  const { data: globalFlags, isLoading: isLoadingGlobalFlags, error: globalFlagsError } = useGlobalOptions();

  const mainFlags = allFlagsData?.main;

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
        config: {
          id: "config",
          title: "Config",
          flags: configFlags,
          globalNamespace: "main",
        },
      }) as const,
    [configFlags],
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
    const trimmedUrl = url.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedUrl || !trimmedDestination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing URL or destination",
        message: "Please provide both a URL and destination.",
      });
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please provide a valid URL.",
      });
      return;
    }

    const dirtyFlags = Object.entries(flagValues);
    const configOverrides: Record<string, string> = {};

    dirtyFlags.forEach(([flagName]) => {
      configOverrides[flagName] = flagValues[flagName];
    });

    const configPayload = Object.keys(configOverrides).length > 0 ? JSON.stringify(configOverrides) : undefined;

    const normalizedDestination = trimmedDestination.replace(/[\\/]+$/, "");
    const normalizedPath = normalizedDestination.replace(/\\/g, "/");
    const destinationSegments = normalizedPath.split("/");
    const dstRemote = destinationSegments.pop() ?? "";
    const dstFs = destinationSegments.join("/");

    if (!dstFs || !dstRemote) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid destination path",
        message: "Destination path must be in the format 'remote:/path/filename.ext'.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting download...",
      message: `Downloading ${trimmedUrl} to ${trimmedDestination}`,
    });

    try {
      await rclone("/operations/copyurl", {
        params: {
          query: {
            url: trimmedUrl,
            fs: dstFs,
            remote: dstRemote,
            _config: configPayload,
            _async: true,
          },
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Download started";
      toast.message = `Download ${trimmedUrl} to ${trimmedDestination} initiated`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start download";
      toast.message = message;
    }
  };

  return (
    <Form
      navigationTitle="copyurl"
      isLoading={isLoadingFlags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="URL" text="Configure the URL and destination for the download." />
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} placeholder="https://example.com/file.txt" />
      <Form.TextField
        id="destination"
        title="Destination"
        value={destination}
        onChange={setDestination}
        placeholder="remote:/path or /local/path (including filename)"
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
