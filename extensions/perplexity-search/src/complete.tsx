import { AI, getPreferenceValues } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import iconv from "iconv-lite";
import fetch from "node-fetch";

interface Preferencs {
  queryImprovement: boolean,
}


async function askAI(query: string, signal: AbortSignal): Promise<string[] | null> {
  console.log(query);
  const option: AI.AskOptions = {
    creativity: 0.5,
    signal
  }
  const prompt = 
`You will be given an imcomplete topic, and your task is to generate related query according to it. 
Best to include the original topic in your completion. 
Do not answer the query directly. 
Make the query more specific or more general, and provide multiple completions, each on a new line.

Example:
Topic: Machine learning
Completion:
What are the different types of machine learning algorithms?
What are the challenges in training machine learning models?
How does supervised learning differ from unsupervised learning?
What are the ethical considerations in machine learning?
What are the latest advancements in machine learning?
What are the common pitfalls in machine learning projects?
How can machine learning be integrated with IoT devices?

Example:
Topic: Speculative decoding paper
Completion:
What are the most outstanding papers for speculative decoding?
What are the different drafting methods discussed in speculative decoding papers?
How does speculative decoding compare to traditional auto-regressive decoding?
What are the future research directions for speculative decoding?
What are the experimental results of speculative decoding on various benchmarks?
How does speculative decoding perform in multimodal large language models?
What are the recent advancements in speculative decoding techniques?

Example:
Topic: Rust tutorial
Completion:
How can I set up a Rust development environment on macOS?
How can I debug Rust programs effectively?
What are the most useful Rust libraries and frameworks for beginners?
What are the common pitfalls for beginners in Rust programming?
What are the key concepts of Rust's type system?
What are some advanced Rust topics that go beyond the basics?
What are the best online courses and tutorials for learning Rust?

Now it's your turn!

Topic: ${query}
Completion:
`;
  try {
    const response = await AI.ask(prompt, option);
    const candidates = response.split("\n");
    return candidates;
  } catch (error) {
    return null;
  } 
}

export async function askGoogle(searchText: string, signal: AbortSignal): Promise<string[] | null> {
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=${encodeURIComponent(searchText)}`,
      {
        method: "get",
        signal: signal,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
        },
      }
    );

    if (!response.ok) {
      return Promise.reject(response.statusText);
    }

    const buffer = await response.arrayBuffer();
    const text = iconv.decode(Buffer.from(buffer), "iso-8859-1");
    const json = JSON.parse(text);

    const results: string[] = [];

    json[1].map((item: string, i: number) => {
      const type = json[4]["google:suggesttype"][i];

      if (type === "QUERY") {
        results.push(item);
      }
    });

    return results;
  } catch (error) {
    return null;
  }
}

export function searchCompletion() {
  const [query, setQuery] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  

  async function search(query: string) {
    if (query.length == 0) {
      return ;
    }
    setQuery(query);

    if (controller.current) {
      controller.current?.abort();
      controller.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const new_controller = new AbortController();
      controller.current = new_controller;

      let response: string[] | null = null;
      if (getPreferenceValues<Preferencs>().queryImprovement) {
        response = await askAI(query, new_controller.signal);
      } else {
        response = await askGoogle(query, new_controller.signal);
      }
      if (response) {
        setCandidates(response);
      }
    }, 200);
  }

  useEffect(() => {
    const results = candidates.slice();
    if (query) {
      results.unshift(query);
    }
    setResults(results);
  }, [query, candidates]);

  return {
    search, 
    results
  }
}