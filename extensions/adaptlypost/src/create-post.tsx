import { LaunchProps } from "@raycast/api";
import { CreatePostForm } from "./components/create-post-form";
import { PostDraft } from "./lib/format";

export default function Command({ draftValues }: LaunchProps<{ draftValues: Partial<PostDraft> }>) {
  return <CreatePostForm draftValues={draftValues} />;
}
