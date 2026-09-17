import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { RANDOM_IDEA_API_URL } from "./api";
import { RandomIdeaResponse } from "./types";
import { registrationUrl } from "./urls";

export default function RandomBusinessIdea() {
  const { data, isLoading, error, revalidate } = useFetch<RandomIdeaResponse>(
    RANDOM_IDEA_API_URL,
    {
      failureToastOptions: {
        title: "Couldn’t load a business idea",
        message: "Please wait a moment and try again.",
      },
    },
  );
  const idea = data?.idea;

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }

  if (!idea) {
    return (
      <Detail
        markdown={
          error
            ? "## Couldn’t load a business idea\n\nPlease wait a moment and try again."
            : ""
        }
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={revalidate} />
            <Action.OpenInBrowser
              title="Explore Validated Ideas Free"
              url={registrationUrl("random")}
            />
          </ActionPanel>
        }
      />
    );
  }

  const audience = idea.is_b2c ? "B2C" : "B2B";
  const markdown = `# ${idea.title}

**${idea.category}** · **${idea.score.toFixed(1)}/10** · **${audience}**

${idea.summary}

${idea.target_audience ? `## Who Needs This\n\n${idea.target_audience}` : ""}

---

Explore the solution blueprint, monetization model, and more validated ideas on NicheFund. A free account lets you filter the Idea Bank and find opportunities that fit your skills.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Explore & Filter Ideas Free"
            url={registrationUrl("random")}
          />
          <Action title="Show Another Idea" onAction={revalidate} />
          <Action.CopyToClipboard
            title="Copy Idea Summary"
            content={`${idea.title}\n\n${idea.summary}`}
          />
        </ActionPanel>
      }
    />
  );
}
