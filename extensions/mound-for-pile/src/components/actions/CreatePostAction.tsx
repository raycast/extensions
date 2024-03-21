import { Action, Icon } from "@raycast/api";
import { CreatePostForm } from "../forms/CreatePostForm";
import { HighlightI } from "../../utils/types";

export default function CreatePostAction(props: { onCreate: (content: string, highlight: HighlightI) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Post"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreatePostForm onCreate={props.onCreate} />}
    />
  );
}
