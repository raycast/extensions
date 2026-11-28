import type { MediaKind } from "./params";

// What each command runs, as Wiro catalog categories, never as fixed models: the
// forms list each category's models live, so new models show up without an
// update to the extension.

export interface Job {
  /** Remembers the last model picked for this job. */
  id: string;
  /** Submit button title: "Generate Image". */
  title: string;
  /** The name in a job picker, when it differs from the title: "Text to Video". */
  label?: string;
  /** What the job makes, for messages: "image". */
  noun: string;
  /** Models of any of these categories. */
  categories: string[];
  /** The file the user brings, when the job starts from one. */
  input?: Exclude<MediaKind, "file">;
  /** How the prompt field shows. */
  prompt: "required" | "optional" | "hidden";
  promptTitle?: string;
  promptPlaceholder?: string;
  /** Leave out live (realtime) models, which a one-shot run cannot use. */
  skipLive?: boolean;
}

export const GENERATE_IMAGE: Job = {
  id: "generate-image",
  title: "Generate Image",
  noun: "image",
  categories: ["text-to-image"],
  prompt: "required",
  promptPlaceholder: "A lighthouse on a rocky coast at sunrise, soft light",
};

export interface EditOperation {
  id: string;
  title: string;
  job: Job;
}

export const EDIT_OPERATIONS: EditOperation[] = [
  {
    id: "edit",
    title: "Edit With a Prompt",
    job: {
      id: "edit-image",
      title: "Edit Image",
      label: "Edit With a Prompt",
      noun: "image",
      categories: ["image-editing"],
      input: "image",
      prompt: "required",
      promptPlaceholder: "What should change? For example: put the bottle on a wet black stone",
    },
  },
  {
    id: "upscale",
    title: "Upscale",
    job: {
      id: "upscale-image",
      title: "Upscale Image",
      label: "Upscale",
      noun: "image",
      categories: ["upscale"],
      input: "image",
      prompt: "hidden",
    },
  },
  {
    id: "remove-background",
    title: "Remove Background",
    job: {
      id: "remove-background",
      title: "Remove Background",
      label: "Remove Background",
      noun: "image",
      categories: ["background-removal"],
      input: "image",
      prompt: "hidden",
    },
  },
  {
    id: "restore",
    title: "Restore Old Photo",
    job: {
      id: "restore-photo",
      title: "Restore Photo",
      label: "Restore Old Photo",
      noun: "image",
      categories: ["restoration"],
      input: "image",
      prompt: "hidden",
    },
  },
];

export const GENERATE_VIDEO_FROM_TEXT: Job = {
  id: "text-to-video",
  title: "Generate Video",
  label: "Text to Video",
  noun: "video",
  categories: ["text-to-video"],
  prompt: "required",
  promptPlaceholder: "A slow aerial shot over a misty pine forest at dawn",
};

export const GENERATE_VIDEO_FROM_IMAGE: Job = {
  id: "image-to-video",
  title: "Generate Video",
  label: "Image to Video",
  noun: "video",
  categories: ["image-to-video"],
  input: "image",
  prompt: "optional",
  promptPlaceholder: "Describe the motion, for example: the camera slowly pushes in",
};

export const GENERATE_SPEECH: Job = {
  id: "text-to-speech",
  title: "Generate Speech",
  noun: "audio",
  categories: ["text-to-speech"],
  prompt: "required",
  promptTitle: "Text",
  promptPlaceholder: "The text to read aloud",
  skipLive: true,
};

export const GENERATE_MUSIC: Job = {
  id: "generate-music",
  title: "Generate Music",
  noun: "track",
  categories: ["text-to-music", "text-to-song"],
  prompt: "required",
  promptPlaceholder: "Warm acoustic guitar with soft percussion, relaxed and hopeful",
  skipLive: true,
};

export const TRANSCRIBE_AUDIO: Job = {
  id: "speech-to-text",
  title: "Transcribe Audio",
  noun: "transcript",
  categories: ["speech-to-text"],
  input: "audio",
  prompt: "hidden",
  skipLive: true,
};

/** The job for any model, picked in Run Model or Search Models. */
export function anyModelJob(): Job {
  return { id: "run-model", title: "Run Model", noun: "result", categories: [], prompt: "optional" };
}
