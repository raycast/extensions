export interface StreamOptions {
  prompt: string;
  model: "deepseek-chat" | "deepseek-reasoner";
  apiKey: string;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChat(options: StreamOptions): Promise<void> {
  const { prompt, model, apiKey, signal, onChunk, onComplete, onError } =
    options;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    return new Promise<void>((resolve, reject) => {
      let fullText = "";
      let buffer = "";
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        onComplete(fullText);
        resolve();
      };

      response.body!.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            finish();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(fullText);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      });

      response.body!.on("end", finish);

      response.body!.on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return; // cancelled, no error
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
