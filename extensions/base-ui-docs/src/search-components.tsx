import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise, withCache } from "@raycast/utils";

type PropItem = {
  prop: string;
  type: string;
  default: string;
};

type ApiPart = {
  title: string;
  description: string;
  props: PropItem[];
};

type ComponentItem = {
  title: string;
  subtitle: string;
  href: string;
  example: string;
  api: ApiPart[];
};

type ApiResponse = {
  components: ComponentItem[];
  utilities: ComponentItem[];
  fetchedAt: string;
};

const TYPE_COLORS: Record<string, Color> = {
  string: Color.Green,
  "string[]": Color.Green,
  boolean: Color.Blue,
  number: Color.Orange,
  "number[]": Color.Orange,
  function: Color.Purple,
  ReactElement: Color.Magenta,
  ReactNode: Color.Magenta,
  "React.CSSProperties": Color.Yellow,
  "React.ReactElement": Color.Magenta,
};

function getTypeColor(type: string): Color {
  return TYPE_COLORS[type] ?? Color.SecondaryText;
}

const fetchAllComponents = withCache(
  async () => {
    const response = await fetch("https://base-ui-api.vercel.app/api/base-ui");
    if (!response.ok) throw new Error(`Failed to fetch Base UI data: ${response.status}`);
    return (await response.json()) as ApiResponse;
  },
  { maxAge: 24 * 60 * 60 * 1000 },
);

export default function Command() {
  const { data, isLoading, error } = usePromise(fetchAllComponents);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search components...">
      {!isLoading && error && (
        <List.EmptyView title="Failed to Load Components" description={error.message ?? "An unknown error occurred."} />
      )}
      {!isLoading && !error && !data && (
        <List.EmptyView title="No Components Found" description="No Base UI components were returned from the API." />
      )}
      <List.Section title="Components">
        {data?.components.map((item) => (
          <ComponentListItem key={item.title} item={item} icon={Icon.Layers} />
        ))}
      </List.Section>
      <List.Section title="Utilities">
        {data?.utilities.map((item) => (
          <ComponentListItem key={item.title} item={item} icon={Icon.Code} />
        ))}
      </List.Section>
    </List>
  );
}

function ComponentListItem({ item, icon }: { item: ComponentItem; icon: Icon }) {
  return (
    <List.Item
      icon={icon}
      title={item.title}
      keywords={item.title.split(" ")}
      detail={
        <List.Item.Detail
          markdown={`## ${item.title}\n\n${item.subtitle}${
            item.example ? `\n\n\`\`\`tsx\n${item.example}\n\`\`\`` : ""
          }`}
          metadata={
            item.api?.length > 0 ? (
              <List.Item.Detail.Metadata>
                {item.api.map((part, partIndex) => [
                  partIndex > 0 && <List.Item.Detail.Metadata.Separator key={`sep-${part.title}`} />,
                  <List.Item.Detail.Metadata.Label
                    key={`title-${part.title}`}
                    title={part.title}
                    text={part.description.split("\n")[0]}
                  />,
                  ...part.props.map((p) => (
                    <List.Item.Detail.Metadata.TagList key={`${part.title}-${p.prop}`} title={p.prop}>
                      {p.type.split(" | ").map((t) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={t}
                          text={t.trim()}
                          color={getTypeColor(t.trim())}
                        />
                      ))}
                      {p.default !== "-" && (
                        <List.Item.Detail.Metadata.TagList.Item text={`= ${p.default}`} color={Color.SecondaryText} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                  )),
                ])}
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Documentation" url={item.href} />
          {item.example && (
            <Action.CopyToClipboard
              title="Copy Main Example"
              content={item.example}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy URL"
            content={item.href}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
