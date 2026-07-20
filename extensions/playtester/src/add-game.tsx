import { ActionPanel, Form, Action, showToast, Toast, Detail, useNavigation, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

interface SubmissionResponse {
  message?: string;
  exists?: boolean;
  status?: string;
  game?: {
    thumbnail: string;
    title: string;
    slug: string;
    date_added: string;
  };
}

function GameSuccessView({ game }: { game: { thumbnail: string; title: string; slug: string; date_added: string } }) {
  const formattedDate = new Date(game.date_added).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markdown = `
# Game Already Available: ${game.title}

![${game.title}](${game.thumbnail})

This game is already available on Playtester! It was added on ${formattedDate}.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Playtester" url={`https://playtester.io/${game.slug}`} />
        </ActionPanel>
      }
    />
  );
}

function SubmitGameForm() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm({
    onSubmit: async (values: { url: string }) => {
      try {
        const response = await fetch("https://playtester.io/api/games/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: values.url,
          }),
        });

        const data = (await response.json()) as SubmissionResponse;

        if (!response.ok) {
          const errorMessage = data.message || "Failed to submit game";
          await showToast({
            style: Toast.Style.Failure,
            title: "Submission Failed",
            message: errorMessage,
          });
          return;
        }

        if (data.exists && data.status === "approved" && data.game) {
          push(<GameSuccessView game={data.game} />);
          return;
        } else if (data.exists && data.status === "pending") {
          await showToast({
            style: Toast.Style.Success,
            title: "Already Submitted",
            message: "This game has already been submitted and is pending review.",
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Game Submitted",
            message: "Your game has been submitted for review!",
          });
        }
      } catch (error) {
        console.error("Error submitting game:", error);
        await showFailureToast(error, { title: "Submission Failed" });
      }
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        try {
          new URL(value);
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Game" icon={Icon.GameController} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Submit a game to be added to Playtester." />
      <Form.TextField
        title="Game URL"
        placeholder="https://store.steampowered.com/app/123456/GameName/"
        info="Enter a URL from Steam, PlayStation, Xbox, Nintendo, Epic Games, Google Play, Apple App Store, or itch.io"
        autoFocus
        {...itemProps.url}
      />
    </Form>
  );
}

// This export is used by Raycast, the warning can be ignored
export default function Command() {
  return <SubmitGameForm />;
}
