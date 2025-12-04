import { Color, Detail } from "@raycast/api";

export function Dependencies(props: {
  title: string;
  dependencies: string[] | undefined;
  isInstalled: (name: string) => boolean;
}) {
  if (!props.dependencies || props.dependencies.length == 0) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title={props.title}>
      {props.dependencies.map((dependency) => (
        <Detail.Metadata.TagList.Item
          key={dependency}
          text={dependency}
          color={props.isInstalled(dependency) ? Color.Green : Color.PrimaryText}
        />
      ))}
    </Detail.Metadata.TagList>
  );
}
