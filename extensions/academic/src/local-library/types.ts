import type { WorkKind, WorkResult } from "../types";

export type AnalysisEngine =
  "local" | "ollama" | "raycast" | "openai" | "anthropic" | "gemini";

export type RenameMode = "off" | "suggest" | "automatic";
export type DocumentStage =
  | "discovered"
  | "extracted"
  | "identified"
  | "verified"
  | "enriched"
  | "review"
  | "error";

export type DocumentEvidence = {
  doi?: string;
  isbn?: string;
  embeddedTitle?: string;
  embeddedAuthors: string[];
  ocrTitle?: string;
  ocrAuthors: string[];
  ocrText?: string;
  textSample?: string;
  ocrMethod?: "apple-vision" | "tesseract" | "direct-text" | "unavailable";
  ocrCompleted: boolean;
};

export type ValidationCheck = {
  id: "identifier" | "title" | "author" | "conflict" | "ocr";
  label: string;
  passed: boolean;
  score?: number;
  detail: string;
};

export type RenameValidation = {
  safe: boolean;
  confidence: number;
  checks: ValidationCheck[];
  reason: string;
};

export type DocumentAnalysis = {
  engine: AnalysisEngine;
  model?: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  topics: string[];
  methods: string[];
  analyzedAt: string;
  inputFingerprint: string;
};

export type QuantizedEmbedding = {
  engine: "local" | "ollama" | "openai";
  model: string;
  dimensions: number;
  scale: number;
  values: string;
};

export type LocalDocument = {
  id: string;
  path: string;
  filename: string;
  extension: string;
  size: number;
  modifiedAt: number;
  fingerprint: string;
  stage: DocumentStage;
  discoveredAt: string;
  updatedAt: string;
  evidence?: DocumentEvidence;
  work?: WorkResult;
  validation?: RenameValidation;
  analysis?: DocumentAnalysis;
  embedding?: QuantizedEmbedding;
  suggestedFilename?: string;
  renamedFrom?: string;
  error?: string;
};

export type LocalIndex = {
  version: 1;
  updatedAt: string;
  lastScanAt?: string;
  analysisEnabled?: boolean;
  folders: string[];
  documents: LocalDocument[];
};

export type IndexProgress = {
  total: number;
  discovered: number;
  extracted: number;
  identified: number;
  verified: number;
  enriched: number;
  review: number;
  errors: number;
  percent: number;
};

export type AnalysisInput = {
  title?: string;
  authors: string[];
  kind?: WorkKind;
  abstract?: string;
  text: string;
  fingerprint: string;
};

export type AnalysisOutput = Omit<
  DocumentAnalysis,
  "engine" | "model" | "analyzedAt" | "inputFingerprint"
>;
