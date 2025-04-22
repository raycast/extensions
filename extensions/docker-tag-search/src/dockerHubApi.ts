// Update the DockerTag interface to include the publish date
export interface DockerTag {
  id: number;
  name: string;
  architectures: string[];
  date: string; // ISO 8601 formatted date
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 1000 * 60) {
    const seconds = Math.floor(diff / 1000);
    return `${seconds} seconds ago`;
  } else if (diff < 1000 * 60 * 60) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minutes ago`;
  } else if (diff < 1000 * 60 * 60 * 24) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours ago`;
  } else {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
  }
}

export async function* fetchTagsIncrementally(
  repository: string,
  namespace: string = "library"
): AsyncGenerator<DockerTag[]> {
  const baseUrl = `https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags`;
  const pageSize = 100;
  let page = 1;

  try {
    while (true) {
      const url = `${baseUrl}?page=${page}&page_size=${pageSize}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tags (status ${response.status})`);
      }
      const data = (await response.json()) as {
        next?: string;
        results: {
          name: string;
          id: number;
          images?: { architecture: string; variant?: string; last_pushed?: string }[];
        }[];
      };
      const tags: DockerTag[] = [];

      for (const result of data.results) {
        const tagName: string = result.name;

        const timestamps = result?.images
          ?.map((img) => img.last_pushed)
          .filter((dateStr): dateStr is string => Boolean(dateStr))
          .map((dateStr) => new Date(dateStr))
          .filter((date) => !isNaN(date.getTime()));

        const lastUpdated = timestamps?.length
          ? formatRelativeTime(new Date(Math.max(...timestamps.map((d) => d.getTime()))))
          : "an unknown time ago";

        const archList: string[] =
          result.images
            ?.map((img) => {
              let arch = img.architecture;
              if (img.variant) {
                arch += `/${img.variant}`;
              }
              if (arch === "unknown") {
                return null;
              }
              return arch;
            })
            .filter((x): x is string => x !== null) || [];

        const uniqueArchs = Array.from(new Set(archList));
        uniqueArchs.sort();
        tags.push({ date: lastUpdated, name: tagName, architectures: uniqueArchs, id: result.id });
      }

      yield tags; // Emit the tags for this page

      if (!data.next) {
        break;
      }
      page += 1;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || "Failed to fetch tags from Docker Hub");
    }
    throw new Error("Failed to fetch tags from Docker Hub");
  }
}
