import { Color, List } from "@raycast/api";
import { UniformType } from "../../types/uniform-type";

export function UniformTypeDetail(props: { uniformType: UniformType }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Default Application"
            text={props.uniformType.application.name}
            icon={{ fileIcon: props.uniformType.application.path }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Uniform Type Identifier" text={props.uniformType.id} />
          <List.Item.Detail.Metadata.Label
            title="Preferred File Extension"
            text={
              props.uniformType.preferredFilenameExtension
                ? `.${props.uniformType.preferredFilenameExtension}`
                : { value: "-", color: Color.SecondaryText }
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Preferred MIME Type"
            text={
              props.uniformType.preferredMimeType
                ? props.uniformType.preferredMimeType
                : { value: "-", color: Color.SecondaryText }
            }
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
