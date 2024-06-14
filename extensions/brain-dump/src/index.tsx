import { Form, ActionPanel, Action, showToast, Toast, AI, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";

type Values = {
  thought: string;
  category: string;
};

const categories = [
  { value: "personal", title: "Personal" },
  { value: "work", title: "Work" },
  { value: "friends", title: "Friends" },
  { value: "books", title: "Books to Read" },
  { value: "content", title: "Content ideas" },
  { value: "videos", title: "Videos to Watch" },
  { value: "others", title: "Others" },
  { value: "riad", title: "Riad Request" },
];

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";
const RIAD_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

function getAmazonSearchUrl(bookTitle: string) {
  const encodedTitle = encodeURIComponent(bookTitle);
  return `https://www.amazon.com/s?k=${encodedTitle}`;
}

function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

async function formatMessageWithRaycastAI(message: string): Promise<string> {
  if (!environment.canAccess(AI)) {
    console.warn("User doesn't have access to Raycast AI");
    return message;
  }

  try {
    const prompt = `
      Please format the following message based on the given rules:
      
      Message: "${message}"
      
      Format: "Hey Riad, Kasper had something that he wanted to share with you. {HEREGOESTEXTINFORMATTEDFORMAT} <@U0764P2S5V5>"
      
      Formatting Rules:
      - If it is following up a client/team member, ask him to follow up on the status of the project. Ask if there are blockers or if he needs any help. 
      - If it is revolved around a design task, it's always regarding Bohdan (our lead designer).
      - If it is revolved around a development task, it's always regarding Rehan (simple front-end), Jordy (backe-end), Adebayo (Instant) or Jesse (advanced front-end).
      - If it is asking him to setup a task, make it clear that we need to setup a task for the team to be setup on ClickUp. Ask Riad to set it up & send it in the internal channel. The internal channel should also be in the mssage and is always #int-NAMEOFTHECLIENT. The name is always lowercase. If it is a new client, ask him to create a new channel.
    `;

    const formattedMessage = await AI.ask(prompt, {
      model: AI.Model["OpenAI_GPT3.5-turbo"],
    });

    return formattedMessage;
  } catch (error) {
    console.error("Error formatting message with Raycast AI:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to format message with Raycast AI",
    });
    return message;
  }
}
export default function Command() {
  async function handleSubmit(values: Values) {
    try {
      const { thought, category } = values;
      const formattedDate = getFormattedDate();

      if (category === "work") {
        const workTasksFilePath = path.join(os.homedir(), "Documents", "daily thoughts", "work-tasks.txt");

        // Read the existing contents of the file
        let fileContents = "";
        try {
          fileContents = await fs.promises.readFile(workTasksFilePath, "utf-8");
        } catch (error) {
          // Ignore error if the file doesn't exist
        }

        // Check if the current date already exists in the file
        const dateIndex = fileContents.indexOf(formattedDate);

        let updatedContents = "";
        if (dateIndex === -1) {
          // If the current date doesn't exist, add it to the file
          updatedContents = `${fileContents}\n${formattedDate}\n`;
        } else {
          // If the current date exists, append the task to the existing list
          updatedContents = fileContents;
        }

        // Append the task to the file with bullet format
        updatedContents += `- ${thought}\n`;

        // Write the updated contents back to the file
        await fs.promises.writeFile(workTasksFilePath, updatedContents);

        showToast({ title: "Work task saved", message: "The task has been saved to work-tasks.txt" });

        // Send the thought to a private Slack channel
        await axios.post(SLACK_WEBHOOK_URL, {
          text: thought,
        });
        showToast({ title: "Thought submitted", message: "Your thought has been sent to the private Slack channel" });
      } else if (category === "riad") {
        // Format the message using Raycast AI
        const formattedMessage = await formatMessageWithRaycastAI(thought);

        // Send the formatted message to Riad in Slack
        await axios.post(RIAD_SLACK_WEBHOOK_URL, {
          text: formattedMessage,
        });
        showToast({ title: "Riad Request submitted", message: "Your request has been sent to Riad in Slack" });
      } else {
        const thoughtsFilePath = path.join(os.homedir(), "Documents", "daily thoughts", `${category}-thoughts.txt`);

        // Read the existing contents of the file
        let fileContents = "";
        try {
          fileContents = await fs.promises.readFile(thoughtsFilePath, "utf-8");
        } catch (error) {
          // Ignore error if the file doesn't exist
        }

        // Check if the current date already exists in the file
        const dateIndex = fileContents.indexOf(formattedDate);

        let updatedContents = "";
        if (dateIndex === -1) {
          // If the current date doesn't exist, add it to the file
          updatedContents = `${fileContents}\n${formattedDate}\n`;
        } else {
          // If the current date exists, append the thought to the existing list
          updatedContents = fileContents;
        }

        if (category === "books") {
          // Generate Amazon search URL for the book
          const searchUrl = getAmazonSearchUrl(thought);
          // Append the book title and search URL to the file with bullet format
          updatedContents += `- ${thought} (${searchUrl})\n`;
          showToast({ title: "Book saved", message: `The book has been saved to ${category}-thoughts.txt` });
        } else {
          // Append the thought to the file with bullet format
          updatedContents += `- ${thought}\n`;
          showToast({ title: "Thought submitted", message: `Your thought has been saved to ${category}-thoughts.txt` });
        }

        // Write the updated contents back to the file
        await fs.promises.writeFile(thoughtsFilePath, updatedContents);
      }
    } catch (error) {
      console.error("Error submitting thought:", error);
      showToast({ title: "Error", message: "Failed to submit thought. Please try again." });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Dump your thoughts here. Books will be saved and searched on Amazon." />
      <Form.TextArea id="thought" title="Thought" placeholder="Enter your thought" />
      <Form.Dropdown id="category" title="Category">
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.value} value={category.value} title={category.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
    </Form>
  );
}