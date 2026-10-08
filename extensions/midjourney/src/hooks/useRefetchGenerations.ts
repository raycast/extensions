import { MJMessage } from "midjourney";
import { useEffect, useRef } from "react";
import { client } from "../lib/client";
import { findGeneration } from "../lib/findGeneration";
import { Generation } from "../types";

// Rechecks for incomplete generations every 10s and attempts to update their status
// todo: better way to handle this by re-establishing the websocket?
export function useRefetchGenerations(
  generations: Generation[],
  callback: (generation: Generation, message: Partial<MJMessage>) => void
) {
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function update() {
      const incompleteGenerations = generations.filter((gen) => gen.progress !== "done");
      console.log(`processing ${incompleteGenerations.length}`);

      if (incompleteGenerations.length === 0) return;

      const messages = await client.RetrieveMessages(100);

      incompleteGenerations.forEach((gen) => {
        const message = findGeneration(messages, gen);
        if (message) {
          console.log(`found incomplete for ${gen.prompt}`);
          callback(gen, message);
        }
      });
    }
    update();
    intervalId.current = setInterval(update, 10000); // Run update every 10s

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, []);
}
