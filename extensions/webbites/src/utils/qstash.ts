import { Client } from "@upstash/qstash";

// URL validation helper
export const isValidUrl = (text: string): boolean => {
  try {
    new URL(text);
    return true;
  } catch {
    // Check for URLs without protocol
    try {
      new URL(`https://${text}`);
      return text.includes(".") && !text.includes(" ");
    } catch {
      return false;
    }
  }
};

// Save to WebBites via Qstash
export const saveTabToQstash = async (data: {
  url: string;
  title?: string;
  userId: string;
  topic: string;
  queueName?: string;
  siteNotes?: string;
  tags?: string[];
  customId?: string | null;
}) => {
  try {
    const { url, title, userId, topic, queueName, siteNotes, tags, customId } =
      data;

    console.log("Saving tab to Qstash:", {
      url,
      title,
      userId,
      topic,
      queueName,
      siteNotes,
      tags,
      customId,
    });

    const QSTASH_TOKEN =
      "eyJVc2VySUQiOiI1ZGM3MGU3Ny03N2RjLTQ4MzctYTExOS0xZDVhNTY0NjhlYTAiLCJQYXNzd29yZCI6IjJjOWVlOWY5ZjAxZTRjZTY4NTY2N2ZhN2JiNWM3NzAxIn0=";

    // Initialize QStash client with token
    const client = new Client({
      token: QSTASH_TOKEN,
    });

    const payload = {
      data: {
        url,
        siteTitle: title || "",
        userId,
        type: "website",
        customId: customId || null,
        siteNotes: siteNotes || "",
        tags: tags || [],
        savedAt: new Date().toISOString(),
      },
      userId,
      type: topic,
    };

    const result = await client.publishJSON({
      url: "https://api.webbites.io/qstash-webhook",
      body: payload,
    });

    return result;
  } catch (error) {
    console.error("Error saving tab to Qstash:", error);
    throw error;
  }
};
