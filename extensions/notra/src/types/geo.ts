import type { ReactNode } from "react";
import type { Organization } from "./index";

export type GeoDashboardView =
  | "overview"
  | "visibility"
  | "share"
  | "languages"
  | "prompts"
  | "gaps"
  | "briefs"
  | "readiness"
  | "settings"
  | "traffic";

export interface GeoProject {
  brandSettingsId: string;
  createdAt: string;
  id: string;
  name: string;
}

export interface ListGeoProjectsResponse {
  organization: Organization;
  projects: GeoProject[];
}

export interface GeoSettings {
  aliases: string[];
  companyName: string;
  competitors: string[];
  createdAt: string;
  enabled: boolean;
  enforceZdr: boolean;
  engines: string[];
  id: string;
  isScanning: boolean;
  languages: string[];
  lastScanAt: string | null;
  nonZdrApprovedEngines: string[];
  organizationId: string;
  projectId: string;
  scanIntervalHours: number;
  scanStartedAt: string | null;
  updatedAt: string;
}

export interface GeoSettingsResponse {
  configured: boolean;
  organization: Organization;
  settings: GeoSettings | null;
}

export interface GeoOverviewEngine {
  avgPosition: number | null;
  checks: number;
  engine: string;
  lastCheckedAt: string;
  mentionRate: number;
  mentions: number;
}

export interface GeoVisibilityOverviewResponse {
  configured: boolean;
  engines: GeoOverviewEngine[];
  organization: Organization;
}

export interface GeoTimeseriesPoint {
  avgPosition?: number | null;
  checks: number;
  day: string;
  engine: string;
  mentions: number;
}

export interface GeoVisibilityTimeseriesResponse {
  configured: boolean;
  organization: Organization;
  points: GeoTimeseriesPoint[];
}

export interface GeoTrendPoint {
  day: string;
  value: number;
}

export interface GeoCompetitorSharePoint {
  brand: string;
  mentions: number;
  trend?: GeoTrendPoint[];
}

export interface GeoCompetitorTimeseriesPoint {
  brand: string;
  day: string;
  mentions: number;
}

export interface GeoCompetitorShareResponse {
  configured: boolean;
  organization: Organization;
  points: GeoCompetitorSharePoint[];
  timeseries: GeoCompetitorTimeseriesPoint[];
}

export interface GeoLanguageSharePoint {
  avgPosition: number | null;
  checks: number;
  language: string;
  mentionRate: number;
  mentions: number;
  trend?: GeoTrendPoint[];
}

export interface GeoLanguageShareResponse {
  configured: boolean;
  organization: Organization;
  points: GeoLanguageSharePoint[];
}

export interface GeoAnswerSource {
  domain: string;
  title: string;
  url: string;
}

export interface GeoPromptResult {
  answer: string;
  engine: string;
  excerpt: string;
  lastCheckedAt: string;
  mentioned: boolean;
  position: number | null;
  prompt: string;
  promptId: string;
  searchQueries: string[];
  sentiment: string | null;
  sources: GeoAnswerSource[];
}

export interface GeoPromptResultsResponse {
  configured: boolean;
  organization: Organization;
  results: GeoPromptResult[];
}

export interface GeoPrompt {
  createdAt: string | null;
  enabled: boolean;
  id: string;
  prompt: string;
  source: "auto" | "custom";
}

export interface GeoPromptsResponse {
  configured: boolean;
  organization: Organization;
  prompts: GeoPrompt[];
}

export interface GeoSequence {
  createdAt: string;
  enabled: boolean;
  id: string;
  name: string;
  steps: string[];
}

export interface GeoSequencesResponse {
  organization: Organization;
  sequences: GeoSequence[];
}

export interface GeoCompetitor {
  color: string | null;
  domain: string | null;
  id: string;
  kind: "direct" | "indirect";
  name: string;
  synonyms: string[];
}

export interface GeoCompetitorsResponse {
  competitors: GeoCompetitor[];
  organization: Organization;
}

export interface GeoGapBrief {
  briefId: string;
  postId: string | null;
  status: string;
  workingTitle: string | null;
}

export interface GeoPromptGap {
  brief: GeoGapBrief | null;
  competitors: string[];
  engineCoverage: number;
  engines: string[];
  id: string;
  opportunity: number;
  ownMentionRate: number;
  prompt: string;
  title: string | null;
}

export interface GeoSearchGap {
  brief: GeoGapBrief | null;
  id: string;
  impressions: number | null;
  prompt: string;
  title: string | null;
}

export interface GeoContentGapsResponse {
  hasScanData: boolean;
  organization: Organization;
  promptGaps: GeoPromptGap[];
  searchGaps: GeoSearchGap[];
}

export interface GeoContentBriefSummary {
  createdAt: string;
  id: string;
  postId: string | null;
  status: string;
  topic: string;
  workingTitle: string;
}

export interface GeoContentBriefsResponse {
  briefs: GeoContentBriefSummary[];
  organization: Organization;
}

export interface GeoContentBriefDocument {
  acceptanceChecklist: string[];
  audience: string;
  contentSubtype: string;
  intent: string;
  internalLinks: Array<{ anchor: string; url: string; why: string }>;
  jobToBeDone: string;
  questionsToAnswer: string[];
  sections: Array<{ claims: string[]; goal: string; heading: string }>;
  targetPrompt: string;
  workingTitle: string;
}

export interface GeoContentBriefResponse {
  brief: {
    autoApproved: boolean;
    brief: GeoContentBriefDocument;
    completedAt: string | null;
    createdAt: string;
    error: string | null;
    humanized: boolean;
    id: string;
    postId: string | null;
    runId: string | null;
    status: string;
    topic: string;
    updatedAt: string;
  };
  organization: Organization;
}

export interface GeoReadinessTier {
  available: number;
  earned: number;
  passing: number;
  total: number;
}

export interface GeoReadinessIssue {
  details: string | null;
  id: string;
  name: string;
  recommendation: string | null;
  result: "failed" | "partial";
  tier: "bonus" | "essential" | "recommended";
}

export interface GeoReadinessReport {
  createdAt: string;
  eligibleChecks: number | null;
  errorMessage: string | null;
  id: string;
  issues: GeoReadinessIssue[];
  reportUrl: string | null;
  scannedAt: string | null;
  score: number | null;
  scoreBreakdown: {
    bonus: { points: number; positiveSignals: number };
    essential: GeoReadinessTier;
    recommended: GeoReadinessTier;
  } | null;
  scoreLabel: string | null;
  status: "completed" | "failed" | "running";
  targetUrl: string;
}

export interface GeoAgentReadinessResponse {
  history: Array<{
    failedCount: number;
    id: string;
    partialCount: number;
    scannedAt: string;
    score: number | null;
  }>;
  organization: Organization;
  report: GeoReadinessReport | null;
  scan: GeoReadinessReport | null;
  targetUrl: string;
}

export type GeoVisitorType = "crawler" | "ai_referral" | "human" | "unknown";

export interface GeoTrafficSource {
  agent: string;
  category: string;
  confidence: string;
  lastSeenAt: string;
  markdownVisits: number;
  paths: number;
  previousVisits?: number;
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
}

export interface GeoTrafficPoint {
  day: string;
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
}

export interface GeoTrafficOverviewResponse {
  configured: boolean;
  organization: Organization;
  points: GeoTrafficPoint[];
  sources: GeoTrafficSource[];
  totals: {
    aiReferral: number;
    crawler: number;
  };
}

export interface GeoTrafficLogEntry {
  agent: string;
  capturedAt: string;
  category: string;
  confidence: string;
  country: string;
  host: string;
  journeyId: string;
  path: string;
  source: string;
  ua: string;
  visitorType: GeoVisitorType;
  wantsMarkdown: boolean;
}

export interface GeoTrafficLogResponse {
  configured: boolean;
  log: GeoTrafficLogEntry[];
  organization: Organization;
  total: number;
}

export interface GeoTrafficJourney {
  distinctPaths: number;
  firstSeenAt: string;
  journeyId: string;
  lastSeenAt: string;
  pages: number;
  samplePaths: string[];
  source: string;
  visitorType: GeoVisitorType;
}

export interface GeoTrafficJourneysResponse {
  configured: boolean;
  journeys: GeoTrafficJourney[];
  organization: Organization;
}

export interface GeoTrafficJourneyResponse {
  configured: boolean;
  events: Array<{
    agent: string;
    capturedAt: string;
    category: string;
    country: string;
    host: string;
    method: string;
    path: string;
    referer: string;
  }>;
  organization: Organization;
}

export interface GeoTrafficPage {
  lastSeenAt: string;
  path: string;
  previousVisits?: number;
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
}

export interface GeoTrafficPagesResponse {
  configured: boolean;
  organization: Organization;
  pages: GeoTrafficPage[];
}

export interface GeoIngestSetupResponse {
  ingestUrl: string;
  organization: Organization;
  snippet: string;
  snippets: {
    netlify: string;
    next: string;
    nuxt: string;
  };
}

export interface GeoDashboardData {
  briefs: GeoContentBriefsResponse;
  competitors: GeoCompetitorsResponse;
  competitorShare: GeoCompetitorShareResponse;
  configured: boolean | null;
  errors: string[];
  gaps: GeoContentGapsResponse;
  ingestSetup: GeoIngestSetupResponse | null;
  languageShare: GeoLanguageShareResponse;
  overview: GeoVisibilityOverviewResponse;
  prompts: GeoPromptsResponse;
  promptResults: GeoPromptResultsResponse;
  readiness: GeoAgentReadinessResponse | null;
  sequences: GeoSequencesResponse;
  settings: GeoSettingsResponse;
  timeseries: GeoVisibilityTimeseriesResponse;
  traffic: GeoTrafficOverviewResponse;
  trafficJourneys: GeoTrafficJourneysResponse;
  trafficLog: GeoTrafficLogResponse;
  trafficPages: GeoTrafficPagesResponse;
}

export interface CreateGeoScanResponse {
  organization: Organization;
  scanId: string;
  statusUrl: string;
}

export interface GeoDashboardProps {
  organization: Organization;
  project: GeoProject;
}

export interface GeoDashboardActionsProps {
  canRunScan: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
  organizationSlug: string;
  projectId: string;
}

export interface GeoDashboardItemsProps {
  actions: ReactNode;
  data: GeoDashboardData;
  days: number;
  onViewChange: (view: GeoDashboardView) => void;
  projectId: string;
  view: GeoDashboardView;
}

export interface GeoOverviewItemsProps {
  actions: ReactNode;
  data: GeoDashboardData;
  onViewChange: (view: GeoDashboardView) => void;
}

export interface GeoContentBriefDetailProps {
  briefId: string;
  projectId: string;
}

export interface GeoTrafficJourneyDetailProps {
  days: number;
  journeyId: string;
  projectId: string;
}
