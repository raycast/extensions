import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { showErrorToast } from "../lib/error-toast";
import { fetchPost } from "../lib/feeds";
import { postMarkdown } from "../lib/format";
import { ErrorScreen } from "./error-view";
import { PostActions } from "./post-actions";
import { PostMetadata } from "./post-metadata";

export function PostScreen({ post }: { post: string }) {
  const { data, error, isLoading, revalidate } = useCachedPromise(fetchPost, [post], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  if (error && !data && !isLoading) return <ErrorScreen error={error} onRetry={revalidate} />;
  return (
    <Detail
      isLoading={isLoading}
      markdown={data && postMarkdown(data)}
      metadata={data && <PostMetadata post={data} Metadata={Detail.Metadata} />}
      actions={data && <PostActions post={data} />}
    />
  );
}
