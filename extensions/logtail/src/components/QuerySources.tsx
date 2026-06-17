import { Source, SourceResponse } from "../lib/types";
import { Logtail } from "../lib/logtail";
import { UseLogtailFetchRenderProps, useLogtailFetch } from "../hooks/useLogtailFetch";
import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useDefaultSourceId } from "../hooks/useDefaultSourceId";
import { useEffect } from "react";

type QuerySourcesProps = {
  onSubmit?: (source: Source) => void;
  autoSelect?: boolean;
};

export const QuerySources = ({ onSubmit, autoSelect = true }: QuerySourcesProps) => {
  const { data: defaultSourceId, setDefaultSourceId, removeDefaultSourceId } = useDefaultSourceId();

  const renderComponent = ({ data, isLoading }: UseLogtailFetchRenderProps<SourceResponse>) => {
    const handleSelectSourceSubmit = async (source: Source) => {
      onSubmit?.(source);
    };

    const handleSetSourceDefault = async (source: Source) => {
      await setDefaultSourceId(source.id);
    };

    const handleRemoveSourceDefault = async () => {
      await removeDefaultSourceId();
    };

    const renderSource = (source: Source, index: number) => {
      const isDefault = source.id === defaultSourceId;

      const accessories = isDefault
        ? [
            {
              tag: "default",
              text: "Default",
              color: Color.Blue,
            },
          ]
        : undefined;

      return (
        <List.Item
          key={index}
          title={source.attributes.name}
          accessories={accessories}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Query by Source"
                onSubmit={handleSelectSourceSubmit.bind(this, source)}
                icon={Icon.MagnifyingGlass}
              />
              {!isDefault && (
                <Action.SubmitForm
                  title="Set Default"
                  onSubmit={handleSetSourceDefault.bind(this, source)}
                  icon={Icon.Star}
                />
              )}
              {isDefault && (
                <Action.SubmitForm
                  title="Remove Default"
                  onSubmit={handleRemoveSourceDefault}
                  icon={Icon.XMarkCircle}
                />
              )}
            </ActionPanel>
          }
        />
      );
    };

    // If there is only one source, automatically select it as the default
    useEffect(() => {
      if (autoSelect && data?.data.length === 1) {
        onSubmit?.(data.data[0]);
      }
    }, [data?.data.length]);

    const searchBarPlaceholder = autoSelect && data?.data.length === 1 ? "Searching..." : "Select a source to query";

    return (
      <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
        {(!autoSelect || (data?.data.length ?? 0) > 1) && data?.data.map(renderSource)}
        {data?.data.length && <List.EmptyView title="No sources found" />}
      </List>
    );
  };

  const { Render } = useLogtailFetch<SourceResponse>({ url: Logtail.SOURCES_URL }, renderComponent);

  return <Render />;
};
