export type FocusOption = {
  name: string;
  symbolImageName: string;
  modeIdentifier: string;
  isActive: boolean;
};

// CONFIGS
export type FocusModeConfig = {
  data: FocusModeConfigData[];
  header: Header;
};

export type FocusModeConfigData = {
  modeConfigurations: { [key: string]: ModeConfiguration };
};

type ModeConfiguration = {
  triggers: Triggers;
  automaticallyGenerated: boolean;
  mode: Mode;
  dimsLockScreen: number;
  configuration: Configuration;
  created: number;
  compatibilityVersion: number;
  hasSecureData: boolean;
  impactsAvailability: number;
  lastModified: number;
};

type Configuration = {
  suppressionType: number;
  compatibilityVersion: number;
  configurationType: number;
  minimumBreakthroughUrgency: number;
  hideApplicationBadges: number;
};

type Mode = {
  name: string;
  tintColorName: string;
  identifier: string;
  semanticType: number;
  symbolImageName: string;
  modeIdentifier: string;
  visibility: number;
};

type Triggers = {
  triggers: Trigger[];
};

type Trigger = {
  class: string;
  enabledSetting: number;
};

type Header = {
  version: number;
  timestamp: number;
};

// ASSERTION
export type FocusModeAssertion = {
  data: FocusModeAssertionData[];
  header: Header;
};

type FocusModeAssertionData = {
  storeInvalidationRecords: StoreInvalidationRecord[];
  storeInvalidationRequestRecords: StoreInvalidationRequestRecord[];
  storeAssertionRecords?: StoreAssertionRecord[];
};

type StoreAssertionRecord = {
  assertionUUID: string;
  assertionSource: Source;
  assertionStartDateTimestamp: number;
  assertionDetails: StoreAssertionRecordAssertionDetails;
};

type StoreAssertionRecordAssertionDetails = {
  assertionDetailsIdentifier: string;
  assertionDetailsModeIdentifier: string;
  assertionDetailsReason: string;
};

type Source = {
  assertionClientIdentifier: string;
};

type StoreInvalidationRecord = {
  invalidationAssertion: InvalidationAssertion;
  invalidationSource: TionSource;
  invalidationDateTimestamp: number;
  invalidationReason: string;
};

type InvalidationAssertion = {
  assertionUUID: string;
  assertionSource: TionSource;
  assertionStartDateTimestamp: number;
  assertionDetails: InvalidationAssertionAssertionDetails;
};

type InvalidationAssertionAssertionDetails = {
  assertionDetailsIdentifier: string;
  assertionDetailsModeIdentifier: string;
  assertionDetailsReason: string;
  assertionDetailsUserVisibleEndDate?: number;
  assertionDetailsLifetime?: AssertionDetailsLifetime;
};

type AssertionDetailsLifetime = {
  assertionDetailsScheduleLifetimeScheduleIdentifier: string;
  assertionDetailsLifetimeType: string;
  assertionDetailsScheduleLifetimeBehavior: string;
};

type TionSource = {
  assertionClientIdentifier: string;
  assertionSourceDeviceIdentifier?: string;
};

type StoreInvalidationRequestRecord = {
  invalidationRequestPredicate: InvalidationRequestPredicate;
  invalidationRequestReason: string;
  invalidationRequestUUID: string;
  invalidationRequestSource: Source;
  invalidationRequestDateTimestamp: number;
};

type InvalidationRequestPredicate = {
  invalidationPredicateType: string;
};
