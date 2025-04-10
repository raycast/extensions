import { ActionPanel, Form, Action, showToast, Toast, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { push } = useNavigation();

  async function handleSubmit(values: { url: string }) {
    setIsSubmitting(true);

    try {
      const response = await fetch("https://playtester.io/api/games/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: values.url,
          // You might want to add user_id if you have it
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as SubmissionResponse;
        const errorMessage = data.message || "Failed to submit game";
        await showToast({
          style: Toast.Style.Failure,
          title: "Submission Failed",
          message: errorMessage,
        });
        setIsSubmitting(false);
        return;
      }

      const data = (await response.json()) as SubmissionResponse;

      // Handle different response cases
      if (data.exists && data.status === "approved" && data.game) {
        // Game already exists in the database
        push(<GameSuccessView game={data.game} />);
        return;
      } else if (data.exists && data.status === "pending") {
        // Game is already pending review
        await showToast({
          style: Toast.Style.Success,
          title: "Already Submitted",
          message: "This game has already been submitted and is pending review.",
        });
      } else {
        // New submission successful
        await showToast({
          style: Toast.Style.Success,
          title: "Game Submitted",
          message: "Your game has been submitted for review!",
        });
      }
    } catch (error) {
      console.error("Error submitting game:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Submission Failed",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Submit a game to be added to Playtester." />
      <Form.TextField
        id="url"
        title="Game URL"
        placeholder="https://store.steampowered.com/app/123456/GameName/"
        info="Enter a URL from Steam, PlayStation, Xbox, Nintendo, Epic Games, Google Play, Apple App Store, or itch.io"
        autoFocus
      />
    </Form>
  );
}

// This export is used by Raycast, the warning can be ignored
export default function Command() {
  return <SubmitGameForm />;
}
