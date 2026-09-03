export enum Creativity {
  None = 0,
  Low = 0.2,
  Medium = 0.8,
  High = 1.5,
  Maximum = 2,
}

export enum ThinkingEffort {
  None = "false",
  Low = "low",
  Medium = "medium",
  High = "high",
}

export enum ChatMessageRole {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Tool = "tool",
}

export enum ModelCapability {
  Completion = "completion",
  Tools = "tools",
  Insert = "insert",
  Vision = "vision",
  Embedding = "embedding",
  Thinking = "thinking",
}
