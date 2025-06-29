import { Sourcegraph } from "../../sourcegraph";
import { BlobContentsFragment } from "../../sourcegraph/gql/operations";
import { doQuery } from "../../sourcegraph/gql/auth";

/**
 * Read the contents of a specific file from a Sourcegraph instance
 */
export async function executeFileRead(
  src: Sourcegraph,
  repository: string,
  path: string,
  revision?: string,
  startLine?: number,
  endLine?: number,
): Promise<{ content: string; url: string; repository: string; path: string; revision?: string } | null> {
  try {
    const abortController = new AbortController();

    // Use doQuery to get file contents
    const contentArgs =
      startLine !== undefined || endLine !== undefined
        ? `(startLine: ${startLine || 0}, endLine: ${endLine || -1})`
        : "";

    const query = `{
      repository(name: ${JSON.stringify(repository)}) {
        id
        commit(rev: ${JSON.stringify(revision || "HEAD")}) {
          id
          blob(path: ${JSON.stringify(path)}) {
            path
            content${contentArgs}
            binary
            byteSize
          }
        }
      }
    }`;

    const data = await doQuery<{
      repository: {
        id: string;
        commit: {
          id: string;
          blob: BlobContentsFragment | null;
        } | null;
      } | null;
    }>(abortController.signal, src, "GetFileContents", query);

    if (!data?.repository?.commit?.blob?.content) {
      return null;
    }

    const blob = data.repository.commit.blob;

    return {
      content: blob.content,
      url: `${src.instance}${repository}/-/blob/${path}${revision ? `?rev=${revision}` : ""}`,
      repository,
      path,
      revision,
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
