import { Action, ActionPanel, Detail } from "@raycast/api";
import { Teardown } from "./types";
import { registrationUrl, teardownUrl } from "./urls";

type Props = { teardown: Teardown; source: "latest" | "daily" };

export default function TeardownDetail({ teardown, source }: Props) {
  const date = new Date(teardown.published_at).toLocaleDateString();
  const markdown = `# ${teardown.title}

**${teardown.category}** · **${teardown.score.toFixed(1)}/10** · ${date}

${teardown.excerpt}

---

Read the full teardown on NicheFund for the failure mechanics, reality check, and safer alternatives. Then explore validated ideas that avoid the same trap.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Read Full Teardown"
            url={teardownUrl(teardown, source)}
          />
          <Action.OpenInBrowser
            title="Explore Validated Ideas Free"
            url={registrationUrl(source)}
          />
          <Action.CopyToClipboard
            title="Copy Link"
            content={teardownUrl(teardown, source)}
          />
          <Action.CopyToClipboard title="Copy Title" content={teardown.title} />
        </ActionPanel>
      }
    />
  );
}
