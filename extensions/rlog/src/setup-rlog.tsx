import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState } from "react";

interface Preferences {
  blogPath: string;
  dataPath: string;
}

const PAGE_TEMPLATE = `
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ReadingEntry {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  addedDate: string;
  thoughts?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function ReadingPage() {
  // Read data at build time
  const dataPath = join(process.cwd(), 'data', 'reading.json');
  let readings: ReadingEntry[] = [];

  try {
    if (existsSync(dataPath)) {
      const fileContent = readFileSync(dataPath, 'utf-8');
      readings = fileContent.trim() ? JSON.parse(fileContent) : [];
    }
  } catch (error) {
    console.error('Error reading reading.json:', error);
    readings = [];
  }

  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Reading Log</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-2">
        Articles, papers, and posts I've read, in reverse chronological order.
      </p>
      <a
        href="https://github.com/ossa-ma/rlog"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mb-8 block"
      >
        Managed with rlog ↗
      </a>

      <div className="space-y-4">
        {readings.map((entry, index) => (
          <div key={index} className="flex flex-col">
            <div className="flex w-full justify-between items-baseline gap-4">
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline truncate"
              >
                {entry.title}
              </a>
              <div className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {entry.author && <span>{entry.author}</span>}
                {entry.author && entry.publishedDate && <span className="mx-2">•</span>}
                {entry.publishedDate && (
                  <span>{formatDate(entry.publishedDate)}</span>
                )}
              </div>
            </div>

            {entry.thoughts && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {entry.thoughts}
              </p>
            )}

            <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-mono">
              Read on {formatDate(entry.addedDate)}
            </div>
          </div>
        ))}

        {readings.length === 0 && (
          <p className="text-neutral-600 dark:text-neutral-400">Nothing yet. Hmm...</p>
        )}
      </div>
    </section>
  );
}
`;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting up...",
    });

    try {
      const blogPath = preferences.blogPath;

      // 1. Create Data File
      const dataDir = path.join(blogPath, path.dirname(preferences.dataPath));
      const dataFile = path.join(blogPath, preferences.dataPath);

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, "[]");
        toast.message = "Created data/reading.json";
      }

      // 2. Create Page File
      // Assuming Next.js App Router structure
      const pageDir = path.join(blogPath, "app", "reading");
      const pageFile = path.join(pageDir, "page.tsx");

      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }

      if (!fs.existsSync(pageFile)) {
        fs.writeFileSync(pageFile, PAGE_TEMPLATE.trim());
        toast.style = Toast.Style.Success;
        toast.title = "Setup Complete!";
        toast.message = "Created app/reading/page.tsx";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Already Setup";
        toast.message = "Files already exist.";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Setup Failed";
      toast.message = String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Setup" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This will create 'data/reading.json' and 'app/reading/page.tsx' in your blog repository if they don't exist." />
    </Form>
  );
}
