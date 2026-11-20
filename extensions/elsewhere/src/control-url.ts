export type ExperienceCommand = {
  kind: "experience";
  action: "play" | "pause";
};

export type SpaceCommand = {
  kind: "space";
  action: "select";
  id: string;
};

export type MusicCommand =
  | {
      kind: "music";
      action: "on" | "off";
    }
  | {
      kind: "music";
      action: "select";
      id: string;
    };

export type VolumeCommand =
  | {
      kind: "volume";
      target: "ambience" | "music";
      value: number;
    }
  | {
      kind: "volume";
      target: "ambience" | "music";
      delta: number;
    };

export type SourceCommand = {
  kind: "source";
  action: "enable" | "disable";
  id: string;
};

export type NavigationCommand = {
  kind: "navigation";
  destination: "main" | "sources" | "settings";
};

export type CreateSpaceFromPromptCommand = {
  kind: "space";
  action: "create";
  prompt: string;
};

export type ElsewhereCommand =
  | ExperienceCommand
  | SpaceCommand
  | MusicCommand
  | VolumeCommand
  | SourceCommand
  | NavigationCommand
  | CreateSpaceFromPromptCommand;

function finiteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

function clamped(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export const CREATE_SPACE_PROMPT_MAX_LENGTH = 1200;

export function normalizeCreateSpacePrompt(prompt: string): string {
  const normalized = prompt.trim();
  if (normalized.length === 0) throw new TypeError("Prompt must not be empty.");
  if (normalized.length > CREATE_SPACE_PROMPT_MAX_LENGTH) {
    throw new TypeError(`Prompt must be at most ${CREATE_SPACE_PROMPT_MAX_LENGTH} characters.`);
  }
  return normalized;
}

function baseUrl(command: ElsewhereCommand): URL {
  if (command.kind === "experience") return new URL(`elsewhere://${command.action}`);
  if (command.kind === "space") {
    return new URL(command.action === "select" ? "elsewhere://space/select" : "elsewhere://space/create");
  }
  if (command.kind === "music") {
    return new URL(command.action === "select" ? "elsewhere://music/select" : `elsewhere://music/${command.action}`);
  }
  if (command.kind === "volume") return new URL(`elsewhere://volume/${command.target}`);
  if (command.kind === "source") return new URL(`elsewhere://source/${command.action}`);

  const path = command.destination === "main" ? "" : `/${command.destination}`;
  return new URL(`elsewhere://open${path}`);
}

export function buildElsewhereUrl(command: ElsewhereCommand, requestId?: string, requestNonce?: string): string {
  const url = baseUrl(command);

  if (command.kind === "space" && command.action === "select") {
    url.searchParams.set("id", command.id);
  } else if (command.kind === "space" && command.action === "create") {
    normalizeCreateSpacePrompt(command.prompt);
    if (!requestId || !requestNonce) throw new TypeError("Space creation requires a private request envelope.");
    url.searchParams.set("nonce", requestNonce);
  } else if (command.kind === "source") {
    url.searchParams.set("id", command.id);
  } else if (command.kind === "music" && command.action === "select") {
    url.searchParams.set("id", command.id);
  } else if (command.kind === "volume") {
    if ("value" in command) {
      const value = clamped(finiteNumber(command.value, "Volume value"), 0, 100);
      url.searchParams.set("value", String(value));
    } else {
      const delta = clamped(finiteNumber(command.delta, "Volume delta"), -100, 100);
      url.searchParams.set("delta", String(delta));
    }
  }

  if (requestId) url.searchParams.set("requestId", requestId);
  return url.toString();
}
