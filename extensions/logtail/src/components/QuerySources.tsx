import { Source, SourceResponse } from "../lib/types";
import { LogTail } from "../lib/logtail";
import { UseLogTailFetchRenderProps, useLogTailFetch } from "../hooks/useLogTailFetch";
import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useDefaultSourceId } from "../hooks/useDefaultSourceId";

export const QuerySources = ({ onSubmit }: { onSubmit?: (source: Source) => void }) => {
  const { data: defaultSourceId, setDefaultSourceId, removeDefaultSourceId } = useDefaultSourceId();

  const renderComponent = ({ data, isLoading }: UseLogTailFetchRenderProps<SourceResponse>) => {
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
              <Action.SubmitForm
                title="Set as Default"
                onSubmit={handleSetSourceDefault.bind(this, source)}
                icon={Icon.Star}
              />
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
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Select a source to query">
        {data?.data.map(renderSource)}
        {data?.data.length && <List.EmptyView title="No sources found" />}
      </List>
    );
  };

  const [Component] = useLogTailFetch<SourceResponse>({ url: LogTail.SOURCES_URL }, renderComponent);

  if (Component) {
    return <Component />;
  }

  return null;
};
