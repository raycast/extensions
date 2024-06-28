import fetch from "node-fetch";
import { random } from "../utils/api";
import { useState, useEffect } from "react";
import { Card } from "../types/types";

export const drawCards = (n: number) => {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(random(n));
      const data = await response.json();
      setCards(data as Card[] | null);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return { cards, isLoading };
};
