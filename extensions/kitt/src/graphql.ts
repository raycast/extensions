import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import { print } from 'graphql'
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `JSON` scalar type represents JSON values */
  JSON: { input: any; output: any; }
};

export type Access = {
  __typename?: 'Access';
  device?: Maybe<Device>;
  id: Scalars['String']['output'];
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
  location?: Maybe<Location>;
  locationId: Scalars['String']['output'];
  managed: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  network?: Maybe<NetworkConfig>;
  relay: Scalars['String']['output'];
  type?: Maybe<AccessType>;
  user?: Maybe<User>;
};

export type AccessBeingConfigured = {
  __typename?: 'AccessBeingConfigured';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AccessConfigured = {
  __typename?: 'AccessConfigured';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AccessCreated = {
  __typename?: 'AccessCreated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AccessDeleted = {
  __typename?: 'AccessDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AccessInput = {
  device?: InputMaybe<Device>;
  id: Scalars['String']['input'];
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  locationId: Scalars['String']['input'];
  managed: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  network?: InputMaybe<NetworkConfigInput>;
  relay: Scalars['String']['input'];
  type?: InputMaybe<AccessType>;
};

export type AccessLog = {
  __typename?: 'AccessLog';
  access?: Maybe<Access>;
  accessId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  internalOpenerName: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  openedAt?: Maybe<Timestamp>;
  openerCompanyId: Scalars['String']['output'];
  openerCompanyType: Scalars['Int']['output'];
  openerName: Scalars['String']['output'];
};

export type AccessLogEdge = {
  __typename?: 'AccessLogEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<AccessLog>;
};

export enum AccessMethod {
  KeyboxInKittOffice = 'KEYBOX_IN_KITT_OFFICE',
  KeyboxOnSite = 'KEYBOX_ON_SITE',
  KittApp = 'KITT_APP',
  LandlordContact = 'LANDLORD_CONTACT',
  ManagingAgentContact = 'MANAGING_AGENT_CONTACT',
  OnsiteAccessSystem = 'ONSITE_ACCESS_SYSTEM',
  OnsiteReceptionist = 'ONSITE_RECEPTIONIST'
}

export type AccessMethodOptional = {
  __typename?: 'AccessMethodOptional';
  accessMethod?: Maybe<AccessMethod>;
  user?: Maybe<User>;
};

export type AccessMethodOptionalInput = {
  accessMethod?: InputMaybe<AccessMethod>;
};

export enum AccessType {
  Door = 'DOOR',
  Lift = 'LIFT'
}

export type AccessUpdated = {
  __typename?: 'AccessUpdated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AccountRecoveryStarted = {
  __typename?: 'AccountRecoveryStarted';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Activity = {
  __typename?: 'Activity';
  assignee?: Maybe<User>;
  assigneeId?: Maybe<Scalars['String']['output']>;
  brokerContact?: Maybe<Profile>;
  brokerContactId?: Maybe<Scalars['String']['output']>;
  clientIds?: Maybe<Array<Scalars['String']['output']>>;
  clients?: Maybe<Array<Maybe<Profile>>>;
  completedAt?: Maybe<Timestamp>;
  createdAt?: Maybe<Timestamp>;
  createdBy?: Maybe<Scalars['String']['output']>;
  deal?: Maybe<Deal>;
  dealId?: Maybe<Scalars['String']['output']>;
  deletedAt?: Maybe<Timestamp>;
  dueDate?: Maybe<Scalars['String']['output']>;
  dueTime?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  kittCollaboratorIds?: Maybe<Array<Scalars['String']['output']>>;
  kittCollaborators?: Maybe<Array<Maybe<Profile>>>;
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  notes?: Maybe<Scalars['String']['output']>;
  parentActivityId?: Maybe<Scalars['String']['output']>;
  reportingAssignee?: Maybe<User>;
  reportingAssigneeId?: Maybe<Scalars['String']['output']>;
  selections?: Maybe<Array<Maybe<Selection>>>;
  startDate?: Maybe<Scalars['String']['output']>;
  startTime?: Maybe<Scalars['String']['output']>;
  status?: Maybe<DealActivityStatus>;
  title?: Maybe<Scalars['String']['output']>;
  type?: Maybe<ActivityType>;
  typeId?: Maybe<Scalars['String']['output']>;
  unitGroupIds?: Maybe<Array<Scalars['String']['output']>>;
  unitIds?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
};


export type ActivityDealArgs = {
  unscoped?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ActivityCompleted = {
  __typename?: 'ActivityCompleted';
  activity?: Maybe<Activity>;
  user?: Maybe<User>;
};

export type ActivityConnection = {
  __typename?: 'ActivityConnection';
  edges?: Maybe<Array<ActivityEdge>>;
  pageInfo?: Maybe<ActivityPageInfo>;
  totalCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type ActivityCreated = {
  __typename?: 'ActivityCreated';
  activity?: Maybe<Activity>;
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ActivityDeleted = {
  __typename?: 'ActivityDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ActivityEdge = {
  __typename?: 'ActivityEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Activity>;
  user?: Maybe<User>;
};

export type ActivityInput = {
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  brokerContactId?: InputMaybe<Scalars['String']['input']>;
  clientIds?: InputMaybe<Array<Scalars['String']['input']>>;
  completedAt?: InputMaybe<TimestampInput>;
  createdAt?: InputMaybe<TimestampInput>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  dealId?: InputMaybe<Scalars['String']['input']>;
  deletedAt?: InputMaybe<TimestampInput>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  dueTime?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  kittCollaboratorIds?: InputMaybe<Array<Scalars['String']['input']>>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  parentActivityId?: InputMaybe<Scalars['String']['input']>;
  reportingAssigneeId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<DealActivityStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ActivityTypeInput>;
  typeId?: InputMaybe<Scalars['String']['input']>;
  unitGroupIds?: InputMaybe<Array<Scalars['String']['input']>>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
  updatedAt?: InputMaybe<TimestampInput>;
};

export enum ActivityOrder {
  DueFirst = 'DUE_FIRST',
  DueLast = 'DUE_LAST',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC'
}

export type ActivityPageInfo = {
  __typename?: 'ActivityPageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ActivityType = {
  __typename?: 'ActivityType';
  createdAt?: Maybe<Timestamp>;
  deletedAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type ActivityTypeInput = {
  createdAt?: InputMaybe<TimestampInput>;
  deletedAt?: InputMaybe<TimestampInput>;
  id: Scalars['String']['input'];
  label: Scalars['String']['input'];
  updatedAt?: InputMaybe<TimestampInput>;
};

export type ActivityUpdated = {
  __typename?: 'ActivityUpdated';
  activity?: Maybe<Activity>;
  user?: Maybe<User>;
};

export type AddSelectionsCommand = {
  __typename?: 'AddSelectionsCommand';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  selections?: Maybe<Array<Selection>>;
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type AddShortlistsToDealCommand = {
  __typename?: 'AddShortlistsToDealCommand';
  dealId: Scalars['String']['output'];
  shortlistIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type AddUserToLeadTenantsGroupCommand = {
  __typename?: 'AddUserToLeadTenantsGroupCommand';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type Addon = {
  __typename?: 'Addon';
  allowMultiple: Scalars['Boolean']['output'];
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  imageUploadIds: Array<Scalars['String']['output']>;
  images?: Maybe<Array<Maybe<UploadMessage>>>;
  name: Scalars['String']['output'];
  pricePennies: Scalars['Int']['output'];
  pricePeriod?: Maybe<AddonPeriod>;
};

export type AddonCreated = {
  __typename?: 'AddonCreated';
  id: Scalars['String']['output'];
};

export type AddonDeleted = {
  __typename?: 'AddonDeleted';
  id: Scalars['String']['output'];
};

export type AddonEdge = {
  __typename?: 'AddonEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Addon>;
};

export type AddonInput = {
  allowMultiple: Scalars['Boolean']['input'];
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  imageUploadIds: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  pricePennies: Scalars['Int']['input'];
  pricePeriod?: InputMaybe<AddonPeriod>;
};

export enum AddonPeriod {
  Annually = 'ANNUALLY',
  Daily = 'DAILY',
  Hourly = 'HOURLY',
  Monthly = 'MONTHLY',
  Once = 'ONCE',
  Weekly = 'WEEKLY'
}

export type AddonUpdated = {
  __typename?: 'AddonUpdated';
  id: Scalars['String']['output'];
};

export type AddonsConnection = {
  __typename?: 'AddonsConnection';
  edges?: Maybe<Array<AddonEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type Address = {
  __typename?: 'Address';
  country: Scalars['String']['output'];
  postalCode: Scalars['String']['output'];
  streetAddress: Scalars['String']['output'];
  town: Scalars['String']['output'];
};

export type AddressInput = {
  country: Scalars['String']['input'];
  postalCode: Scalars['String']['input'];
  streetAddress: Scalars['String']['input'];
  town: Scalars['String']['input'];
};

export type AgenciesForLocationUpdated = {
  __typename?: 'AgenciesForLocationUpdated';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AgencyDomain = {
  __typename?: 'AgencyDomain';
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  domainRegex: Scalars['String']['output'];
  domainSubstring: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AgencyDomainAndCompanyCreated = {
  __typename?: 'AgencyDomainAndCompanyCreated';
  agencyDomain?: Maybe<AgencyDomain>;
  company?: Maybe<Company>;
  user?: Maybe<User>;
};

export enum AgentSetUp {
  BoltOnService = 'BOLT_ON_SERVICE',
  EnterpriseClient = 'ENTERPRISE_CLIENT',
  JointAgent = 'JOINT_AGENT',
  SoleAgent = 'SOLE_AGENT'
}

export type AgentSetUpOptional = {
  __typename?: 'AgentSetUpOptional';
  agentSetUp?: Maybe<AgentSetUp>;
  user?: Maybe<User>;
};

export type AgentSetUpOptionalInput = {
  agentSetUp?: InputMaybe<AgentSetUp>;
};

export type Alarm = {
  __typename?: 'Alarm';
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Amenity = {
  __typename?: 'Amenity';
  entityIds?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  global: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};


export type AmenityEntityIdsArgs = {
  floorplanId?: InputMaybe<Scalars['String']['input']>;
  teamIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  tenancyId?: InputMaybe<Scalars['String']['input']>;
};

export type AmenityDeleted = {
  __typename?: 'AmenityDeleted';
  amenity?: Maybe<Amenity>;
  user?: Maybe<User>;
};

export type AmenityList = {
  __typename?: 'AmenityList';
  amenities?: Maybe<Array<Amenity>>;
  user?: Maybe<User>;
};

export type AmenitySaved = {
  __typename?: 'AmenitySaved';
  amenity?: Maybe<Amenity>;
  user?: Maybe<User>;
};

export type AnnualPricingBreakdown = {
  __typename?: 'AnnualPricingBreakdown';
  annualAdvertisedPricePsf?: Maybe<Money>;
  annualBrokerCommission?: Maybe<Money>;
  annualFitoutCostPsf?: Maybe<Money>;
  annualKittFeePsf?: Maybe<Money>;
  annualNetRentPsf?: Maybe<Money>;
  annualOpsCostPsf?: Maybe<Money>;
  annualRatesPsf?: Maybe<Money>;
  annualServiceChargePsf?: Maybe<Money>;
  annualUtilitiesCostPsf?: Maybe<Money>;
};

export type AnswerSession = {
  __typename?: 'AnswerSession';
  answeredBy: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum App {
  Search = 'Search',
  Tenant = 'Tenant'
}

export type AppHeaderUploadForTenancySet = {
  __typename?: 'AppHeaderUploadForTenancySet';
  tenancyId: Scalars['String']['output'];
  uploadId: Scalars['String']['output'];
};

export type ApproveFloorplan = {
  __typename?: 'ApproveFloorplan';
  floorplanId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ApproveShortlistCommand = {
  __typename?: 'ApproveShortlistCommand';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type ArchiveLocationCommand = {
  __typename?: 'ArchiveLocationCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ArchiveRequestCommand = {
  __typename?: 'ArchiveRequestCommand';
  requestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ArchiveTemplateCommand = {
  __typename?: 'ArchiveTemplateCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Area = {
  __typename?: 'Area';
  areaType?: Maybe<AreaType>;
  centerPoint?: Maybe<Coordinate>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  northeastPoint?: Maybe<Coordinate>;
  polygon?: Maybe<Array<Coordinate>>;
  southwestPoint?: Maybe<Coordinate>;
  user?: Maybe<User>;
};

export type AreaGeoPoint = {
  __typename?: 'AreaGeoPoint';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type AreaGeoPointInput = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
};

export enum AreaType {
  City = 'CITY',
  DuplicateSubmarket = 'DUPLICATE_SUBMARKET',
  Submarket = 'SUBMARKET'
}

export type AssignSalesTeamToBrokerCompanyCommand = {
  __typename?: 'AssignSalesTeamToBrokerCompanyCommand';
  brokerCompanyId: Scalars['String']['output'];
  salesTeamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AssignUserToDeskCommand = {
  __typename?: 'AssignUserToDeskCommand';
  deskId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type Assignment = {
  __typename?: 'Assignment';
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

/** The associated resource entity of an permission */
export type AssociatedResource = Access | Room;

export type AttachTaskToRequestCommand = {
  __typename?: 'AttachTaskToRequestCommand';
  requestId: Scalars['String']['output'];
  taskId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type AttachToRequestCommand = {
  __typename?: 'AttachToRequestCommand';
  attachmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum AttachedEntity {
  Enquiry = 'Enquiry',
  Issue = 'Issue',
  None = 'NONE'
}

export type AttachedEntityData = {
  __typename?: 'AttachedEntityData';
  entity?: Maybe<VisitAttachedEntity>;
  id: Scalars['String']['output'];
  type?: Maybe<AttachedEntity>;
};

export type AttachedEntityDataInput = {
  id: Scalars['String']['input'];
  type?: InputMaybe<AttachedEntity>;
};

export type Attendance = {
  __typename?: 'Attendance';
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  date?: Maybe<Date>;
  id: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type AttendanceBatchSet = {
  __typename?: 'AttendanceBatchSet';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type AttendanceCreated = {
  __typename?: 'AttendanceCreated';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type AttendanceDeleted = {
  __typename?: 'AttendanceDeleted';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type AttendancePoliciesList = {
  __typename?: 'AttendancePoliciesList';
  breakdown?: Maybe<AttendancePolicyBreakdown>;
  items?: Maybe<Array<AttendancePolicy>>;
  user?: Maybe<User>;
};

export type AttendancePolicy = {
  __typename?: 'AttendancePolicy';
  position: Scalars['Int']['output'];
  type?: Maybe<AttendancePolicyType>;
  user?: Maybe<User>;
};

export type AttendancePolicyBreakdown = {
  __typename?: 'AttendancePolicyBreakdown';
  details?: Maybe<PolicyDetails>;
  numOfCompulsoryDays: Scalars['Int']['output'];
  numOfFlexibleDays: Scalars['Int']['output'];
  numOfOptionalDays: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type AttendancePolicyInput = {
  position: Scalars['Int']['input'];
  type?: InputMaybe<AttendancePolicyType>;
};

export enum AttendancePolicyType {
  Compulsory = 'Compulsory',
  Flexible = 'Flexible',
  Optional = 'Optional'
}

export type AttendanceStateForDate = {
  __typename?: 'AttendanceStateForDate';
  attendeeCount?: Maybe<Scalars['Int']['output']>;
  attendeeUserIds: Array<Scalars['String']['output']>;
  attendees?: Maybe<Array<Maybe<User>>>;
  date?: Maybe<Date>;
  isAtCapacity?: Maybe<Scalars['Boolean']['output']>;
  isUserAttending: Scalars['Boolean']['output'];
  percentageOfCapacity?: Maybe<Scalars['Float']['output']>;
  totalCapacity: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type AttendanceValue = {
  __typename?: 'AttendanceValue';
  entityId: Scalars['String']['output'];
  value: Scalars['Int']['output'];
};

export type AuthenticationFactorSelected = {
  __typename?: 'AuthenticationFactorSelected';
  email: Scalars['String']['output'];
  type?: Maybe<AuthenticationFactorType>;
  user?: Maybe<User>;
};

export enum AuthenticationFactorType {
  None = 'NONE',
  Sms = 'SMS'
}

export enum AvailabilityStatus {
  Available = 'AVAILABLE',
  ComingAvailable = 'COMING_AVAILABLE',
  LetAgreed = 'LET_AGREED',
  NotAvailable = 'NOT_AVAILABLE',
  UnderOffer = 'UNDER_OFFER',
  Unknown = 'UNKNOWN'
}

export type AverageAccessLog = {
  __typename?: 'AverageAccessLog';
  count: Scalars['Int']['output'];
  day: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  timeInterval: Scalars['Int']['output'];
};

export type AverageAccessesByDay = {
  __typename?: 'AverageAccessesByDay';
  averageAccesses?: Maybe<Array<AverageAccessLog>>;
  day: Scalars['Int']['output'];
  id: Scalars['String']['output'];
};

/** bank holiday field types */
export type BankHoliday = {
  __typename?: 'BankHoliday';
  bankHolidays?: Maybe<Array<Maybe<RegionalData>>>;
};

export type BatchAmenityResponse = {
  __typename?: 'BatchAmenityResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchBookingsResponse = {
  __typename?: 'BatchBookingsResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchDeskPermanentlyAssignedUserIdResponse = {
  __typename?: 'BatchDeskPermanentlyAssignedUserIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchDeskResponse = {
  __typename?: 'BatchDeskResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchEntitiesForAmenityResponse = {
  __typename?: 'BatchEntitiesForAmenityResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchFloorplanResponse = {
  __typename?: 'BatchFloorplanResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchFloorplanZoneResponse = {
  __typename?: 'BatchFloorplanZoneResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchGeometryResponse = {
  __typename?: 'BatchGeometryResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchRoomResponse = {
  __typename?: 'BatchRoomResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BatchSetAttendanceCommand = {
  __typename?: 'BatchSetAttendanceCommand';
  dates?: Maybe<Array<Date>>;
  user?: Maybe<User>;
};

export type BatchTotalDesksForTeamResponse = {
  __typename?: 'BatchTotalDesksForTeamResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type BookRoomResponse = {
  __typename?: 'BookRoomResponse';
  success: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export enum BookableEntity {
  DeskEntity = 'DeskEntity',
  RoomEntity = 'RoomEntity',
  Unknown = 'Unknown'
}

export type Booking = {
  __typename?: 'Booking';
  bookedBy?: Maybe<User>;
  bookedById: Scalars['String']['output'];
  cancelledBy?: Maybe<User>;
  cancelledById: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  email: Scalars['String']['output'];
  end?: Maybe<Timestamp>;
  endDatetime?: Maybe<DateTime>;
  endLocal?: Maybe<Timestamp>;
  endLocalFull: Scalars['String']['output'];
  endLocalReadable: Scalars['String']['output'];
  endLocalTime: Scalars['String']['output'];
  id: Scalars['String']['output'];
  img: Scalars['String']['output'];
  name: Scalars['String']['output'];
  people: Scalars['Int']['output'];
  room: Room;
  roomId: Scalars['String']['output'];
  start?: Maybe<Timestamp>;
  startDatetime?: Maybe<DateTime>;
  startLocal?: Maybe<Timestamp>;
  startLocalFull: Scalars['String']['output'];
  startLocalReadable: Scalars['String']['output'];
  startLocalTime: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type BookingCancelled = {
  __typename?: 'BookingCancelled';
  bookingId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type BookingConfirmed = {
  __typename?: 'BookingConfirmed';
  bookingId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type BookingCreated = {
  __typename?: 'BookingCreated';
  booking?: Maybe<RoomOrDeskBooking>;
  user?: Maybe<User>;
};

export type BookingDeleted = {
  __typename?: 'BookingDeleted';
  booking?: Maybe<RoomOrDeskBooking>;
  user?: Maybe<User>;
};

export type BookingEdge = {
  __typename?: 'BookingEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Booking>;
  user?: Maybe<User>;
};

export type BookingFailed = {
  __typename?: 'BookingFailed';
  roomId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type BookingList = {
  __typename?: 'BookingList';
  bookings?: Maybe<Array<RoomOrDeskBooking>>;
  user?: Maybe<User>;
};

export type BookingRoomCreatedEffect = {
  __typename?: 'BookingRoomCreatedEffect';
  room?: Maybe<MeetingRoom>;
  user?: Maybe<User>;
};

export type BookingRoomDeletedEffect = {
  __typename?: 'BookingRoomDeletedEffect';
  room?: Maybe<MeetingRoom>;
  user?: Maybe<User>;
};

export type BookingRoomUpdatedEffect = {
  __typename?: 'BookingRoomUpdatedEffect';
  room?: Maybe<MeetingRoom>;
  user?: Maybe<User>;
};

export enum BookingSortBy {
  CreatedAt = 'CREATED_AT',
  StartDate = 'START_DATE'
}

export type BookingTimeInput = {
  __typename?: 'BookingTimeInput';
  date: Scalars['String']['output'];
  time: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BookingTimeInputInput = {
  date: Scalars['String']['input'];
  time: Scalars['String']['input'];
};

export type BookingTimelineConnection = {
  __typename?: 'BookingTimelineConnection';
  edges?: Maybe<Array<BookingTimelineEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type BookingTimelineEdge = {
  __typename?: 'BookingTimelineEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<BookingTimelineEvent>;
};

export type BookingTimelineEvent = {
  __typename?: 'BookingTimelineEvent';
  entity?: Maybe<BookingTimelineEventUnion>;
  id: Scalars['String']['output'];
  type?: Maybe<BookingTimelineEventType>;
};

export enum BookingTimelineEventType {
  Attendance = 'ATTENDANCE',
  Guest = 'GUEST',
  Room = 'ROOM',
  Unknown = 'UNKNOWN'
}

export type BookingTimelineEventUnion = Attendance | Booking | Guest;

export type BookingsCancelledByPermanentDeskAssignment = {
  __typename?: 'BookingsCancelledByPermanentDeskAssignment';
  assignedToDeskId: Scalars['String']['output'];
  assignedToUserId: Scalars['String']['output'];
  bookings?: Maybe<Array<RoomOrDeskBooking>>;
  reassignedFromUserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BookingsConnection = {
  __typename?: 'BookingsConnection';
  edges?: Maybe<Array<BookingEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type Bookingsvc_GetBookingRequest = {
  __typename?: 'Bookingsvc_GetBookingRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Bookingsvc_GetBookingResponse = {
  __typename?: 'Bookingsvc_GetBookingResponse';
  booking?: Maybe<RoomOrDeskBooking>;
  user?: Maybe<User>;
};

export type Bookingsvc_GetRoomsRequest = {
  __typename?: 'Bookingsvc_GetRoomsRequest';
  ids: Array<Scalars['String']['output']>;
  locationIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type Bookingsvc_GetRoomsResponse = {
  __typename?: 'Bookingsvc_GetRoomsResponse';
  rooms?: Maybe<Array<MeetingRoom>>;
  user?: Maybe<User>;
};

export type Boundary = {
  __typename?: 'Boundary';
  id: Scalars['String']['output'];
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  polygon?: Maybe<Array<AreaGeoPoint>>;
};

export type BreakClause = {
  __typename?: 'BreakClause';
  completed: Scalars['Boolean']['output'];
  date?: Maybe<Timestamp>;
  exercised: Scalars['Boolean']['output'];
  exercisedAt?: Maybe<Date>;
  exercisedBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  optionDate?: Maybe<Timestamp>;
};

export type BreakClauseExercised = {
  __typename?: 'BreakClauseExercised';
  breakClauseId: Scalars['String']['output'];
  exercisedAt?: Maybe<Date>;
};

export type BreakClauseInput = {
  completed: Scalars['Boolean']['input'];
  date?: InputMaybe<TimestampInput>;
  exercised: Scalars['Boolean']['input'];
  exercisedAt?: InputMaybe<DateInput>;
  exercisedBy?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  optionDate?: InputMaybe<TimestampInput>;
};

export type Breakdown = {
  __typename?: 'Breakdown';
  advertisedPrice?: Maybe<Money>;
  brokerCommission?: Maybe<Money>;
  businessRates?: Maybe<Money>;
  fitoutCost?: Maybe<Money>;
  kittFee?: Maybe<Money>;
  netRent?: Maybe<Money>;
  opsCost?: Maybe<Money>;
  serviceCharge?: Maybe<Money>;
  user?: Maybe<User>;
  utilitiesCost?: Maybe<Money>;
};

export type Brochure = {
  __typename?: 'Brochure';
  createdBy: Scalars['String']['output'];
  entities?: Maybe<Array<BrochureEntity>>;
  entityGroupId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  stateJson: Scalars['String']['output'];
  templateForEntityId?: Maybe<Scalars['String']['output']>;
  type?: Maybe<BrochureType>;
  updatedBy: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrochureCreated = {
  __typename?: 'BrochureCreated';
  brochure?: Maybe<Brochure>;
  user?: Maybe<User>;
};

export type BrochureDeleted = {
  __typename?: 'BrochureDeleted';
  brochure?: Maybe<Brochure>;
  user?: Maybe<User>;
};

export type BrochureEntity = {
  __typename?: 'BrochureEntity';
  brochureId?: Maybe<Scalars['String']['output']>;
  entity?: Maybe<EntityUnion>;
  entityId: Scalars['String']['output'];
  id?: Maybe<Scalars['String']['output']>;
  type?: Maybe<BrochureEntityType>;
  user?: Maybe<User>;
};

export type BrochureEntityInput = {
  brochureId?: InputMaybe<Scalars['String']['input']>;
  entityId: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<BrochureEntityType>;
};

export enum BrochureEntityType {
  BrokerSearch = 'BrokerSearch',
  Location = 'Location',
  Selection = 'Selection',
  Shortlist = 'Shortlist',
  Unit = 'Unit',
  UnitGroup = 'UnitGroup',
  Unknown = 'Unknown'
}

export type BrochureTemplateCloned = {
  __typename?: 'BrochureTemplateCloned';
  brochure?: Maybe<Brochure>;
  user?: Maybe<User>;
};

export enum BrochureType {
  CompiledBrochure = 'COMPILED_BROCHURE',
  MasterTemplate = 'MASTER_TEMPLATE'
}

export type BrochureUpdated = {
  __typename?: 'BrochureUpdated';
  brochure?: Maybe<Brochure>;
  user?: Maybe<User>;
};

export type BrokerCommunication = {
  __typename?: 'BrokerCommunication';
  createdBy: Scalars['String']['output'];
  createdByUser?: Maybe<User>;
  email: Scalars['String']['output'];
  selectionId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrokerEnquiriesFulfilled = {
  __typename?: 'BrokerEnquiriesFulfilled';
  enquiries?: Maybe<Array<BrokerEnquiry>>;
  user?: Maybe<User>;
};

export type BrokerEnquiry = {
  __typename?: 'BrokerEnquiry';
  brokerSearchId: Scalars['String']['output'];
  brokerUserId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  enquiryId: Scalars['String']['output'];
  unitGroupId: Scalars['String']['output'];
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type BrokerEnquiryCreated = {
  __typename?: 'BrokerEnquiryCreated';
  brokerId: Scalars['String']['output'];
  unitGroupId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum BrokerPayee {
  Kitt = 'KITT',
  Landlord = 'LANDLORD'
}

export type BrokerPayeeOptionalInput = {
  brokerPayee?: InputMaybe<BrokerPayee>;
};

export enum BrokerPlatformRegistrationFailureReason {
  CompanyNotWhitelisted = 'COMPANY_NOT_WHITELISTED',
  EmailAlreadyExists = 'EMAIL_ALREADY_EXISTS',
  UnkownFailure = 'UNKOWN_FAILURE'
}

export type BrokerSearch = {
  __typename?: 'BrokerSearch';
  approvedAt?: Maybe<Timestamp>;
  approvedBy: Scalars['String']['output'];
  approver?: Maybe<Profile>;
  clientName: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  createdByCompanyId: Scalars['String']['output'];
  createdByUserId: Scalars['String']['output'];
  dealId?: Maybe<Scalars['String']['output']>;
  desiredLocation: Scalars['String']['output'];
  dismissedRecommendations?: Maybe<Array<DismissedRecommendation>>;
  id: Scalars['String']['output'];
  kittChoicesOnly: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  requirements?: Maybe<DealRequirements>;
  selections?: Maybe<Array<Selection>>;
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ViewingRequest>>;
  viewings?: Maybe<Viewings>;
};

export type BrokerSearchCreated = {
  __typename?: 'BrokerSearchCreated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrokerSearchDeleted = {
  __typename?: 'BrokerSearchDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrokerSearchPolygonUpdated = {
  __typename?: 'BrokerSearchPolygonUpdated';
  brokerSearchId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrokerSearchUpdated = {
  __typename?: 'BrokerSearchUpdated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BrokerSearchesBatchResponse = {
  __typename?: 'BrokerSearchesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type Building = {
  __typename?: 'Building';
  agents?: Maybe<Array<Maybe<Profile>>>;
  archivedAt?: Maybe<Date>;
  baselinesMetFrom?: Maybe<Date>;
  createdAt?: Maybe<Date>;
  details?: Maybe<BuildingDetails>;
  displayId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isLiveOnSearch: Scalars['Boolean']['output'];
  liveFrom?: Maybe<Date>;
  nonRejectedTenancies?: Maybe<Array<Maybe<Tenancy>>>;
  photos?: Maybe<Array<Maybe<UploadMessage>>>;
  priority?: Maybe<PriorityType>;
  traits?: Maybe<Array<BuildingTrait>>;
  units?: Maybe<Array<Maybe<BuildingUnit>>>;
  updatedAt?: Maybe<Date>;
  user?: Maybe<User>;
};

export type BuildingDetails = {
  __typename?: 'BuildingDetails';
  address?: Maybe<Address>;
  coordinates?: Maybe<Coordinate>;
  currency?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  photoUploadIds: Array<Scalars['String']['output']>;
  primaryAccessMethod?: Maybe<Scalars['String']['output']>;
  serviceChargePsf?: Maybe<Money>;
  timezoneId?: Maybe<Scalars['String']['output']>;
  urls?: Maybe<Array<BuildingSourceUrl>>;
  user?: Maybe<User>;
  withinBidLevyArea?: Maybe<Scalars['Boolean']['output']>;
};

export type BuildingDetailsInput = {
  address?: InputMaybe<AddressInput>;
  coordinates?: InputMaybe<CoordinateInput>;
  currency?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  photoUploadIds: Array<Scalars['String']['input']>;
  primaryAccessMethod?: InputMaybe<Scalars['String']['input']>;
  serviceChargePsf?: InputMaybe<MoneyInput>;
  timezoneId?: InputMaybe<Scalars['String']['input']>;
  urls?: InputMaybe<Array<BuildingSourceUrlInput>>;
  withinBidLevyArea?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BuildingInput = {
  __typename?: 'BuildingInput';
  archive?: Maybe<Scalars['Boolean']['output']>;
  delete?: Maybe<Scalars['Boolean']['output']>;
  details?: Maybe<BuildingDetails>;
  id?: Maybe<Scalars['String']['output']>;
  traits?: Maybe<Array<BuildingTraitInput>>;
  user?: Maybe<User>;
};

export type BuildingInputInput = {
  archive?: InputMaybe<Scalars['Boolean']['input']>;
  delete?: InputMaybe<Scalars['Boolean']['input']>;
  details?: InputMaybe<BuildingDetailsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  traits?: InputMaybe<Array<BuildingTraitInputInput>>;
};

export type BuildingSaved = {
  __typename?: 'BuildingSaved';
  building?: Maybe<Building>;
  units?: Maybe<Array<BuildingUnit>>;
  user?: Maybe<User>;
};

export type BuildingSourceUrl = {
  __typename?: 'BuildingSourceUrl';
  agency?: Maybe<Company>;
  agent?: Maybe<Profile>;
  agentProfileId?: Maybe<Scalars['String']['output']>;
  companyId: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BuildingSourceUrlInput = {
  agentProfileId?: InputMaybe<Scalars['String']['input']>;
  companyId: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type BuildingSubmitted = {
  __typename?: 'BuildingSubmitted';
  id: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BuildingTrait = {
  __typename?: 'BuildingTrait';
  iconId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  notPresent: Scalars['Boolean']['output'];
  type?: Maybe<BuildingTraitType>;
  upload?: Maybe<UploadMessage>;
  uploadId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BuildingTraitCreated = {
  __typename?: 'BuildingTraitCreated';
  trait?: Maybe<BuildingTrait>;
  user?: Maybe<User>;
};

export type BuildingTraitInput = {
  __typename?: 'BuildingTraitInput';
  id: Scalars['String']['output'];
  notPresent: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type BuildingTraitInputInput = {
  id: Scalars['String']['input'];
  notPresent: Scalars['Boolean']['input'];
};

export enum BuildingTraitType {
  Breeam = 'BREEAM',
  Compliance = 'Compliance',
  CustomFacility = 'CustomFacility',
  EssentialFacility = 'EssentialFacility',
  OptionalFacility = 'OptionalFacility'
}

export type BuildingUnit = {
  __typename?: 'BuildingUnit';
  archivedAt?: Maybe<Date>;
  baselinesMetFrom?: Maybe<Date>;
  building?: Maybe<Building>;
  combinationDetails?: Maybe<CombinationDetails>;
  createdAt?: Maybe<Date>;
  details?: Maybe<BuildingUnitDetails>;
  displayId: Scalars['String']['output'];
  floorplans?: Maybe<Array<Maybe<UploadMessage>>>;
  id: Scalars['String']['output'];
  liveFrom?: Maybe<Date>;
  locationId: Scalars['String']['output'];
  photos?: Maybe<Array<Maybe<UploadMessage>>>;
  pricing?: Maybe<GetDetailsForUnitsResponse>;
  priority?: Maybe<PriorityType>;
  updatedAt?: Maybe<Date>;
  user?: Maybe<User>;
};


export type BuildingUnitPricingArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type BuildingUnitDetails = {
  __typename?: 'BuildingUnitDetails';
  breakDate?: Maybe<Date>;
  businessRatesPsf?: Maybe<Money>;
  fitoutStatus?: Maybe<UnitFitoutState>;
  floorNumbers: Array<Scalars['Float']['output']>;
  floorplanUploadIds: Array<Scalars['String']['output']>;
  isKittFlexSpace?: Maybe<Scalars['Boolean']['output']>;
  isKittSpace?: Maybe<Scalars['Boolean']['output']>;
  isMarketedByKitt?: Maybe<Scalars['Boolean']['output']>;
  legalStructureType?: Maybe<BuildingUnitLegalStructureType>;
  marketingPrice?: Maybe<Money>;
  minimumTermMonths?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  photoUploadIds: Array<Scalars['String']['output']>;
  publishedOnWebsite?: Maybe<Scalars['Boolean']['output']>;
  rateableValue?: Maybe<Money>;
  rentFreeMonths?: Maybe<Scalars['Int']['output']>;
  rentPsf?: Maybe<Money>;
  squareFootage?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<UnitAvailabilityStatus>;
  unitType?: Maybe<BuildingUnitType>;
  user?: Maybe<User>;
  virtualTourUrl?: Maybe<Scalars['String']['output']>;
};

export type BuildingUnitDetailsInput = {
  breakDate?: InputMaybe<DateInput>;
  businessRatesPsf?: InputMaybe<MoneyInput>;
  fitoutStatus?: InputMaybe<UnitFitoutState>;
  floorNumbers: Array<Scalars['Float']['input']>;
  floorplanUploadIds: Array<Scalars['String']['input']>;
  isKittFlexSpace?: InputMaybe<Scalars['Boolean']['input']>;
  isKittSpace?: InputMaybe<Scalars['Boolean']['input']>;
  isMarketedByKitt?: InputMaybe<Scalars['Boolean']['input']>;
  legalStructureType?: InputMaybe<BuildingUnitLegalStructureType>;
  marketingPrice?: InputMaybe<MoneyInput>;
  minimumTermMonths?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  photoUploadIds: Array<Scalars['String']['input']>;
  publishedOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  rateableValue?: InputMaybe<MoneyInput>;
  rentFreeMonths?: InputMaybe<Scalars['Int']['input']>;
  rentPsf?: InputMaybe<MoneyInput>;
  squareFootage?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<UnitAvailabilityStatus>;
  unitType?: InputMaybe<BuildingUnitType>;
  virtualTourUrl?: InputMaybe<Scalars['String']['input']>;
};

export type BuildingUnitInput = {
  __typename?: 'BuildingUnitInput';
  archive?: Maybe<Scalars['Boolean']['output']>;
  delete?: Maybe<Scalars['Boolean']['output']>;
  details?: Maybe<BuildingUnitDetails>;
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type BuildingUnitInputInput = {
  archive?: InputMaybe<Scalars['Boolean']['input']>;
  delete?: InputMaybe<Scalars['Boolean']['input']>;
  details?: InputMaybe<BuildingUnitDetailsInput>;
  id?: InputMaybe<Scalars['String']['input']>;
};

export enum BuildingUnitLegalStructureType {
  CoLease = 'CoLease',
  LeasePlusMsa = 'LeasePlusMSA',
  LicenseAgreement = 'LicenseAgreement'
}

export type BuildingUnitRestored = {
  __typename?: 'BuildingUnitRestored';
  unit?: Maybe<BuildingUnit>;
  unitId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum BuildingUnitType {
  SelfContainedBuilding = 'SelfContainedBuilding',
  SingleFloor = 'SingleFloor',
  ThreeFloor = 'ThreeFloor',
  TwoFloor = 'TwoFloor'
}

export type BuildingUnits = {
  __typename?: 'BuildingUnits';
  units?: Maybe<Array<BuildingUnit>>;
  user?: Maybe<User>;
};

export type BuildingsMerged = {
  __typename?: 'BuildingsMerged';
  mergeIntoId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type BusynessInsight = {
  __typename?: 'BusynessInsight';
  dayPosition: Scalars['Int']['output'];
  entityId: Scalars['String']['output'];
};

export type BusynessInsights = {
  __typename?: 'BusynessInsights';
  companyWide?: Maybe<BusynessInsight>;
  perTeam?: Maybe<Array<BusynessInsight>>;
};

export type CallMade = {
  __typename?: 'CallMade';
  contactUri: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CanShowFeaturesToUserResponse = {
  __typename?: 'CanShowFeaturesToUserResponse';
  showableFeatures?: Maybe<Array<TenantAppFeature>>;
};

export type CancelBookingCommand = {
  __typename?: 'CancelBookingCommand';
  bookingId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type CapacityInsights = {
  __typename?: 'CapacityInsights';
  capacity: Scalars['Int']['output'];
  daysOverCapacity: Scalars['Int']['output'];
};

export type CapacitySet = {
  __typename?: 'CapacitySet';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CategoryGroup = {
  __typename?: 'CategoryGroup';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ChangePassword = {
  __typename?: 'ChangePassword';
  password: Scalars['String']['output'];
  passwordConfirm: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ChangeUserEmailCommand = {
  __typename?: 'ChangeUserEmailCommand';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type ChangeUserPasswordCommand = {
  __typename?: 'ChangeUserPasswordCommand';
  password: Scalars['String']['output'];
  passwordConfirm: Scalars['String']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type Chat = {
  __typename?: 'Chat';
  archived: Scalars['Boolean']['output'];
  /** All users on a chat */
  chatMembers?: Maybe<Array<Maybe<User>>>;
  companyId: Scalars['String']['output'];
  contextUserHasUnreadMessages: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  lastMessage: Scalars['String']['output'];
  messages?: Maybe<Array<Maybe<ChatMessage>>>;
  type?: Maybe<ChatType>;
  unreadMessagesCount?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Timestamp>;
  uploadIds: Array<Scalars['String']['output']>;
  /** All uploads on a chat */
  uploads?: Maybe<Array<Maybe<UploadMessage>>>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatBatchLoaderResponse = {
  __typename?: 'ChatBatchLoaderResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type ChatCreated = {
  __typename?: 'ChatCreated';
  chat?: Maybe<Chat>;
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatDeleted = {
  __typename?: 'ChatDeleted';
  chatId: Scalars['String']['output'];
  tenantOwnerUserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ChatMarkedAsReadEffect = {
  __typename?: 'ChatMarkedAsReadEffect';
  chatId: Scalars['String']['output'];
  lastMessageId: Scalars['String']['output'];
  readAt: Scalars['String']['output'];
  readByUserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ChatMemberCreated = {
  __typename?: 'ChatMemberCreated';
  addedByUserId: Scalars['String']['output'];
  chatId: Scalars['String']['output'];
  message?: Maybe<ChatMessage>;
  noNotification?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatMemberDeleted = {
  __typename?: 'ChatMemberDeleted';
  chatId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatMemberIds = {
  __typename?: 'ChatMemberIds';
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  associatedEntityId?: Maybe<Scalars['String']['output']>;
  chat?: Maybe<Chat>;
  chatId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  editedFromMessageId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
  issueId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  messageHtml: Scalars['String']['output'];
  parentMessageId?: Maybe<Scalars['String']['output']>;
  readByList?: Maybe<Array<Maybe<User>>>;
  selfAuthored?: Maybe<Scalars['Boolean']['output']>;
  taggedUserIds: Array<Scalars['String']['output']>;
  /** All tagged users on a chat message */
  taggedUsers?: Maybe<Array<Maybe<User>>>;
  thread?: Maybe<MessageList>;
  threadReplyCount?: Maybe<Scalars['Int']['output']>;
  todo?: Maybe<TenancyTodo>;
  type?: Maybe<MessageType>;
  uploadIds: Array<Scalars['String']['output']>;
  /** All uploads on a chat message */
  uploads?: Maybe<Array<Maybe<UploadMessage>>>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatMessageConnection = {
  __typename?: 'ChatMessageConnection';
  edges?: Maybe<Array<ChatMessageEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type ChatMessageCreated = {
  __typename?: 'ChatMessageCreated';
  associatedEntityId?: Maybe<Scalars['String']['output']>;
  chatId: Scalars['String']['output'];
  chatInitiated: Scalars['Boolean']['output'];
  chatMessage?: Maybe<ChatMessage>;
  chatTenantOwnerUserId?: Maybe<Scalars['String']['output']>;
  chatType?: Maybe<ChatType>;
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  messageHtml: Scalars['String']['output'];
  notify: Scalars['Boolean']['output'];
  taggedUsers: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ChatMessageDeletedEffect = {
  __typename?: 'ChatMessageDeletedEffect';
  messageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ChatMessageEdge = {
  __typename?: 'ChatMessageEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<ChatMessage>;
  user?: Maybe<User>;
};

export type ChatMessageUpdated = {
  __typename?: 'ChatMessageUpdated';
  messages?: Maybe<Array<ChatMessage>>;
  user?: Maybe<User>;
};

export enum ChatType {
  ExternalIssue = 'ExternalIssue',
  Issue = 'Issue',
  Tenancy = 'Tenancy',
  Tenant = 'Tenant'
}

export type CheckAndUpdateListedLocationsCommand = {
  __typename?: 'CheckAndUpdateListedLocationsCommand';
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type CheckAvailabilityRequest = {
  __typename?: 'CheckAvailabilityRequest';
  minutes: Scalars['Int']['output'];
  roomId: Scalars['String']['output'];
  start?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type CheckAvailabilityResponse = {
  __typename?: 'CheckAvailabilityResponse';
  isAvailable: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type CloneTemplateCommand = {
  __typename?: 'CloneTemplateCommand';
  brochureId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CodeRotated = {
  __typename?: 'CodeRotated';
  code: Scalars['String']['output'];
  subjectId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CombinationDetails = {
  __typename?: 'CombinationDetails';
  availabilityStatus?: Maybe<UnitAvailabilityStatus>;
  fitoutDescription: Scalars['String']['output'];
  fitoutState?: Maybe<UnitFitoutState>;
  isKittFlexSpace?: Maybe<Scalars['Boolean']['output']>;
  isKittSpace?: Maybe<Scalars['Boolean']['output']>;
  isMarketedByKitt: Scalars['Boolean']['output'];
  minTermMonths: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  sqft: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type Comment = {
  __typename?: 'Comment';
  commenterId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  sender?: Maybe<User>;
  user?: Maybe<User>;
};

export type CommercialModelBreakdown = {
  __typename?: 'CommercialModelBreakdown';
  agentFee: Scalars['Float']['output'];
  buildPeriodRecovery: Scalars['Float']['output'];
  buildingInsurance: Scalars['Float']['output'];
  businessRates: Scalars['Float']['output'];
  demiseElectricity: Scalars['Float']['output'];
  fitout: Scalars['Float']['output'];
  kittServiceFeeWithTopup: Scalars['Float']['output'];
  ops?: Maybe<MinMax>;
  rent: Scalars['Float']['output'];
  serviceCharge: Scalars['Float']['output'];
  total?: Maybe<MinMax>;
  user?: Maybe<User>;
};

export type CommercialModelInputs = {
  __typename?: 'CommercialModelInputs';
  buildingInsurance: Scalars['Float']['output'];
  businessRates: Scalars['Float']['output'];
  fitoutMonths: Scalars['Float']['output'];
  fitoutState?: Maybe<UnitFitoutState>;
  minTermMonthsExcludingFitout: Scalars['Float']['output'];
  rent: Scalars['Float']['output'];
  rentFreeMonths: Scalars['Float']['output'];
  serviceCharge: Scalars['Float']['output'];
  sqft: Scalars['Float']['output'];
  user?: Maybe<User>;
};

export type CommercialModelInputsInput = {
  buildingInsurance: Scalars['Float']['input'];
  businessRates: Scalars['Float']['input'];
  fitoutMonths: Scalars['Float']['input'];
  fitoutState?: InputMaybe<UnitFitoutState>;
  minTermMonthsExcludingFitout: Scalars['Float']['input'];
  rent: Scalars['Float']['input'];
  rentFreeMonths: Scalars['Float']['input'];
  serviceCharge: Scalars['Float']['input'];
  sqft: Scalars['Float']['input'];
};

export type Communication = {
  __typename?: 'Communication';
  channel: Scalars['String']['output'];
  id: Scalars['String']['output'];
  profileId: Scalars['String']['output'];
  resource?: Maybe<CommunicationResourceUnion>;
  resourceId: Scalars['String']['output'];
  sentToProfile?: Maybe<Profile>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export enum CommunicationFrequency {
  Daily = 'Daily',
  Ignore = 'Ignore',
  Immediate = 'Immediate',
  InvalidCommunicationFrequency = 'InvalidCommunicationFrequency',
  Weekly = 'Weekly'
}

export type CommunicationPreferenceSet = {
  __typename?: 'CommunicationPreferenceSet';
  communicationClass: Scalars['String']['output'];
  frequency?: Maybe<CommunicationFrequency>;
  user?: Maybe<User>;
};

export type CommunicationResourceUnion = Activity;

export type CompaniesConnection = {
  __typename?: 'CompaniesConnection';
  edges?: Maybe<Array<Edge>>;
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  pageInfo?: Maybe<PageInfo>;
  totalCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type CompaniesMerged = {
  __typename?: 'CompaniesMerged';
  fromId: Scalars['String']['output'];
  toId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Company = {
  __typename?: 'Company';
  accessCode?: Maybe<Scalars['String']['output']>;
  accountManager?: Maybe<User>;
  activeDeal?: Maybe<Deal>;
  activeTenancy?: Maybe<Tenancy>;
  address: Scalars['String']['output'];
  allUsers?: Maybe<GetCompanyUsersResponse>;
  archived: Scalars['Boolean']['output'];
  attendancePolicies?: Maybe<AttendancePoliciesList>;
  clientServicesManager?: Maybe<User>;
  clientSupportSpecialist?: Maybe<User>;
  companyNumber: Scalars['String']['output'];
  contacts?: Maybe<Array<Maybe<Profile>>>;
  contractorCategory?: Maybe<OrderCategory>;
  cultureData?: Maybe<CompanyCultureData>;
  currentTenancies?: Maybe<Array<Maybe<Tenancy>>>;
  details?: Maybe<Details>;
  displayId: Scalars['String']['output'];
  enquiries?: Maybe<Array<Maybe<Enquiry>>>;
  id: Scalars['String']['output'];
  industries?: Maybe<Array<Industry>>;
  /** The 'main' access for this company */
  ingresses?: Maybe<Array<Maybe<Access>>>;
  leadTenants?: Maybe<Array<Maybe<User>>>;
  location?: Maybe<Location>;
  logo?: Maybe<UploadMessage>;
  logoUploadId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  onboardingTenancies?: Maybe<GetTenanciesList>;
  onboardingTenancy?: Maybe<Tenancy>;
  primaryColorHex: Scalars['String']['output'];
  researchNotes: Scalars['String']['output'];
  secondaryColorHex: Scalars['String']['output'];
  teams?: Maybe<Array<Maybe<CompanyTeam>>>;
  tenancies?: Maybe<GetTenanciesList>;
  type?: Maybe<CompanyType>;
  user?: Maybe<User>;
  whiteLabelLogo?: Maybe<UploadMessage>;
};

export type CompanyCreated = {
  __typename?: 'CompanyCreated';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CompanyCultureData = {
  __typename?: 'CompanyCultureData';
  companySize?: Maybe<CompanySize>;
  completedAt?: Maybe<Timestamp>;
  cultureValues?: Maybe<Array<CultureValue>>;
  industries?: Maybe<Array<Industry>>;
  officeValueOtherDetails: Scalars['String']['output'];
  officeValues?: Maybe<Array<OfficeValue>>;
  teams?: Maybe<Array<CompanyTeam>>;
  user?: Maybe<User>;
  workplaceGoals?: Maybe<Array<WorkplaceGoal>>;
};

export type CompanyCultureDataInput = {
  __typename?: 'CompanyCultureDataInput';
  companySizeId?: Maybe<Scalars['String']['output']>;
  cultureIds?: Maybe<Array<Scalars['String']['output']>>;
  industryIds?: Maybe<Array<Scalars['String']['output']>>;
  officeValueIds?: Maybe<Array<Scalars['String']['output']>>;
  officeValueOtherDetails?: Maybe<Scalars['String']['output']>;
  teams?: Maybe<Array<TeamPayload>>;
  user?: Maybe<User>;
  workplaceGoalIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type CompanyCultureDataInputInput = {
  companySizeId?: InputMaybe<Scalars['String']['input']>;
  cultureIds?: InputMaybe<Array<Scalars['String']['input']>>;
  industryIds?: InputMaybe<Array<Scalars['String']['input']>>;
  officeValueIds?: InputMaybe<Array<Scalars['String']['input']>>;
  officeValueOtherDetails?: InputMaybe<Scalars['String']['input']>;
  teams?: InputMaybe<Array<TeamPayloadInput>>;
  workplaceGoalIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CompanyCultureSaved = {
  __typename?: 'CompanyCultureSaved';
  data?: Maybe<CompanyCultureDataInput>;
  user?: Maybe<User>;
};

export type CompanyDeleted = {
  __typename?: 'CompanyDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CompanyIndustriesUpdated = {
  __typename?: 'CompanyIndustriesUpdated';
  companyId: Scalars['String']['output'];
  industryIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CompanyIngress = {
  __typename?: 'CompanyIngress';
  accessId: Scalars['String']['output'];
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CompanyIngressInput = {
  accessId: Scalars['String']['input'];
  companyId: Scalars['String']['input'];
};

export type CompanyIngresses = {
  __typename?: 'CompanyIngresses';
  companyIngresses?: Maybe<Array<CompanyIngress>>;
  user?: Maybe<User>;
};

export enum CompanyIssueGroup {
  Completed = 'Completed',
  Incomplete = 'Incomplete',
  KittAssigned = 'Kitt_Assigned',
  LandlordAssigned = 'Landlord_Assigned',
  RecentlyActive = 'Recently_Active',
  RecentlyCompleted = 'Recently_Completed',
  TenantAssigned = 'Tenant_Assigned',
  Unknown = 'Unknown'
}

export type CompanyRestored = {
  __typename?: 'CompanyRestored';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CompanySize = {
  __typename?: 'CompanySize';
  id: Scalars['String']['output'];
  max: Scalars['Int']['output'];
  min: Scalars['Int']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CompanyTeam = {
  __typename?: 'CompanyTeam';
  attendancePolicies?: Maybe<AttendancePoliciesList>;
  companyId: Scalars['String']['output'];
  createdAt?: Maybe<Date>;
  deletedAt?: Maybe<Date>;
  id: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
  updatedAt?: Maybe<Date>;
  user?: Maybe<User>;
};

export type CompanyTeamDeleted = {
  __typename?: 'CompanyTeamDeleted';
  companyTeamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CompanyTeamInput = {
  companyId: Scalars['String']['input'];
  createdAt?: InputMaybe<DateInput>;
  deletedAt?: InputMaybe<DateInput>;
  id: Scalars['String']['input'];
  teamName: Scalars['String']['input'];
  updatedAt?: InputMaybe<DateInput>;
};

export type CompanyTeamUpdated = {
  __typename?: 'CompanyTeamUpdated';
  companyTeam?: Maybe<CompanyTeam>;
  user?: Maybe<User>;
};

export type CompanyTeamsCreated = {
  __typename?: 'CompanyTeamsCreated';
  companyTeams?: Maybe<Array<CompanyTeam>>;
  user?: Maybe<User>;
};

export type CompanyTeamsList = {
  __typename?: 'CompanyTeamsList';
  teams?: Maybe<Array<CompanyTeam>>;
  user?: Maybe<User>;
};

export enum CompanyType {
  Contractor = 'CONTRACTOR',
  Kitt = 'KITT',
  Landlord = 'LANDLORD',
  ManagingAgent = 'MANAGING_AGENT',
  TechOnly = 'TECH_ONLY',
  Tenant = 'TENANT',
  TenantBroker = 'TENANT_BROKER'
}

export type CompanyUpdated = {
  __typename?: 'CompanyUpdated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CompleteOnboardingCommand = {
  __typename?: 'CompleteOnboardingCommand';
  jobTitle?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  password: Scalars['String']['output'];
  profilePictureUploadId?: Maybe<Scalars['String']['output']>;
  teamId?: Maybe<Scalars['String']['output']>;
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CompletedTaskMessageCreated = {
  __typename?: 'CompletedTaskMessageCreated';
  chatId: Scalars['String']['output'];
  messageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ConfiguratorSession = {
  __typename?: 'ConfiguratorSession';
  createdAt?: Maybe<Timestamp>;
  deal?: Maybe<Deal>;
  dealId: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  desks: Scalars['Int']['output'];
  floorplan?: Maybe<Document>;
  floorplanDocumentId: Scalars['String']['output'];
  floorplanDrawing: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isBespoke: Scalars['Boolean']['output'];
  lookAndFeel?: Maybe<Document>;
  lookAndFeelDocumentId: Scalars['String']['output'];
  markupJson: Scalars['String']['output'];
  meetingRooms: Scalars['Int']['output'];
  notes: Scalars['String']['output'];
  pdfSummary?: Maybe<UploadMessage>;
  pdfSummaryUploadId: Scalars['String']['output'];
  unit?: Maybe<Unit>;
  unitId: Scalars['String']['output'];
  updatedAt?: Maybe<Timestamp>;
};

export type ConfiguratorSessionCreated = {
  __typename?: 'ConfiguratorSessionCreated';
  session?: Maybe<ConfiguratorSession>;
};

export type ConfiguratorSessionUpdated = {
  __typename?: 'ConfiguratorSessionUpdated';
  session?: Maybe<ConfiguratorSession>;
};

export type ConfigureAccessCommand = {
  __typename?: 'ConfigureAccessCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Contact = {
  __typename?: 'Contact';
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
};

export type ContactInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};

export type ContractorCompany = {
  __typename?: 'ContractorCompany';
  orderCategoryId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ContractorCompanyInput = {
  orderCategoryId: Scalars['String']['input'];
};

export type Coordinate = {
  __typename?: 'Coordinate';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type CoordinateInput = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
};

export type Coords = {
  __typename?: 'Coords';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
  user?: Maybe<User>;
};

export enum CostOwner {
  BuildingManagement = 'BuildingManagement',
  Client = 'Client',
  Invalid = 'Invalid',
  Kitt = 'Kitt',
  NoOwner = 'NoOwner'
}

export type CreateAccessCommand = {
  __typename?: 'CreateAccessCommand';
  access?: Maybe<Access>;
  user?: Maybe<User>;
};

export type CreateActivityCommand = {
  __typename?: 'CreateActivityCommand';
  activity?: Maybe<Activity>;
  user?: Maybe<User>;
};

export type CreateAgencyDomainAndCompanyCommand = {
  __typename?: 'CreateAgencyDomainAndCompanyCommand';
  name: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateAssignmentCommand = {
  __typename?: 'CreateAssignmentCommand';
  categoryId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateAttendanceCommand = {
  __typename?: 'CreateAttendanceCommand';
  date?: Maybe<Date>;
  user?: Maybe<User>;
};

export type CreateBooking = {
  __typename?: 'CreateBooking';
  attendeeEmailAddresses?: Maybe<Array<Scalars['String']['output']>>;
  end?: Maybe<DateTime>;
  entityId: Scalars['String']['output'];
  entityType?: Maybe<BookableEntity>;
  id?: Maybe<Scalars['String']['output']>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type CreateBookingCommand = {
  __typename?: 'CreateBookingCommand';
  bookedById?: Maybe<Scalars['String']['output']>;
  dateTime?: Maybe<BookingTimeInput>;
  email?: Maybe<Scalars['String']['output']>;
  minutes: Scalars['Int']['output'];
  name?: Maybe<Scalars['String']['output']>;
  roomId: Scalars['String']['output'];
  start?: Maybe<Timestamp>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type CreateBrochureCommand = {
  __typename?: 'CreateBrochureCommand';
  entities?: Maybe<Array<BrochureEntity>>;
  id?: Maybe<Scalars['String']['output']>;
  stateJson: Scalars['String']['output'];
  templateForEntityId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CreateBrokerEnquiryCommand = {
  __typename?: 'CreateBrokerEnquiryCommand';
  brokerSearchId: Scalars['String']['output'];
  unitGroup?: Maybe<Selection>;
  user?: Maybe<User>;
};

export type CreateBrokerSearchCommand = {
  __typename?: 'CreateBrokerSearchCommand';
  dealId?: Maybe<Scalars['String']['output']>;
  desiredLocation?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  kittChoicesOnly?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  requirements?: Maybe<DealRequirements>;
  unitGroups?: Maybe<Array<Selection>>;
  user?: Maybe<User>;
};

export type CreateBuildingTraitCommand = {
  __typename?: 'CreateBuildingTraitCommand';
  iconId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  type?: Maybe<BuildingTraitType>;
  uploadId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CreateChatCommand = {
  __typename?: 'CreateChatCommand';
  companyId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  type?: Maybe<ChatType>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type CreateChatMemberCommand = {
  __typename?: 'CreateChatMemberCommand';
  chatId: Scalars['String']['output'];
  message?: Maybe<CreateChatMessageCommand>;
  noNotification?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateChatMessageCommand = {
  __typename?: 'CreateChatMessageCommand';
  associatedEntityId?: Maybe<Scalars['String']['output']>;
  chatId: Scalars['String']['output'];
  editedFromMessageId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  issueId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  messageHtml?: Maybe<Scalars['String']['output']>;
  notify?: Maybe<Scalars['Boolean']['output']>;
  parentMessageId?: Maybe<Scalars['String']['output']>;
  taggedUserIds?: Maybe<Array<Scalars['String']['output']>>;
  type?: Maybe<MessageType>;
  uploadIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type CreateChatMessageCommandInput = {
  associatedEntityId?: InputMaybe<Scalars['String']['input']>;
  chatId: Scalars['String']['input'];
  editedFromMessageId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  issueId?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  messageHtml?: InputMaybe<Scalars['String']['input']>;
  notify?: InputMaybe<Scalars['Boolean']['input']>;
  parentMessageId?: InputMaybe<Scalars['String']['input']>;
  taggedUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<MessageType>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCompanyCommand = {
  __typename?: 'CreateCompanyCommand';
  address?: Maybe<Scalars['String']['output']>;
  companyNumber?: Maybe<Scalars['String']['output']>;
  contractorCompany?: Maybe<ContractorCompany>;
  landlordFinancials?: Maybe<LandlordFinancials>;
  logoUploadId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  primaryColorHex?: Maybe<Scalars['String']['output']>;
  secondaryColorHex?: Maybe<Scalars['String']['output']>;
  tenantCompany?: Maybe<TenantCompany>;
  type?: Maybe<OptionalCompanyType>;
  user?: Maybe<User>;
};

export type CreateCompanyTeamsCommand = {
  __typename?: 'CreateCompanyTeamsCommand';
  companyId: Scalars['String']['output'];
  companyTeams: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CreateCompletedTaskMessageCommand = {
  __typename?: 'CreateCompletedTaskMessageCommand';
  chatId: Scalars['String']['output'];
  message?: Maybe<CreateChatMessageCommand>;
  messageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateDealCommand = {
  __typename?: 'CreateDealCommand';
  deal?: Maybe<Deal>;
  note?: Maybe<Note>;
  user?: Maybe<User>;
};

export type CreateDealSpaceMatchCommand = {
  __typename?: 'CreateDealSpaceMatchCommand';
  dealId: Scalars['String']['output'];
  desiredTerm?: Maybe<Scalars['Int']['output']>;
  overriddenPrice: Scalars['Int']['output'];
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CreateDesk = {
  __typename?: 'CreateDesk';
  amenityIds: Array<Scalars['String']['output']>;
  floorplanId: Scalars['String']['output'];
  id?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateDismissedRecommendationsCommand = {
  __typename?: 'CreateDismissedRecommendationsCommand';
  brokerSearchId: Scalars['String']['output'];
  selections?: Maybe<Array<Selection>>;
  user?: Maybe<User>;
};

export type CreateEventCommand = {
  __typename?: 'CreateEventCommand';
  detail: Scalars['String']['output'];
  message: Array<Scalars['String']['output']>;
  requestId: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateIndustryCommand = {
  __typename?: 'CreateIndustryCommand';
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateListedBuildingsDatasetCommand = {
  __typename?: 'CreateListedBuildingsDatasetCommand';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type CreateLocationCommand = {
  __typename?: 'CreateLocationCommand';
  address?: Maybe<Address>;
  areaId?: Maybe<Scalars['String']['output']>;
  coordinates?: Maybe<Coordinate>;
  data?: Maybe<LocationMutableData>;
  financialData?: Maybe<LocationMutableFinancialModel>;
  financialModel?: Maybe<LocationFinancialModelMutation>;
  id?: Maybe<Scalars['String']['output']>;
  landlordCompanyId?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  owningCompany?: Maybe<Scalars['String']['output']>;
  owningCompanyNumber?: Maybe<Scalars['String']['output']>;
  primaryAccessMethod?: Maybe<Scalars['String']['output']>;
  published?: Maybe<Scalars['Boolean']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  spacePartnerId?: Maybe<Scalars['String']['output']>;
  sqFt?: Maybe<Scalars['Int']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type CreateLocationFacilityCommand = {
  __typename?: 'CreateLocationFacilityCommand';
  iconUploadId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type CreateLocationSellingPoint = {
  __typename?: 'CreateLocationSellingPoint';
  iconUploadId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateNoteOnDealCommand = {
  __typename?: 'CreateNoteOnDealCommand';
  note?: Maybe<Note>;
  user?: Maybe<User>;
};

export type CreatePrinterQueue = {
  __typename?: 'CreatePrinterQueue';
  queue: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateProfileCommand = {
  __typename?: 'CreateProfileCommand';
  addresses?: Maybe<Array<ProfileAddress>>;
  birthday?: Maybe<Date>;
  companyId: Scalars['String']['output'];
  companyTeamId?: Maybe<Scalars['String']['output']>;
  emails: Array<Scalars['String']['output']>;
  hideBirthday?: Maybe<Scalars['Boolean']['output']>;
  img: Scalars['String']['output'];
  jobTitle: Scalars['String']['output'];
  linkedInUrl: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumbers: Array<Scalars['String']['output']>;
  profilePhotoUploadId: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type CreateRequestCommand = {
  __typename?: 'CreateRequestCommand';
  categoryId: Scalars['String']['output'];
  chatIds: Array<Scalars['String']['output']>;
  detail: Scalars['String']['output'];
  fileIds: Array<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  priority: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  techRequest?: Maybe<Scalars['Boolean']['output']>;
  unitId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateRoom = {
  __typename?: 'CreateRoom';
  amenityIds: Array<Scalars['String']['output']>;
  capacity: Scalars['Int']['output'];
  id?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price: Scalars['String']['output'];
  shared: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type CreateRoomAction = {
  __typename?: 'CreateRoomAction';
  description: Scalars['String']['output'];
  imageUploadId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  numberOfPeople: Scalars['Int']['output'];
  timezone: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateScrapedLocationsCommand = {
  __typename?: 'CreateScrapedLocationsCommand';
  locations?: Maybe<Array<ScrapedLocation>>;
  user?: Maybe<User>;
};

export type CreateSelectionFeedbacksCommand = {
  __typename?: 'CreateSelectionFeedbacksCommand';
  feedbacks?: Maybe<Array<SelectionFeedback>>;
  user?: Maybe<User>;
};

export type CreateShortlistCommand = {
  __typename?: 'CreateShortlistCommand';
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateShortlistViewingRequestsCommand = {
  __typename?: 'CreateShortlistViewingRequestsCommand';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  company: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ViewingRequest>>;
};

export type CreateTemplateCommand = {
  __typename?: 'CreateTemplateCommand';
  content: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type?: Maybe<TemplateType>;
  user?: Maybe<User>;
};

export type CreateTemporaryPinCommand = {
  __typename?: 'CreateTemporaryPinCommand';
  accessId: Scalars['String']['output'];
  email: Scalars['String']['output'];
  from?: Maybe<Timestamp>;
  to?: Maybe<Timestamp>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CreateUserCommand = {
  __typename?: 'CreateUserCommand';
  email: Scalars['String']['output'];
  password: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type CreateViewingRequestCommand = {
  __typename?: 'CreateViewingRequestCommand';
  user?: Maybe<User>;
  viewingRequest?: Maybe<ShortlistViewingRequest>;
};

export type CreateWebPushSubscription = {
  __typename?: 'CreateWebPushSubscription';
  authSecret: Scalars['String']['output'];
  endpoint: Scalars['String']['output'];
  p256dh: Scalars['String']['output'];
  user?: Maybe<User>;
  userAgentString: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type CultureValue = {
  __typename?: 'CultureValue';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DailyOfficeAttendance = {
  __typename?: 'DailyOfficeAttendance';
  attendance: Scalars['Int']['output'];
  attendeeUserIds: Array<Scalars['String']['output']>;
  capacity: Scalars['Int']['output'];
  date?: Maybe<Date>;
};

export type Date = {
  __typename?: 'Date';
  day: Scalars['Int']['output'];
  month: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type DateInput = {
  day: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};

export type DateRange = {
  __typename?: 'DateRange';
  max?: Maybe<Date>;
  min?: Maybe<Date>;
};

export type DateRangeInput = {
  max?: InputMaybe<DateInput>;
  min?: InputMaybe<DateInput>;
};

export type DateTime = {
  __typename?: 'DateTime';
  ISOString?: Maybe<Scalars['String']['output']>;
  day: Scalars['Int']['output'];
  /**
   * https://golang.org/pkg/time/#Time.Format Use Format() from Go's time package
   * to format dates and times easily using the reference time "Mon Jan 2 15:04:05
   * -0700 MST 2006" (https://gotime.agardner.me/)
   */
  format?: Maybe<Scalars['String']['output']>;
  hours: Scalars['Int']['output'];
  minutes: Scalars['Int']['output'];
  month: Scalars['Int']['output'];
  nanos?: Maybe<Scalars['Int']['output']>;
  seconds: Scalars['Int']['output'];
  timeZone?: Maybe<Scalars['String']['output']>;
  unix?: Maybe<Scalars['Int']['output']>;
  utcOffsetSeconds: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};


export type DateTimeFormatArgs = {
  layout?: InputMaybe<Scalars['String']['input']>;
};

export type DateTimeFullObjectInput = {
  day: Scalars['Int']['input'];
  hours: Scalars['Int']['input'];
  minutes: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
  nanos: Scalars['Int']['input'];
  seconds: Scalars['Int']['input'];
  timeZone?: InputMaybe<Scalars['String']['input']>;
  utcOffsetSeconds?: InputMaybe<Scalars['Int']['input']>;
  year: Scalars['Int']['input'];
};

export type DateTimeInput = {
  ISOString?: InputMaybe<Scalars['String']['input']>;
  dateTime?: InputMaybe<DateTimeFullObjectInput>;
};

export type Deal = {
  __typename?: 'Deal';
  activityStatuses?: Maybe<Array<DealActivityStatus>>;
  alternativeBrokerContactIds?: Maybe<Array<Scalars['String']['output']>>;
  alternativeBrokerContacts?: Maybe<Array<Maybe<Profile>>>;
  assignee?: Maybe<User>;
  assigneeId?: Maybe<Scalars['String']['output']>;
  brokerCompany?: Maybe<Company>;
  brokerCompanyId?: Maybe<Scalars['String']['output']>;
  brokerSearch?: Maybe<BrokerSearch>;
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  clientCompany?: Maybe<Company>;
  clientCompanyId?: Maybe<Scalars['String']['output']>;
  confidential?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Timestamp>;
  createdById?: Maybe<Scalars['String']['output']>;
  dealGenerationSource?: Maybe<DealGenerationSource>;
  dealType?: Maybe<DealTypeOptional>;
  deferredUntil?: Maybe<Date>;
  deletedAt?: Maybe<Timestamp>;
  expectedCloseDate?: Maybe<Timestamp>;
  heat?: Maybe<Scalars['Int']['output']>;
  highCovenantRisk?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  insights?: Maybe<DealInsight>;
  leadType?: Maybe<LeadType>;
  lostReason?: Maybe<Scalars['String']['output']>;
  offerIds?: Maybe<Array<Scalars['String']['output']>>;
  ownerId?: Maybe<Scalars['String']['output']>;
  pipelineStage?: Maybe<PipelineStage>;
  pipelineStageId?: Maybe<Scalars['String']['output']>;
  primaryBrokerContact?: Maybe<Profile>;
  primaryBrokerContactId?: Maybe<Scalars['String']['output']>;
  primaryBrokerUser?: Maybe<User>;
  primaryClientContact?: Maybe<Profile>;
  primaryClientContactId?: Maybe<Scalars['String']['output']>;
  rankedProducts?: Maybe<ProductsConnection>;
  requirements?: Maybe<DealRequirements>;
  requirementsId?: Maybe<Scalars['String']['output']>;
  salesTeam?: Maybe<SalesTeam>;
  salesTeamId?: Maybe<Scalars['String']['output']>;
  secondaryAssignee?: Maybe<User>;
  secondaryAssigneeId?: Maybe<Scalars['String']['output']>;
  shortlists?: Maybe<Array<Maybe<DealShortlist>>>;
  source?: Maybe<Scalars['String']['output']>;
  threadId?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
  viewingRequestIds?: Maybe<Array<Scalars['String']['output']>>;
};


export type DealRankedProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  locationIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export enum DealActivityStatus {
  ActivityScheduledAndDueFromTomorrow = 'ActivityScheduledAndDueFromTomorrow',
  ActivityScheduledAndDueToday = 'ActivityScheduledAndDueToday',
  NoActivityScheduled = 'NoActivityScheduled',
  ScheduledAndOverdue = 'ScheduledAndOverdue',
  StatusUnknown = 'StatusUnknown'
}

export type DealConnection = {
  __typename?: 'DealConnection';
  edges?: Maybe<Array<DealEdge>>;
  pageInfo?: Maybe<DealPageInfo>;
  totalCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type DealCreated = {
  __typename?: 'DealCreated';
  deal?: Maybe<Deal>;
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealDeleted = {
  __typename?: 'DealDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealEdge = {
  __typename?: 'DealEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Deal>;
  user?: Maybe<User>;
};

export type DealFilters = {
  __typename?: 'DealFilters';
  areaIds: Array<Scalars['String']['output']>;
  assigneeIds: Array<Scalars['String']['output']>;
  brokerCompanyIds: Array<Scalars['String']['output']>;
  brokerIds: Array<Scalars['String']['output']>;
  clientCompanyIds: Array<Scalars['String']['output']>;
  companyIds: Array<Scalars['String']['output']>;
  createdAfter?: Maybe<Timestamp>;
  createdBefore?: Maybe<Timestamp>;
  desks?: Maybe<DealNumericRange>;
  heat?: Maybe<Int32OptionalRange>;
  includeArchived: Scalars['Boolean']['output'];
  includeDeferred: Scalars['Boolean']['output'];
  onlyDirect: Scalars['Boolean']['output'];
  onlyLostOrArchived: Scalars['Boolean']['output'];
  price?: Maybe<DealMoneyRange>;
  profileIds: Array<Scalars['String']['output']>;
  salesTeamIds: Array<Scalars['String']['output']>;
  sources: Array<Scalars['String']['output']>;
  spaceMatchedAfter?: Maybe<Timestamp>;
  spaceMatchedBefore?: Maybe<Timestamp>;
  sqFt?: Maybe<DealNumericRange>;
  user?: Maybe<User>;
};

export type DealFiltersInput = {
  areaIds: Array<Scalars['String']['input']>;
  assigneeIds: Array<Scalars['String']['input']>;
  brokerCompanyIds: Array<Scalars['String']['input']>;
  brokerIds: Array<Scalars['String']['input']>;
  clientCompanyIds: Array<Scalars['String']['input']>;
  companyIds: Array<Scalars['String']['input']>;
  createdAfter?: InputMaybe<TimestampInput>;
  createdBefore?: InputMaybe<TimestampInput>;
  desks?: InputMaybe<DealNumericRangeInput>;
  heat?: InputMaybe<Int32OptionalRangeInput>;
  includeArchived: Scalars['Boolean']['input'];
  includeDeferred: Scalars['Boolean']['input'];
  onlyDirect: Scalars['Boolean']['input'];
  onlyLostOrArchived: Scalars['Boolean']['input'];
  price?: InputMaybe<DealMoneyRangeInput>;
  profileIds: Array<Scalars['String']['input']>;
  salesTeamIds: Array<Scalars['String']['input']>;
  sources: Array<Scalars['String']['input']>;
  spaceMatchedAfter?: InputMaybe<TimestampInput>;
  spaceMatchedBefore?: InputMaybe<TimestampInput>;
  sqFt?: InputMaybe<DealNumericRangeInput>;
};

export enum DealGenerationSource {
  BrochureRequest = 'BROCHURE_REQUEST',
  Crm = 'CRM',
  ViewingRequest = 'VIEWING_REQUEST'
}

export type DealInput = {
  activityStatuses?: InputMaybe<Array<DealActivityStatus>>;
  alternativeBrokerContactIds?: InputMaybe<Array<Scalars['String']['input']>>;
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  brokerCompanyId?: InputMaybe<Scalars['String']['input']>;
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  clientCompanyId?: InputMaybe<Scalars['String']['input']>;
  confidential?: InputMaybe<Scalars['Boolean']['input']>;
  createdAt?: InputMaybe<TimestampInput>;
  createdById?: InputMaybe<Scalars['String']['input']>;
  dealGenerationSource?: InputMaybe<DealGenerationSource>;
  dealType?: InputMaybe<DealTypeOptionalInput>;
  deferredUntil?: InputMaybe<DateInput>;
  deletedAt?: InputMaybe<TimestampInput>;
  expectedCloseDate?: InputMaybe<TimestampInput>;
  heat?: InputMaybe<Scalars['Int']['input']>;
  highCovenantRisk?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  leadType?: InputMaybe<LeadType>;
  lostReason?: InputMaybe<Scalars['String']['input']>;
  offerIds?: InputMaybe<Array<Scalars['String']['input']>>;
  ownerId?: InputMaybe<Scalars['String']['input']>;
  pipelineStageId?: InputMaybe<Scalars['String']['input']>;
  primaryBrokerContactId?: InputMaybe<Scalars['String']['input']>;
  primaryClientContactId?: InputMaybe<Scalars['String']['input']>;
  requirements?: InputMaybe<DealRequirementsInput>;
  requirementsId?: InputMaybe<Scalars['String']['input']>;
  salesTeamId?: InputMaybe<Scalars['String']['input']>;
  secondaryAssigneeId?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  threadId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<TimestampInput>;
  viewingRequestIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type DealInsight = {
  __typename?: 'DealInsight';
  approxRevenuePennies?: Maybe<Scalars['Float']['output']>;
  approxSqft?: Maybe<Scalars['Float']['output']>;
};

export type DealList = {
  __typename?: 'DealList';
  deals?: Maybe<Array<Deal>>;
  user?: Maybe<User>;
};

export type DealMoney = {
  __typename?: 'DealMoney';
  currencySymbol: Scalars['String']['output'];
  formatted: Scalars['String']['output'];
  pennies: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type DealMoneyInput = {
  currencySymbol: Scalars['String']['input'];
  formatted: Scalars['String']['input'];
  pennies: Scalars['Int']['input'];
};

export type DealMoneyRange = {
  __typename?: 'DealMoneyRange';
  from?: Maybe<DealMoney>;
  to?: Maybe<DealMoney>;
  user?: Maybe<User>;
};

export type DealMoneyRangeInput = {
  from?: InputMaybe<DealMoneyInput>;
  to?: InputMaybe<DealMoneyInput>;
};

export type DealNumericRange = {
  __typename?: 'DealNumericRange';
  from?: Maybe<Scalars['Int']['output']>;
  to?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type DealNumericRangeInput = {
  from?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['Int']['input']>;
};

export enum DealOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type DealPageInfo = {
  __typename?: 'DealPageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealPaginationData = {
  __typename?: 'DealPaginationData';
  hasMoreItems: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type DealPipelineStage = {
  __typename?: 'DealPipelineStage';
  autoMovedBy: Scalars['String']['output'];
  current?: Maybe<PipelineStage>;
  enterTime?: Maybe<DateTime>;
  exitTime?: Maybe<DateTime>;
  movedBy: Scalars['String']['output'];
  movedByUser?: Maybe<User>;
  next?: Maybe<PipelineStage>;
  user?: Maybe<User>;
};

export type DealPipelineStageInsight = {
  __typename?: 'DealPipelineStageInsight';
  approxRevenuePennies?: Maybe<Scalars['Float']['output']>;
  approxSqft?: Maybe<Scalars['Float']['output']>;
  stageId: Scalars['String']['output'];
  weightedApproxRevenuePennies?: Maybe<Scalars['Float']['output']>;
};

export type DealRequirements = {
  __typename?: 'DealRequirements';
  areaIds: Array<Scalars['String']['output']>;
  areas?: Maybe<Array<Maybe<Boundary>>>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  floorFilters?: Maybe<FloorFilters>;
  freeTextRequirements: Scalars['String']['output'];
  freeTextRequirementsDraftState: Scalars['String']['output'];
  id: Scalars['String']['output'];
  monthlyBudget?: Maybe<DealMoneyRange>;
  numOfDesks?: Maybe<DealNumericRange>;
  numOfLargeMeetingRooms?: Maybe<Scalars['Int']['output']>;
  numOfMediumMeetingRooms?: Maybe<Scalars['Int']['output']>;
  numOfSmallMeetingRooms?: Maybe<Scalars['Int']['output']>;
  polygon?: Maybe<Scalars['String']['output']>;
  squareFootage?: Maybe<DealNumericRange>;
  startDateASAP: Scalars['Boolean']['output'];
  startDates?: Maybe<DealTimestampRange>;
  termMonths?: Maybe<DealNumericRange>;
  user?: Maybe<User>;
};

export type DealRequirementsInput = {
  areaIds: Array<Scalars['String']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  floorFilters?: InputMaybe<FloorFiltersInput>;
  freeTextRequirements: Scalars['String']['input'];
  freeTextRequirementsDraftState: Scalars['String']['input'];
  id: Scalars['String']['input'];
  monthlyBudget?: InputMaybe<DealMoneyRangeInput>;
  numOfDesks?: InputMaybe<DealNumericRangeInput>;
  numOfLargeMeetingRooms?: InputMaybe<Scalars['Int']['input']>;
  numOfMediumMeetingRooms?: InputMaybe<Scalars['Int']['input']>;
  numOfSmallMeetingRooms?: InputMaybe<Scalars['Int']['input']>;
  polygon?: InputMaybe<Scalars['String']['input']>;
  squareFootage?: InputMaybe<DealNumericRangeInput>;
  startDateASAP: Scalars['Boolean']['input'];
  startDates?: InputMaybe<DealTimestampRangeInput>;
  termMonths?: InputMaybe<DealNumericRangeInput>;
};

export type DealShortlist = {
  __typename?: 'DealShortlist';
  dealId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  linkedByUserId: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  shortlist?: Maybe<Shortlist>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealSpaceMatch = {
  __typename?: 'DealSpaceMatch';
  dealId: Scalars['String']['output'];
  desiredTerm: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  location?: Maybe<Location>;
  matchedAt?: Maybe<Timestamp>;
  orderIndex: Scalars['String']['output'];
  overriddenPrice: Scalars['Int']['output'];
  salesBlurb: Scalars['String']['output'];
  starred: Scalars['Boolean']['output'];
  unitGroupDetails?: Maybe<GetDetailsForUnitsResponse>;
  unitIds: Array<Scalars['String']['output']>;
  units: Array<Maybe<Unit>>;
  user?: Maybe<User>;
};


export type DealSpaceMatchUnitGroupDetailsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type DealSpaceMatchDeleted = {
  __typename?: 'DealSpaceMatchDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealSpaceMatchUpdated = {
  __typename?: 'DealSpaceMatchUpdated';
  match?: Maybe<DealSpaceMatch>;
  user?: Maybe<User>;
};

export type DealSpaceMatched = {
  __typename?: 'DealSpaceMatched';
  match?: Maybe<DealSpaceMatch>;
  user?: Maybe<User>;
};

export type DealStageEvent = {
  __typename?: 'DealStageEvent';
  entered?: Maybe<Timestamp>;
  isCurrent: Scalars['Boolean']['output'];
  pipelineStageId: Scalars['String']['output'];
  timeInStageMilliseconds: Scalars['Int']['output'];
  timeInStageSeconds: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export enum DealTimelineEventType {
  Activity = 'ACTIVITY',
  Email = 'EMAIL',
  Note = 'NOTE',
  PipelineStageMove = 'PIPELINE_STAGE_MOVE',
  Shortlisted = 'SHORTLISTED',
  ShortlistApproved = 'SHORTLIST_APPROVED',
  ShortlistEmail = 'SHORTLIST_EMAIL',
  Tenancy = 'TENANCY',
  ViewingEmail = 'VIEWING_EMAIL'
}

export type DealTimelineEventUnion = Activity | BrokerCommunication | BrokerSearch | Communication | DealPipelineStage | Email | Note | Selection | Tenancy;

export type DealTimestampRange = {
  __typename?: 'DealTimestampRange';
  from?: Maybe<Timestamp>;
  to?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type DealTimestampRangeInput = {
  from?: InputMaybe<TimestampInput>;
  to?: InputMaybe<TimestampInput>;
};

export enum DealType {
  KittSearch = 'KITT_SEARCH',
  KittSpaces = 'KITT_SPACES'
}

export type DealTypeOptional = {
  __typename?: 'DealTypeOptional';
  type?: Maybe<DealType>;
  user?: Maybe<User>;
};

export type DealTypeOptionalInput = {
  type?: InputMaybe<DealType>;
};

export type DealUpdated = {
  __typename?: 'DealUpdated';
  id: Scalars['String']['output'];
  pipelineStageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DealsBatchResponse = {
  __typename?: 'DealsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type DealsConnection = {
  __typename?: 'DealsConnection';
  edges?: Maybe<Array<DealEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type DealsManyBatchResponse = {
  __typename?: 'DealsManyBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type DealsMerged = {
  __typename?: 'DealsMerged';
  from?: Maybe<Deal>;
  to?: Maybe<Deal>;
  user?: Maybe<User>;
};

export type DeleteAccessCommand = {
  __typename?: 'DeleteAccessCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteActivityCommand = {
  __typename?: 'DeleteActivityCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteAmenity = {
  __typename?: 'DeleteAmenity';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteAssignmentCommand = {
  __typename?: 'DeleteAssignmentCommand';
  assignmentId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteAttendanceCommand = {
  __typename?: 'DeleteAttendanceCommand';
  date?: Maybe<Date>;
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type DeleteBooking = {
  __typename?: 'DeleteBooking';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteBrochureCommand = {
  __typename?: 'DeleteBrochureCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteBrokerSearchCommand = {
  __typename?: 'DeleteBrokerSearchCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteChatCommand = {
  __typename?: 'DeleteChatCommand';
  chatId: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type DeleteChatMemberCommand = {
  __typename?: 'DeleteChatMemberCommand';
  chatId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type DeleteChatMessageAction = {
  __typename?: 'DeleteChatMessageAction';
  messageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteCompanyCommand = {
  __typename?: 'DeleteCompanyCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteCompanyTeamCommand = {
  __typename?: 'DeleteCompanyTeamCommand';
  companyTeamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteDealCommand = {
  __typename?: 'DeleteDealCommand';
  id: Scalars['String']['output'];
  lostReason: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteDealSpaceMatchCommand = {
  __typename?: 'DeleteDealSpaceMatchCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteDesk = {
  __typename?: 'DeleteDesk';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteEventCommand = {
  __typename?: 'DeleteEventCommand';
  eventId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type DeleteFloorplan = {
  __typename?: 'DeleteFloorplan';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteGuestCommand = {
  __typename?: 'DeleteGuestCommand';
  guestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteIndustryCommand = {
  __typename?: 'DeleteIndustryCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteLocationCommand = {
  __typename?: 'DeleteLocationCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteLocationSellingPoint = {
  __typename?: 'DeleteLocationSellingPoint';
  sellingPointId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteMatchedSpace = {
  __typename?: 'DeleteMatchedSpace';
  id: Scalars['String']['output'];
  productId: Scalars['String']['output'];
  reasonUnmatched: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteNoteOnDealCommand = {
  __typename?: 'DeleteNoteOnDealCommand';
  dealId: Scalars['String']['output'];
  noteId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteProfileCommand = {
  __typename?: 'DeleteProfileCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteRequestAttachmentCommand = {
  __typename?: 'DeleteRequestAttachmentCommand';
  attachmentId: Scalars['String']['output'];
  requestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteRequestCommand = {
  __typename?: 'DeleteRequestCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteRoom = {
  __typename?: 'DeleteRoom';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteRoomAction = {
  __typename?: 'DeleteRoomAction';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteShortlistCommand = {
  __typename?: 'DeleteShortlistCommand';
  archive?: Maybe<Scalars['Boolean']['output']>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteUploadCommand = {
  __typename?: 'DeleteUploadCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteUserCommand = {
  __typename?: 'DeleteUserCommand';
  UserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteUserPushTokenCommand = {
  __typename?: 'DeleteUserPushTokenCommand';
  deviceId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteUsersInCompanies = {
  __typename?: 'DeleteUsersInCompanies';
  companyIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type DeleteUsersInCompany = {
  __typename?: 'DeleteUsersInCompany';
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeleteWebPushSubscription = {
  __typename?: 'DeleteWebPushSubscription';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeployFinished = {
  __typename?: 'DeployFinished';
  affectedProjects: Array<Scalars['String']['output']>;
  branch: Scalars['String']['output'];
  deployedByUserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeployPreviewCommand = {
  __typename?: 'DeployPreviewCommand';
  branch: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DeployStarted = {
  __typename?: 'DeployStarted';
  affectedProjects: Array<Scalars['String']['output']>;
  branch: Scalars['String']['output'];
  deployedByUserId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Deployment = {
  __typename?: 'Deployment';
  dev: Scalars['String']['output'];
  service: Scalars['String']['output'];
};

export type Desk = {
  __typename?: 'Desk';
  amenities?: Maybe<Array<Maybe<Amenity>>>;
  assignedTo?: Maybe<Profile>;
  bookings?: Maybe<Array<Maybe<RoomOrDeskBooking>>>;
  floorplanId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  teamIds: Array<Scalars['String']['output']>;
  teams?: Maybe<Array<Maybe<CompanyTeam>>>;
  user?: Maybe<User>;
};


export type DeskBookingsArgs = {
  end: DateTimeInput;
  start: DateTimeInput;
};

export type DeskBookingFeatureEnquired = {
  __typename?: 'DeskBookingFeatureEnquired';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type DeskCreated = {
  __typename?: 'DeskCreated';
  desk?: Maybe<Desk>;
  user?: Maybe<User>;
};

export type DeskDeleted = {
  __typename?: 'DeskDeleted';
  desk?: Maybe<Desk>;
  user?: Maybe<User>;
};

export type DeskUpdated = {
  __typename?: 'DeskUpdated';
  desk?: Maybe<Desk>;
  user?: Maybe<User>;
};

export type DesksOnTeamSet = {
  __typename?: 'DesksOnTeamSet';
  deskIds: Array<Scalars['String']['output']>;
  teamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DetachTaskFromRequestCommand = {
  __typename?: 'DetachTaskFromRequestCommand';
  requestId: Scalars['String']['output'];
  taskId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum Device {
  Axis = 'AXIS',
  Doorbird = 'DOORBIRD'
}

export type Dimensions = {
  __typename?: 'Dimensions';
  heightInches: Scalars['Float']['output'];
  user?: Maybe<User>;
  widthInches: Scalars['Float']['output'];
};

export type DimensionsInput = {
  heightInches: Scalars['Float']['input'];
  widthInches: Scalars['Float']['input'];
};

export type DiscardSourcedLocationCommand = {
  __typename?: 'DiscardSourcedLocationCommand';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DismissedRecommendation = {
  __typename?: 'DismissedRecommendation';
  brokerSearchId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  selection?: Maybe<Selection>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DismissedRecommendationsCreated = {
  __typename?: 'DismissedRecommendationsCreated';
  selections?: Maybe<Array<Selection>>;
  user?: Maybe<User>;
};

export type DisqualifyLocation = {
  __typename?: 'DisqualifyLocation';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Document = {
  __typename?: 'Document';
  id: Scalars['String']['output'];
  metadata?: Maybe<Array<Metadata>>;
  type?: Maybe<DocumentType>;
  upload?: Maybe<UploadMessage>;
  uploadId: Scalars['String']['output'];
  uploadedAt?: Maybe<Timestamp>;
  uploadedBy?: Maybe<User>;
  uploadedUserId: Scalars['String']['output'];
};

export type DocumentAddedToTenancy = {
  __typename?: 'DocumentAddedToTenancy';
  documentId: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type DocumentCreated = {
  __typename?: 'DocumentCreated';
  document?: Maybe<Document>;
  documentId: Scalars['String']['output'];
};

export type DocumentType = {
  __typename?: 'DocumentType';
  allowMultiple: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  metadata?: Maybe<Array<Metadata>>;
  name: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
  signatureRequired: Scalars['Boolean']['output'];
  template?: Maybe<UploadMessage>;
  templateUploadId: Scalars['String']['output'];
};

export type DoesOrderMeetMsaBaselineResponse = {
  __typename?: 'DoesOrderMeetMSABaselineResponse';
  failingCategoryIds: Array<Scalars['String']['output']>;
  meetsBaseline: Scalars['Boolean']['output'];
};

export type DoorOpened = {
  __typename?: 'DoorOpened';
  accessId: Scalars['String']['output'];
  code: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DoorOpenedForGuest = {
  __typename?: 'DoorOpenedForGuest';
  accessId: Scalars['String']['output'];
  guestId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  requesterId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type DoorRestarted = {
  __typename?: 'DoorRestarted';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Edge = {
  __typename?: 'Edge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Company>;
  user?: Maybe<User>;
};

export type EditLocation = {
  __typename?: 'EditLocation';
  address?: Maybe<Address>;
  bidLevy: Scalars['Boolean']['output'];
  buildingInsurance?: Maybe<Money>;
  coordinates?: Maybe<Coordinate>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  isKittChoice?: Maybe<Scalars['Boolean']['output']>;
  locationId: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  salesBlurb?: Maybe<Scalars['String']['output']>;
  serviceCharge?: Maybe<Money>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  urls?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  withinCityOfLondon: Scalars['Boolean']['output'];
};

export type EditLocationCommand = {
  __typename?: 'EditLocationCommand';
  editLocation?: Maybe<EditLocation>;
  editUnits?: Maybe<Array<EditUnit>>;
  user?: Maybe<User>;
};

export type EditLocationInput = {
  address?: InputMaybe<AddressInput>;
  bidLevy: Scalars['Boolean']['input'];
  buildingInsurance?: InputMaybe<MoneyInput>;
  coordinates?: InputMaybe<CoordinateInput>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  locationId: Scalars['String']['input'];
  notes: Scalars['String']['input'];
  salesBlurb?: InputMaybe<Scalars['String']['input']>;
  serviceCharge?: InputMaybe<MoneyInput>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  urls?: InputMaybe<Array<Scalars['String']['input']>>;
  withinCityOfLondon: Scalars['Boolean']['input'];
};

export type EditUnit = {
  __typename?: 'EditUnit';
  availabilityStatus?: Maybe<UnitAvailabilityStatusOptional>;
  businessRatesPsf?: Maybe<Money>;
  fitoutState?: Maybe<UnitFitoutState>;
  floor: Scalars['String']['output'];
  floorNumbers?: Maybe<Array<Scalars['Float']['output']>>;
  floorplanUploadId: Scalars['String']['output'];
  floorplanUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  isAvailable: Scalars['Boolean']['output'];
  landlordCoversFitout?: Maybe<Scalars['Boolean']['output']>;
  minAvailableFrom?: Maybe<Timestamp>;
  minTermMonths: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  netRent?: Maybe<Money>;
  rateableValue?: Maybe<Money>;
  ratesLink: Scalars['String']['output'];
  rentFreeMonths: Scalars['Int']['output'];
  sqFt: Scalars['Int']['output'];
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  threeDimensionalModelUrl?: Maybe<Scalars['String']['output']>;
  totalRentFreeMonths?: Maybe<Scalars['Float']['output']>;
  unitId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type EditUnitInput = {
  availabilityStatus?: InputMaybe<UnitAvailabilityStatusOptionalInput>;
  businessRatesPsf?: InputMaybe<MoneyInput>;
  fitoutState?: InputMaybe<UnitFitoutState>;
  floor: Scalars['String']['input'];
  floorNumbers?: InputMaybe<Array<Scalars['Float']['input']>>;
  floorplanUploadId: Scalars['String']['input'];
  floorplanUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isAvailable: Scalars['Boolean']['input'];
  landlordCoversFitout?: InputMaybe<Scalars['Boolean']['input']>;
  minAvailableFrom?: InputMaybe<TimestampInput>;
  minTermMonths: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  netRent?: InputMaybe<MoneyInput>;
  rateableValue?: InputMaybe<MoneyInput>;
  ratesLink: Scalars['String']['input'];
  rentFreeMonths: Scalars['Int']['input'];
  sqFt: Scalars['Int']['input'];
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  threeDimensionalModelUrl?: InputMaybe<Scalars['String']['input']>;
  totalRentFreeMonths?: InputMaybe<Scalars['Float']['input']>;
  unitId?: InputMaybe<Scalars['String']['input']>;
};

export type Email = {
  __typename?: 'Email';
  bcc?: Maybe<Array<EmailContact>>;
  cc?: Maybe<Array<EmailContact>>;
  emailAddress: Scalars['String']['output'];
  from?: Maybe<EmailContact>;
  fromEmail: Scalars['String']['output'];
  fromName: Scalars['String']['output'];
  gmailThreadId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  labels: Array<Scalars['String']['output']>;
  receivedAt?: Maybe<Timestamp>;
  subject: Scalars['String']['output'];
  to?: Maybe<Array<EmailContact>>;
  user?: Maybe<User>;
};

export type EmailAction = {
  __typename?: 'EmailAction';
  button?: Maybe<EmailButton>;
  instructions: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EmailActionInput = {
  button?: InputMaybe<EmailButtonInput>;
  instructions: Scalars['String']['input'];
};

export type EmailBody = {
  __typename?: 'EmailBody';
  actions?: Maybe<Array<EmailAction>>;
  dictionary?: Maybe<Array<EmailEntry>>;
  greeting?: Maybe<Scalars['String']['output']>;
  intros?: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  outros?: Maybe<Array<Scalars['String']['output']>>;
  signature?: Maybe<Scalars['String']['output']>;
  table?: Maybe<EmailTable>;
  title?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type EmailBodyInput = {
  actions?: InputMaybe<Array<EmailActionInput>>;
  dictionary?: InputMaybe<Array<EmailEntryInput>>;
  greeting?: InputMaybe<Scalars['String']['input']>;
  intros?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  outros?: InputMaybe<Array<Scalars['String']['input']>>;
  signature?: InputMaybe<Scalars['String']['input']>;
  table?: InputMaybe<EmailTableInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type EmailButton = {
  __typename?: 'EmailButton';
  color: Scalars['String']['output'];
  link: Scalars['String']['output'];
  text: Scalars['String']['output'];
  textColor: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EmailButtonInput = {
  color: Scalars['String']['input'];
  link: Scalars['String']['input'];
  text: Scalars['String']['input'];
  textColor: Scalars['String']['input'];
};

export type EmailContact = {
  __typename?: 'EmailContact';
  emailAddress: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EmailContent = {
  __typename?: 'EmailContent';
  htmlMessage: Scalars['String']['output'];
  plainMessage: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EmailCreated = {
  __typename?: 'EmailCreated';
  email?: Maybe<Email>;
  user?: Maybe<User>;
};

export type EmailEntry = {
  __typename?: 'EmailEntry';
  key: Scalars['String']['output'];
  user?: Maybe<User>;
  value: Scalars['String']['output'];
};

export type EmailEntryInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type EmailMetadata = {
  __typename?: 'EmailMetadata';
  key: Scalars['String']['output'];
  user?: Maybe<User>;
  value: Scalars['String']['output'];
};

export type EmailMetadataInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type EmailSent = {
  __typename?: 'EmailSent';
  emailId: Scalars['String']['output'];
  metadata?: Maybe<Array<EmailMetadata>>;
  threadId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EmailSentEvent = {
  __typename?: 'EmailSentEvent';
  body?: Maybe<EmailBody>;
  subject: Scalars['String']['output'];
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type EmailTable = {
  __typename?: 'EmailTable';
  data?: Maybe<Array<EmailTableData>>;
  user?: Maybe<User>;
};

export type EmailTableData = {
  __typename?: 'EmailTableData';
  entries?: Maybe<Array<EmailEntry>>;
  user?: Maybe<User>;
};

export type EmailTableDataInput = {
  entries?: InputMaybe<Array<EmailEntryInput>>;
};

export type EmailTableInput = {
  data?: InputMaybe<Array<EmailTableDataInput>>;
};

export type EmailUpdated = {
  __typename?: 'EmailUpdated';
  email?: Maybe<Email>;
  user?: Maybe<User>;
};

export type EndSession = {
  __typename?: 'EndSession';
  sessionId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type EnquireAboutDeskBooking = {
  __typename?: 'EnquireAboutDeskBooking';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type Enquiry = {
  __typename?: 'Enquiry';
  assignee?: Maybe<Profile>;
  clientCompany?: Maybe<Company>;
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  createdByUser?: Maybe<User>;
  deletedAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  mutableData?: Maybe<EnquiryMutableData>;
  quotes?: Maybe<Array<Quote>>;
  status?: Maybe<EnquiryStatus>;
  updatedAt?: Maybe<Timestamp>;
  updatedBy: Scalars['String']['output'];
  visits?: Maybe<Array<Maybe<Visit>>>;
};

export type EnquiryColumnDetails = {
  __typename?: 'EnquiryColumnDetails';
  enquiriesCount: Scalars['Int']['output'];
  statusId: Scalars['String']['output'];
  totalKittFeePennies: Scalars['Float']['output'];
  totalValuePennies: Scalars['Float']['output'];
};

export type EnquiryCreated = {
  __typename?: 'EnquiryCreated';
  id: Scalars['String']['output'];
};

export type EnquiryDeleted = {
  __typename?: 'EnquiryDeleted';
  id: Scalars['String']['output'];
};

export type EnquiryEdge = {
  __typename?: 'EnquiryEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Enquiry>;
};

export type EnquiryFiltersInput = {
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  enquiryStatusIds?: InputMaybe<Array<Scalars['String']['input']>>;
  onlyMine?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EnquiryMutableData = {
  __typename?: 'EnquiryMutableData';
  assigneeId?: Maybe<Scalars['String']['output']>;
  clientCompanyId?: Maybe<Scalars['String']['output']>;
  dealId?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<EnquiryPriority>;
  source?: Maybe<EnquirySource>;
  statusId?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

export type EnquiryMutableDataInput = {
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  clientCompanyId?: InputMaybe<Scalars['String']['input']>;
  dealId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<EnquiryPriority>;
  source?: InputMaybe<EnquirySource>;
  statusId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export enum EnquiryPriority {
  HighPriorityEnquiry = 'HIGH_PRIORITY_ENQUIRY',
  LowPriorityEnquiry = 'LOW_PRIORITY_ENQUIRY',
  MediumPriorityEnquiry = 'MEDIUM_PRIORITY_ENQUIRY',
  UnknownPriorityEnquiry = 'UNKNOWN_PRIORITY_ENQUIRY'
}

export enum EnquirySource {
  AuditCssCse = 'AUDIT_CSS_CSE',
  BusinessReviewMeeting = 'BUSINESS_REVIEW_MEETING',
  Chat = 'CHAT',
  ClientServicesChat = 'CLIENT_SERVICES_CHAT',
  EmailToAm = 'EMAIL_TO_AM',
  EmailToCsm = 'EMAIL_TO_CSM',
  MarketingEmail = 'MARKETING_EMAIL',
  PhoneAm = 'PHONE_AM',
  Unknown = 'UNKNOWN'
}

export type EnquiryStatus = {
  __typename?: 'EnquiryStatus';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type EnquiryUpdated = {
  __typename?: 'EnquiryUpdated';
  data?: Maybe<EnquiryMutableData>;
  id: Scalars['String']['output'];
};

export type EntityIdsList = {
  __typename?: 'EntityIdsList';
  entityIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type EntityUnion = Location | Selection | ShortlistSummary | Unit;

export enum EstimationType {
  AreaBusinessRates = 'AREA_BUSINESS_RATES',
  FitoutState = 'FITOUT_STATE',
  MinTermMonths = 'MIN_TERM_MONTHS',
  ProductAdvertisedPrice = 'PRODUCT_ADVERTISED_PRICE',
  ServiceCharge = 'SERVICE_CHARGE',
  UnitBusinessRates = 'UNIT_BUSINESS_RATES'
}

export type Event = {
  __typename?: 'Event';
  createdAt?: Maybe<Timestamp>;
  detail: Scalars['String']['output'];
  id: Scalars['String']['output'];
  requestId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type EventCreated = {
  __typename?: 'EventCreated';
  Id: Scalars['String']['output'];
  Message: Scalars['String']['output'];
  RequestId: Scalars['String']['output'];
  Tags: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type EventDeleted = {
  __typename?: 'EventDeleted';
  Id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ExchangeTokenRequest = {
  __typename?: 'ExchangeTokenRequest';
  cookie: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ExternalMedia = {
  __typename?: 'ExternalMedia';
  label: Scalars['String']['output'];
  unitId: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type FacilityIcon = {
  __typename?: 'FacilityIcon';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  uploadId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FailedToScrapeSite = {
  __typename?: 'FailedToScrapeSite';
  url: Scalars['String']['output'];
};

export type FavouriteAdded = {
  __typename?: 'FavouriteAdded';
  productId: Scalars['String']['output'];
};

export type FavouriteRemoved = {
  __typename?: 'FavouriteRemoved';
  productId: Scalars['String']['output'];
};

export type FeaturesMarkedAsRead = {
  __typename?: 'FeaturesMarkedAsRead';
  features?: Maybe<Array<TenantAppFeature>>;
};

export type Feedback = {
  __typename?: 'Feedback';
  additionalInfoJson: Scalars['String']['output'];
  app?: Maybe<App>;
  createdByUserId: Scalars['String']['output'];
  entityId: Scalars['String']['output'];
  entityType?: Maybe<FeedbackEntityType>;
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  rating: Scalars['Int']['output'];
};

export type FeedbackCreated = {
  __typename?: 'FeedbackCreated';
  feedback?: Maybe<Feedback>;
};

export enum FeedbackEntityType {
  FeedbackEntityTypeChat = 'FeedbackEntityTypeChat',
  FeedbackEntityTypeIssue = 'FeedbackEntityTypeIssue',
  FeedbackEntityTypeUnknown = 'FeedbackEntityTypeUnknown',
  FeedbackEntityTypeVisit = 'FeedbackEntityTypeVisit'
}

export type FilterOptions = {
  __typename?: 'FilterOptions';
  area: Array<Scalars['String']['output']>;
  desk: Array<Scalars['Int']['output']>;
  facility: Array<Scalars['String']['output']>;
  price: Array<Scalars['Int']['output']>;
  sqFt: Array<Scalars['Int']['output']>;
};

export type FiltersInput = {
  allowCombinations: Scalars['Boolean']['input'];
  area: Array<Scalars['String']['input']>;
  availableFrom?: InputMaybe<TimestampInput>;
  desk?: InputMaybe<RangeFilterInput>;
  excludeLocationIds: Array<Scalars['String']['input']>;
  facility: Array<Scalars['String']['input']>;
  locationIds: Array<Scalars['String']['input']>;
  occupiedFilter?: InputMaybe<OccupiedFilterInput>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  price?: InputMaybe<RangeFilterInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  squareFoot?: InputMaybe<RangeFilterInput>;
  type?: InputMaybe<UnitTypeValueInput>;
};

export enum FitoutTier {
  HighFitoutTier = 'HIGH_FITOUT_TIER',
  LowFitoutTier = 'LOW_FITOUT_TIER',
  MediumFitoutTier = 'MEDIUM_FITOUT_TIER',
  UnknownFitoutTier = 'UNKNOWN_FITOUT_TIER'
}

export type FloorFilters = {
  __typename?: 'FloorFilters';
  includeGround?: Maybe<Scalars['Boolean']['output']>;
  includeUnderground?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type FloorFiltersInput = {
  includeGround?: InputMaybe<Scalars['Boolean']['input']>;
  includeUnderground?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Floorplan = {
  __typename?: 'Floorplan';
  deskCount: Scalars['Int']['output'];
  geometries?: Maybe<Array<Geometry>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FloorplanApproved = {
  __typename?: 'FloorplanApproved';
  floorplanId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FloorplanDeleted = {
  __typename?: 'FloorplanDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FloorplanGenerated = {
  __typename?: 'FloorplanGenerated';
  custom: Scalars['Boolean']['output'];
  floorplan?: Maybe<Floorplan>;
  floorplanId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  index: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type FloorplanIngested = {
  __typename?: 'FloorplanIngested';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type FloorplanUpdated = {
  __typename?: 'FloorplanUpdated';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FloorplanZone = {
  __typename?: 'FloorplanZone';
  floorplanId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type FloorplanZoneUpdated = {
  __typename?: 'FloorplanZoneUpdated';
  user?: Maybe<User>;
  zone?: Maybe<FloorplanZone>;
};

export type FloorplansGenerationStarted = {
  __typename?: 'FloorplansGenerationStarted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GenerateFloorplans = {
  __typename?: 'GenerateFloorplans';
  name: Scalars['String']['output'];
  optimise?: Maybe<Scalars['Boolean']['output']>;
  quality?: Maybe<Scalars['Float']['output']>;
  src: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GeneratePdfRequest = {
  __typename?: 'GeneratePdfRequest';
  dimensions?: Maybe<Dimensions>;
  fileName: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
  waitForSelectors?: Maybe<Array<Scalars['String']['output']>>;
};

export type GeneratePdfRequestSubmitted = {
  __typename?: 'GeneratePdfRequestSubmitted';
  dimensions?: Maybe<Dimensions>;
  fileName: Scalars['String']['output'];
  requestId: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
  waitForSelectors?: Maybe<Array<Scalars['String']['output']>>;
};

export type GeoPoint = {
  __typename?: 'GeoPoint';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type GeoPointInput = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
};

export type GeometricPoint = {
  __typename?: 'GeometricPoint';
  user?: Maybe<User>;
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type Geometry = {
  __typename?: 'Geometry';
  entity?: Maybe<GeometryEntity>;
  entityId: Scalars['String']['output'];
  entityType?: Maybe<GeometryEntityType>;
  floorplanId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  innerRectangle?: Maybe<Rectangle>;
  user?: Maybe<User>;
  vertices?: Maybe<Array<GeometricPoint>>;
};

export type GeometryEntity = Desk | FloorplanZone | MeetingRoom;

export enum GeometryEntityType {
  GeometryEntityTypeColabArea = 'GeometryEntityType_ColabArea',
  GeometryEntityTypeDesk = 'GeometryEntityType_Desk',
  GeometryEntityTypeMeetingRoom = 'GeometryEntityType_MeetingRoom',
  GeometryEntityTypeUnknown = 'GeometryEntityType_Unknown',
  GeometryEntityTypeWall = 'GeometryEntityType_Wall',
  GeometryEntityTypeZoneOfInterest = 'GeometryEntityType_ZoneOfInterest'
}

export type GetAccessCodeBatchResponse = {
  __typename?: 'GetAccessCodeBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAccessCodeRequest = {
  __typename?: 'GetAccessCodeRequest';
  subjectId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetAccessCodeResponse = {
  __typename?: 'GetAccessCodeResponse';
  pin: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetAccessLogsResponse = {
  __typename?: 'GetAccessLogsResponse';
  edges?: Maybe<Array<AccessLogEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type GetAccessRequest = {
  __typename?: 'GetAccessRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetAccessResponse = {
  __typename?: 'GetAccessResponse';
  access?: Maybe<Access>;
  user?: Maybe<User>;
};

export type GetAccessesBatchResponse = {
  __typename?: 'GetAccessesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAccessesRequest = {
  __typename?: 'GetAccessesRequest';
  ids?: Maybe<Array<Scalars['String']['output']>>;
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  managed?: Maybe<Scalars['Boolean']['output']>;
  testtestetst?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetAccessesResponse = {
  __typename?: 'GetAccessesResponse';
  accesses?: Maybe<Array<Access>>;
  user?: Maybe<User>;
};

export type GetActiveSessionsResponse = {
  __typename?: 'GetActiveSessionsResponse';
  sessions?: Maybe<Array<Session>>;
  user?: Maybe<User>;
};

export type GetActivitiesBatchResponse = {
  __typename?: 'GetActivitiesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetActivitiesRequest = {
  __typename?: 'GetActivitiesRequest';
  assigneeIds: Array<Scalars['String']['output']>;
  collaboratorIds: Array<Scalars['String']['output']>;
  completedAfter?: Maybe<Timestamp>;
  completedBefore?: Maybe<Timestamp>;
  dealIds: Array<Scalars['String']['output']>;
  dueAfter?: Maybe<Timestamp>;
  dueBefore?: Maybe<Timestamp>;
  googleCalendarIds: Array<Scalars['String']['output']>;
  ids: Array<Scalars['String']['output']>;
  includeCompleted: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  order?: Maybe<ActivityOrder>;
  page: Scalars['Int']['output'];
  startingAfter?: Maybe<Timestamp>;
  startingBefore?: Maybe<Timestamp>;
  titleQuery: Scalars['String']['output'];
  types: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetActivitiesResponse = {
  __typename?: 'GetActivitiesResponse';
  activities?: Maybe<Array<Activity>>;
  totalCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetActivityIdsForSelectionRequest = {
  __typename?: 'GetActivityIdsForSelectionRequest';
  unitGroupId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetActivityIdsForSelectionResponse = {
  __typename?: 'GetActivityIdsForSelectionResponse';
  activityIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetActivityRequest = {
  __typename?: 'GetActivityRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetActivityResponse = {
  __typename?: 'GetActivityResponse';
  activity?: Maybe<Activity>;
  user?: Maybe<User>;
};

export type GetActivityTypesRequest = {
  __typename?: 'GetActivityTypesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetActivityTypesResponse = {
  __typename?: 'GetActivityTypesResponse';
  types?: Maybe<Array<ActivityType>>;
  user?: Maybe<User>;
};

export type GetAddonResponse = {
  __typename?: 'GetAddonResponse';
  addon?: Maybe<Addon>;
};

export type GetAdminRoomBookingsRequest = {
  __typename?: 'GetAdminRoomBookingsRequest';
  after?: Maybe<Scalars['String']['output']>;
  end?: Maybe<DateTime>;
  first?: Maybe<Scalars['Int']['output']>;
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  roomIds?: Maybe<Array<Scalars['String']['output']>>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
  userIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type GetAgencyCompanyForUrlRequest = {
  __typename?: 'GetAgencyCompanyForUrlRequest';
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetAgencyCompanyForUrlResponse = {
  __typename?: 'GetAgencyCompanyForUrlResponse';
  agencyDomain?: Maybe<AgencyDomain>;
  company?: Maybe<Company>;
  user?: Maybe<User>;
};

export type GetAgencyDomainsRequest = {
  __typename?: 'GetAgencyDomainsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAgencyDomainsResponse = {
  __typename?: 'GetAgencyDomainsResponse';
  domains?: Maybe<Array<AgencyDomain>>;
  user?: Maybe<User>;
};

export type GetAlarmsRequest = {
  __typename?: 'GetAlarmsRequest';
  locationIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetAlarmsResponse = {
  __typename?: 'GetAlarmsResponse';
  alarms?: Maybe<Array<Alarm>>;
  user?: Maybe<User>;
};

export type GetAllEnquiriesResponse = {
  __typename?: 'GetAllEnquiriesResponse';
  enquiries?: Maybe<Array<Enquiry>>;
};

export type GetAllEnquiryStatusesResponse = {
  __typename?: 'GetAllEnquiryStatusesResponse';
  enquiryStatuses?: Maybe<Array<EnquiryStatus>>;
};

export type GetAllQuoteStatusesResponse = {
  __typename?: 'GetAllQuoteStatusesResponse';
  quoteStatuses?: Maybe<Array<QuoteStatus>>;
};

export type GetAllSalesTeamsRequest = {
  __typename?: 'GetAllSalesTeamsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAllSalesTeamsResponse = {
  __typename?: 'GetAllSalesTeamsResponse';
  salesTeams?: Maybe<Array<SalesTeam>>;
  user?: Maybe<User>;
};

export type GetAmenitiesRequest = {
  __typename?: 'GetAmenitiesRequest';
  companyId?: Maybe<Scalars['String']['output']>;
  entityTypes?: Maybe<Array<BookableEntity>>;
  user?: Maybe<User>;
};

export type GetAmenitiesResponse = {
  __typename?: 'GetAmenitiesResponse';
  amenities?: Maybe<Array<Amenity>>;
  user?: Maybe<User>;
};

export type GetArchivedMessagesResponse = {
  __typename?: 'GetArchivedMessagesResponse';
  messages?: Maybe<Array<Message>>;
};

export type GetAreasRequest = {
  __typename?: 'GetAreasRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAreasResponse = {
  __typename?: 'GetAreasResponse';
  areas?: Maybe<Array<Area>>;
  user?: Maybe<User>;
};

export type GetAssigneeRequest = {
  __typename?: 'GetAssigneeRequest';
  categoryId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetAssigneeResponse = {
  __typename?: 'GetAssigneeResponse';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetAssignmentsRequest = {
  __typename?: 'GetAssignmentsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAssignmentsResponse = {
  __typename?: 'GetAssignmentsResponse';
  files?: Maybe<Array<Assignment>>;
  user?: Maybe<User>;
};

export type GetAttendancePoliciesByEntityIdResponse = {
  __typename?: 'GetAttendancePoliciesByEntityIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAttendanceStateRequest = {
  __typename?: 'GetAttendanceStateRequest';
  timezone?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetAttendanceStateResponse = {
  __typename?: 'GetAttendanceStateResponse';
  dates?: Maybe<Array<AttendanceStateForDate>>;
  user?: Maybe<User>;
};

export type GetAttendancesBatchResponse = {
  __typename?: 'GetAttendancesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetAverageAccessesByCompanyResponse = {
  __typename?: 'GetAverageAccessesByCompanyResponse';
  averageAccessesByDay?: Maybe<Array<AverageAccessesByDay>>;
  companyId: Scalars['String']['output'];
};

export type GetAverageAttendancePerWeekResponse = {
  __typename?: 'GetAverageAttendancePerWeekResponse';
  averageDaysInOffice: Scalars['Float']['output'];
};

export type GetBookableRoomsRequest = {
  __typename?: 'GetBookableRoomsRequest';
  amenityIds?: Maybe<Array<Scalars['String']['output']>>;
  bookingEnd?: Maybe<DateTime>;
  bookingStart?: Maybe<DateTime>;
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  roomIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type GetBookableRoomsResponse = {
  __typename?: 'GetBookableRoomsResponse';
  rooms?: Maybe<Array<MeetingRoom>>;
  user?: Maybe<User>;
};

export type GetBookingBatchResponse = {
  __typename?: 'GetBookingBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBookingRequest = {
  __typename?: 'GetBookingRequest';
  bookingId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetBookingResponse = {
  __typename?: 'GetBookingResponse';
  booking?: Maybe<Booking>;
  user?: Maybe<User>;
};

export type GetBookingsBatchResponse = {
  __typename?: 'GetBookingsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBookingsForEntity = {
  __typename?: 'GetBookingsForEntity';
  end?: Maybe<DateTime>;
  entityId: Scalars['String']['output'];
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetBookingsForEntityBatchRequest = {
  __typename?: 'GetBookingsForEntityBatchRequest';
  GetBookingsForEntity?: Maybe<Array<GetBookingsForEntity>>;
  user?: Maybe<User>;
};

export type GetBookingsRequest = {
  __typename?: 'GetBookingsRequest';
  bookingIds: Array<Scalars['String']['output']>;
  descending: Scalars['Boolean']['output'];
  endDate?: Maybe<Timestamp>;
  locationIds: Array<Scalars['String']['output']>;
  page: Scalars['Int']['output'];
  roomIds: Array<Scalars['String']['output']>;
  scopeByUser: Scalars['Boolean']['output'];
  sortBy?: Maybe<SortBy>;
  startDate?: Maybe<Timestamp>;
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type GetBookingsResponse = {
  __typename?: 'GetBookingsResponse';
  bookings?: Maybe<Array<Booking>>;
  pages: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetBoundariesResponse = {
  __typename?: 'GetBoundariesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type GetBoundaryListResponse = {
  __typename?: 'GetBoundaryListResponse';
  boundaries?: Maybe<Array<Boundary>>;
};

export type GetBoundaryResponse = {
  __typename?: 'GetBoundaryResponse';
  boundary?: Maybe<Boundary>;
};

export type GetBrochureBatchResponse = {
  __typename?: 'GetBrochureBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBrochureRequest = {
  __typename?: 'GetBrochureRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetBrochureResponse = {
  __typename?: 'GetBrochureResponse';
  brochure?: Maybe<Brochure>;
  user?: Maybe<User>;
};

export type GetBrokerCommunicationsBatchResponse = {
  __typename?: 'GetBrokerCommunicationsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBrokerSearchRequest = {
  __typename?: 'GetBrokerSearchRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetBrokerSearchResponse = {
  __typename?: 'GetBrokerSearchResponse';
  search?: Maybe<BrokerSearch>;
  user?: Maybe<User>;
};

export type GetBuildingRequest = {
  __typename?: 'GetBuildingRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetBuildingResponse = {
  __typename?: 'GetBuildingResponse';
  building?: Maybe<Building>;
  user?: Maybe<User>;
};

export type GetBuildingTimeZoneBatchRequest = {
  __typename?: 'GetBuildingTimeZoneBatchRequest';
  requests?: Maybe<Array<GetBuildingTimeZoneRequest>>;
  user?: Maybe<User>;
};

export type GetBuildingTimeZoneBatchResponse = {
  __typename?: 'GetBuildingTimeZoneBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBuildingTimeZoneRequest = {
  __typename?: 'GetBuildingTimeZoneRequest';
  companyId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetBuildingTraitsRequest = {
  __typename?: 'GetBuildingTraitsRequest';
  types?: Maybe<Array<BuildingTraitType>>;
  user?: Maybe<User>;
};

export type GetBuildingTraitsResponse = {
  __typename?: 'GetBuildingTraitsResponse';
  traits?: Maybe<Array<BuildingTrait>>;
  user?: Maybe<User>;
};

export type GetBuildingUnitsBatchResponse = {
  __typename?: 'GetBuildingUnitsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBuildingsBatchResponse = {
  __typename?: 'GetBuildingsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetBusiestDayOfTheWeekResponse = {
  __typename?: 'GetBusiestDayOfTheWeekResponse';
  day: Scalars['String']['output'];
};

export type GetBusinessRatesForUnitResponse = {
  __typename?: 'GetBusinessRatesForUnitResponse';
  businessRates?: Maybe<Money>;
};

export type GetCapacityRequest = {
  __typename?: 'GetCapacityRequest';
  companyId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetCapacityResponse = {
  __typename?: 'GetCapacityResponse';
  capacity: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetCategoriesRequest = {
  __typename?: 'GetCategoriesRequest';
  categoryIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetCategoriesResponse = {
  __typename?: 'GetCategoriesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export enum GetChatHistoryOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type GetChatHistoryRequest = {
  __typename?: 'GetChatHistoryRequest';
  after?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  order?: Maybe<GetChatHistoryOrder>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type GetChatMembersResponse = {
  __typename?: 'GetChatMembersResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetChatRequest = {
  __typename?: 'GetChatRequest';
  chatId: Scalars['String']['output'];
  showArchived?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetChatResponse = {
  __typename?: 'GetChatResponse';
  chat?: Maybe<Chat>;
  user?: Maybe<User>;
};

export type GetChatsForUserRequest = {
  __typename?: 'GetChatsForUserRequest';
  types?: Maybe<Array<ChatType>>;
  user?: Maybe<User>;
};

export type GetChatsForUserResponse = {
  __typename?: 'GetChatsForUserResponse';
  chats?: Maybe<Array<Chat>>;
  user?: Maybe<User>;
};

export type GetChatsRequest = {
  __typename?: 'GetChatsRequest';
  chatIds?: Maybe<Array<Scalars['String']['output']>>;
  companyIds?: Maybe<Array<Scalars['String']['output']>>;
  page?: Maybe<Scalars['Int']['output']>;
  showArchived?: Maybe<Scalars['Boolean']['output']>;
  types?: Maybe<Array<ChatType>>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
  userIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type GetChatsResponse = {
  __typename?: 'GetChatsResponse';
  chats?: Maybe<Array<Chat>>;
  pages: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetClientChatsSinceRequest = {
  __typename?: 'GetClientChatsSinceRequest';
  companyIds?: Maybe<Array<Scalars['String']['output']>>;
  since?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetClientChatsSinceResponse = {
  __typename?: 'GetClientChatsSinceResponse';
  chats?: Maybe<Array<Chat>>;
  user?: Maybe<User>;
};

export type GetCombinationDetailsBatchRequest = {
  __typename?: 'GetCombinationDetailsBatchRequest';
  combinationRequests?: Maybe<Array<GetCombinationDetailsRequest>>;
  user?: Maybe<User>;
};

export type GetCombinationDetailsBatchResponse = {
  __typename?: 'GetCombinationDetailsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCombinationDetailsRequest = {
  __typename?: 'GetCombinationDetailsRequest';
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetCombinationDetailsResponse = {
  __typename?: 'GetCombinationDetailsResponse';
  details?: Maybe<CombinationDetails>;
  user?: Maybe<User>;
};

export type GetCommercialModelRequest = {
  __typename?: 'GetCommercialModelRequest';
  inputs?: Maybe<CommercialModelInputs>;
  user?: Maybe<User>;
};

export type GetCommercialModelResponse = {
  __typename?: 'GetCommercialModelResponse';
  lumpSums?: Maybe<LumpSums>;
  monthly?: Maybe<CommercialModelBreakdown>;
  psfYr?: Maybe<CommercialModelBreakdown>;
  user?: Maybe<User>;
};

export type GetCommunicationsBatchResponse = {
  __typename?: 'GetCommunicationsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompaniesByIdResponse = {
  __typename?: 'GetCompaniesByIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompaniesForAccountManagerRequest = {
  __typename?: 'GetCompaniesForAccountManagerRequest';
  accountManagerUserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetCompaniesForAccountManagerResponse = {
  __typename?: 'GetCompaniesForAccountManagerResponse';
  companies?: Maybe<Array<Company>>;
  user?: Maybe<User>;
};

export type GetCompaniesForClientSupportSpecialistsRequest = {
  __typename?: 'GetCompaniesForClientSupportSpecialistsRequest';
  clientSupportSpecialistUserIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetCompaniesForClientSupportSpecialistsResponse = {
  __typename?: 'GetCompaniesForClientSupportSpecialistsResponse';
  companies?: Maybe<Array<Company>>;
  user?: Maybe<User>;
};

export type GetCompaniesRequest = {
  __typename?: 'GetCompaniesRequest';
  after?: Maybe<Scalars['String']['output']>;
  archived?: Maybe<Scalars['Boolean']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  priorityIds?: Maybe<Array<Scalars['String']['output']>>;
  query?: Maybe<Scalars['String']['output']>;
  types?: Maybe<Array<CompanyType>>;
  user?: Maybe<User>;
};

export type GetCompaniesResponse = {
  __typename?: 'GetCompaniesResponse';
  connection?: Maybe<CompaniesConnection>;
  user?: Maybe<User>;
};

export type GetCompanyGuestsRequest = {
  __typename?: 'GetCompanyGuestsRequest';
  companyId: Scalars['String']['output'];
  locationIds: Array<Scalars['String']['output']>;
  registeredBetween?: Maybe<GuestDateRange>;
  user?: Maybe<User>;
};

export type GetCompanyGuestsResponse = {
  __typename?: 'GetCompanyGuestsResponse';
  guests?: Maybe<Array<Guest>>;
  user?: Maybe<User>;
};

export type GetCompanyIngressesBatchResponse = {
  __typename?: 'GetCompanyIngressesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompanyOfficeAttendanceResponse = {
  __typename?: 'GetCompanyOfficeAttendanceResponse';
  periods?: Maybe<Array<OfficeAttendancePeriod>>;
};

export type GetCompanyRequest = {
  __typename?: 'GetCompanyRequest';
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetCompanySizesRequest = {
  __typename?: 'GetCompanySizesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompanySizesResponse = {
  __typename?: 'GetCompanySizesResponse';
  companySizes?: Maybe<Array<CompanySize>>;
  user?: Maybe<User>;
};

export type GetCompanyTeamBatchResponse = {
  __typename?: 'GetCompanyTeamBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompanyTeamsByCompanyIdRequest = {
  __typename?: 'GetCompanyTeamsByCompanyIdRequest';
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetCompanyTeamsByCompanyIdResponse = {
  __typename?: 'GetCompanyTeamsByCompanyIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCompanyUsersRequest = {
  __typename?: 'GetCompanyUsersRequest';
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type GetCompanyUsersResponse = {
  __typename?: 'GetCompanyUsersResponse';
  user?: Maybe<User>;
  users?: Maybe<Array<User>>;
};

export type GetCompanyWeeklyOfficeAttendanceResponse = {
  __typename?: 'GetCompanyWeeklyOfficeAttendanceResponse';
  weeklyAttendance?: Maybe<Array<DailyOfficeAttendance>>;
};

export type GetConfiguratorSessionResponse = {
  __typename?: 'GetConfiguratorSessionResponse';
  session?: Maybe<ConfiguratorSession>;
};

export type GetCultureValuesRequest = {
  __typename?: 'GetCultureValuesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetCultureValuesResponse = {
  __typename?: 'GetCultureValuesResponse';
  culureValues?: Maybe<Array<CultureValue>>;
  user?: Maybe<User>;
};

export type GetDealByClientCompanyIdResponse = {
  __typename?: 'GetDealByClientCompanyIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetDealFromBrokerSearchRequest = {
  __typename?: 'GetDealFromBrokerSearchRequest';
  brokerSearchId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetDealFromBrokerSearchResponse = {
  __typename?: 'GetDealFromBrokerSearchResponse';
  deal?: Maybe<Deal>;
  user?: Maybe<User>;
};

export type GetDealInsightsResponse = {
  __typename?: 'GetDealInsightsResponse';
  stages?: Maybe<Array<DealPipelineStageInsight>>;
};

export type GetDealNotesRequest = {
  __typename?: 'GetDealNotesRequest';
  dealId: Scalars['String']['output'];
  ids: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetDealNotesResponse = {
  __typename?: 'GetDealNotesResponse';
  notes?: Maybe<Array<Note>>;
  user?: Maybe<User>;
};

export type GetDealPipelineStagesBatchResponse = {
  __typename?: 'GetDealPipelineStagesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetDealRequest = {
  __typename?: 'GetDealRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetDealResponse = {
  __typename?: 'GetDealResponse';
  deal?: Maybe<Deal>;
  user?: Maybe<User>;
};

export type GetDealShortlistsBatchResponse = {
  __typename?: 'GetDealShortlistsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetDealShortlistsRequest = {
  __typename?: 'GetDealShortlistsRequest';
  dealId?: Maybe<Scalars['String']['output']>;
  primaryBrokerContactId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type GetDealShortlistsResponse = {
  __typename?: 'GetDealShortlistsResponse';
  dealShortlists?: Maybe<Array<DealShortlist>>;
  user?: Maybe<User>;
};

export type GetDealSpaceMatchRequest = {
  __typename?: 'GetDealSpaceMatchRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetDealSpaceMatchResponse = {
  __typename?: 'GetDealSpaceMatchResponse';
  dealSpaceMatch?: Maybe<DealSpaceMatch>;
  user?: Maybe<User>;
};

export type GetDealSpaceMatchesRequest = {
  __typename?: 'GetDealSpaceMatchesRequest';
  dealId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetDealSpaceMatchesResponse = {
  __typename?: 'GetDealSpaceMatchesResponse';
  dealSpaceMatches?: Maybe<Array<DealSpaceMatch>>;
  user?: Maybe<User>;
};

export type GetDealsListRequest = {
  __typename?: 'GetDealsListRequest';
  after?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type GetDealsRequest = {
  __typename?: 'GetDealsRequest';
  filters?: Maybe<DealFilters>;
  ids: Array<Scalars['String']['output']>;
  limit: Scalars['Int']['output'];
  order?: Maybe<DealOrder>;
  page: Scalars['Int']['output'];
  stageId: Scalars['String']['output'];
  stageIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetDealsResponse = {
  __typename?: 'GetDealsResponse';
  deals?: Maybe<Array<Deal>>;
  paginationData?: Maybe<DealPaginationData>;
  stages?: Maybe<Array<PipelineStage>>;
  user?: Maybe<User>;
};

export type GetDeploymentStatusRequest = {
  __typename?: 'GetDeploymentStatusRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetDeploymentStatusResponse = {
  __typename?: 'GetDeploymentStatusResponse';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetDeploymentsResponse = {
  __typename?: 'GetDeploymentsResponse';
  deployments?: Maybe<Array<Deployment>>;
};

export type GetDeskBookingsRequest = {
  __typename?: 'GetDeskBookingsRequest';
  companyIds?: Maybe<Array<Scalars['String']['output']>>;
  startUtcMax?: Maybe<DateTime>;
  startUtcMin?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetDeskBookingsResponse = {
  __typename?: 'GetDeskBookingsResponse';
  bookings?: Maybe<Array<RoomOrDeskBooking>>;
  user?: Maybe<User>;
};

export type GetDetailsForUnitsResponse = {
  __typename?: 'GetDetailsForUnitsResponse';
  annualAdvertisedPricePsfPennies: Scalars['Int']['output'];
  annualBreakdown?: Maybe<AnnualPricingBreakdown>;
  annualBrokerFeesPsfPennies: Scalars['Int']['output'];
  annualFitoutCostPsfPennies: Scalars['Int']['output'];
  annualKittFeePsfPennies: Scalars['Int']['output'];
  annualNetRentPsfPennies: Scalars['Int']['output'];
  annualOpsCostPsfPennies: Scalars['Int']['output'];
  annualServiceChargePsfPennies: Scalars['Int']['output'];
  availabilityStatus?: Maybe<AvailabilityStatus>;
  brokerFeeLumpSumPennies: Scalars['Int']['output'];
  combinedUnitsFitoutStatesDescription: Scalars['String']['output'];
  combinedUnitsName: Scalars['String']['output'];
  estimations?: Maybe<Array<EstimationType>>;
  fitoutState?: Maybe<Unitsvc_UnitFitoutState>;
  /** Does the detail response have pricing estimations in it? */
  hasPricingEstimations?: Maybe<Scalars['Boolean']['output']>;
  minTermMonths: Scalars['Int']['output'];
  monthlyAdvertisedPricePennies: Scalars['Int']['output'];
  monthlyBreakdown?: Maybe<MonthlyPricingBreakdown>;
  monthlyRatesPsfPennies: Scalars['Int']['output'];
  productId: Scalars['String']['output'];
  sqft: Scalars['Int']['output'];
};

export type GetDocumentResponse = {
  __typename?: 'GetDocumentResponse';
  document?: Maybe<Document>;
};

export type GetDocumentTypesResponse = {
  __typename?: 'GetDocumentTypesResponse';
  documentTypes?: Maybe<Array<DocumentType>>;
};

export type GetDocumentsResponse = {
  __typename?: 'GetDocumentsResponse';
  documents?: Maybe<Array<Document>>;
};

export type GetEmailContentRequest = {
  __typename?: 'GetEmailContentRequest';
  ids: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetEmailContentResponse = {
  __typename?: 'GetEmailContentResponse';
  contentsList?: Maybe<Array<EmailContent>>;
  user?: Maybe<User>;
};

export type GetEmailRequest = {
  __typename?: 'GetEmailRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetEmailResponse = {
  __typename?: 'GetEmailResponse';
  email?: Maybe<Email>;
  user?: Maybe<User>;
};

export type GetEmailsRequest = {
  __typename?: 'GetEmailsRequest';
  emailAddress: Array<Scalars['String']['output']>;
  gmailThreadId: Array<Scalars['String']['output']>;
  ids: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetEmailsResponse = {
  __typename?: 'GetEmailsResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetEnquiriesPaginatedResponse = {
  __typename?: 'GetEnquiriesPaginatedResponse';
  columnDetails?: Maybe<Array<EnquiryColumnDetails>>;
  enquiries?: Maybe<Array<Enquiry>>;
};

export type GetEnquiryResponse = {
  __typename?: 'GetEnquiryResponse';
  enquiry?: Maybe<Enquiry>;
};

export type GetEntitiesForAmenityBatchRequest = {
  __typename?: 'GetEntitiesForAmenityBatchRequest';
  requests?: Maybe<Array<GetEntitiesForAmenityRequest>>;
  user?: Maybe<User>;
};

export type GetEntitiesForAmenityRequest = {
  __typename?: 'GetEntitiesForAmenityRequest';
  amenityId: Scalars['String']['output'];
  floorplanId: Scalars['String']['output'];
  teamIds: Array<Scalars['String']['output']>;
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetEventRequest = {
  __typename?: 'GetEventRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetEventResponse = {
  __typename?: 'GetEventResponse';
  events?: Maybe<Event>;
  user?: Maybe<User>;
};

export type GetEventsRequest = {
  __typename?: 'GetEventsRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetEventsResponse = {
  __typename?: 'GetEventsResponse';
  events?: Maybe<Array<Event>>;
  user?: Maybe<User>;
};

export type GetFacilityIconsRequest = {
  __typename?: 'GetFacilityIconsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetFacilityIconsResponse = {
  __typename?: 'GetFacilityIconsResponse';
  icons?: Maybe<Array<FacilityIcon>>;
  user?: Maybe<User>;
};

export type GetFavouritesResponse = {
  __typename?: 'GetFavouritesResponse';
  productIds: Array<Scalars['String']['output']>;
};

export type GetFieldsRequiredForNextStatusRequest = {
  __typename?: 'GetFieldsRequiredForNextStatusRequest';
  locationId: Scalars['String']['output'];
  status?: Maybe<StatusOptional>;
  user?: Maybe<User>;
};

export type GetFieldsRequiredForNextStatusResponse = {
  __typename?: 'GetFieldsRequiredForNextStatusResponse';
  requiredFields?: Maybe<LocationRequiredFields>;
  user?: Maybe<User>;
};

export type GetFirstViewingActivitiesByUnitIdsBatchResponse = {
  __typename?: 'GetFirstViewingActivitiesByUnitIdsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetFloorplanZonesForTenancyResponse = {
  __typename?: 'GetFloorplanZonesForTenancyResponse';
  floorplanZones?: Maybe<Array<TenancyFloorplanZone>>;
};

export type GetFloorplanZonesRequest = {
  __typename?: 'GetFloorplanZonesRequest';
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetFloorplanZonesResponse = {
  __typename?: 'GetFloorplanZonesResponse';
  user?: Maybe<User>;
  zones?: Maybe<Array<FloorplanZone>>;
};

export type GetFloorplansForTenancyRequest = {
  __typename?: 'GetFloorplansForTenancyRequest';
  tenancyIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type GetFloorplansForTenancyResponse = {
  __typename?: 'GetFloorplansForTenancyResponse';
  floorplans?: Maybe<Array<Floorplan>>;
  user?: Maybe<User>;
};

export type GetGoogleAccessTokenRequest = {
  __typename?: 'GetGoogleAccessTokenRequest';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetGoogleAccessTokenResponse = {
  __typename?: 'GetGoogleAccessTokenResponse';
  accessToken: Scalars['String']['output'];
  scopes: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetGuestAccessesRequest = {
  __typename?: 'GetGuestAccessesRequest';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetGuestAccessesResponse = {
  __typename?: 'GetGuestAccessesResponse';
  accessId: Array<Scalars['String']['output']>;
  accesses?: Maybe<Array<Maybe<Access>>>;
  user?: Maybe<User>;
};

export type GetGuestRequest = {
  __typename?: 'GetGuestRequest';
  guestId?: Maybe<Scalars['String']['output']>;
  token?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetGuestResponse = {
  __typename?: 'GetGuestResponse';
  guest?: Maybe<Guest>;
  user?: Maybe<User>;
};

export type GetGuestsBatchResponse = {
  __typename?: 'GetGuestsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetGuestsRequest = {
  __typename?: 'GetGuestsRequest';
  locationIds: Array<Scalars['String']['output']>;
  registeredBetween?: Maybe<GuestDateRange>;
  user?: Maybe<User>;
};

export type GetGuestsResponse = {
  __typename?: 'GetGuestsResponse';
  guests?: Maybe<Array<Guest>>;
  user?: Maybe<User>;
};

export type GetHasUserReadNotificationResponse = {
  __typename?: 'GetHasUserReadNotificationResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetHybridWorkInformationRequest = {
  __typename?: 'GetHybridWorkInformationRequest';
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetHybridWorkInformationResponse = {
  __typename?: 'GetHybridWorkInformationResponse';
  companyId: Scalars['String']['output'];
  inputs?: Maybe<Array<PolicyInput>>;
  user?: Maybe<User>;
};

export type GetIndexKeyResponse = {
  __typename?: 'GetIndexKeyResponse';
  appId: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

export type GetIndustriesRequest = {
  __typename?: 'GetIndustriesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetIndustriesResponse = {
  __typename?: 'GetIndustriesResponse';
  industries?: Maybe<Array<Industry>>;
  user?: Maybe<User>;
};

export type GetIndustryInsightsResponse = {
  __typename?: 'GetIndustryInsightsResponse';
  currentCompanyPercentages?: Maybe<WeekdayInsights>;
  industryCompanyWithHighestPolicySuccessRate: Scalars['String']['output'];
  industryPercentages?: Maybe<WeekdayInsights>;
  mostSuccessfulAttendancePolicy?: Maybe<AttendancePoliciesList>;
};

export type GetIssueCategoriesResponse = {
  __typename?: 'GetIssueCategoriesResponse';
  categories?: Maybe<Array<IssueCategory>>;
};

export type GetIssuePrioritiesResponse = {
  __typename?: 'GetIssuePrioritiesResponse';
  priorities?: Maybe<Array<IssuePriority>>;
};

export type GetIssueResponse = {
  __typename?: 'GetIssueResponse';
  issue?: Maybe<Issue>;
};

export type GetIssueStatusesResponse = {
  __typename?: 'GetIssueStatusesResponse';
  statuses?: Maybe<Array<IssueStatus>>;
};

export type GetIssueUpdateWorkflowsResponse = {
  __typename?: 'GetIssueUpdateWorkflowsResponse';
  templates?: Maybe<Array<IssueUpdateWorkflow>>;
};

export type GetIssueUpdatesResponse = {
  __typename?: 'GetIssueUpdatesResponse';
  updates?: Maybe<Array<IssueUpdate>>;
};

export type GetKittTemplateForEntityGroupRequest = {
  __typename?: 'GetKittTemplateForEntityGroupRequest';
  entityIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetKittTemplateForEntityGroupResponse = {
  __typename?: 'GetKittTemplateForEntityGroupResponse';
  brochures?: Maybe<Array<Brochure>>;
  user?: Maybe<User>;
};

export type GetLeadSourcesRequest = {
  __typename?: 'GetLeadSourcesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLeadSourcesResponse = {
  __typename?: 'GetLeadSourcesResponse';
  sources?: Maybe<Array<LeadSource>>;
  user?: Maybe<User>;
};

export type GetLocationFacilitiesRequest = {
  __typename?: 'GetLocationFacilitiesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLocationFacilitiesResponse = {
  __typename?: 'GetLocationFacilitiesResponse';
  facilities?: Maybe<Array<LocationFacility>>;
  user?: Maybe<User>;
};

export type GetLocationFinancialModelBatchResponse = {
  __typename?: 'GetLocationFinancialModelBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLocationFinancialModelResponse = {
  __typename?: 'GetLocationFinancialModelResponse';
  financialModel?: Maybe<LocationFinancialModel>;
  user?: Maybe<User>;
};

export type GetLocationRequest = {
  __typename?: 'GetLocationRequest';
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetLocationResponse = {
  __typename?: 'GetLocationResponse';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type GetLocationScrapedStatusResponse = {
  __typename?: 'GetLocationScrapedStatusResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLocationSellingPointsRequest = {
  __typename?: 'GetLocationSellingPointsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLocationSellingPointsResponse = {
  __typename?: 'GetLocationSellingPointsResponse';
  sellingPoints?: Maybe<Array<LocationSellingPoint>>;
  user?: Maybe<User>;
};

export enum GetLocationsFilterOperand {
  And = 'AND',
  Invalid = 'INVALID',
  Or = 'OR'
}

export type GetLocationsPaginatedResponse = {
  __typename?: 'GetLocationsPaginatedResponse';
  locations?: Maybe<LocationsConnection>;
  user?: Maybe<User>;
  viewport?: Maybe<LocationViewport>;
};

export type GetLocationsRequest = {
  __typename?: 'GetLocationsRequest';
  address?: Maybe<Address>;
  after?: Maybe<Scalars['String']['output']>;
  archived?: Maybe<Scalars['Boolean']['output']>;
  descending?: Maybe<Scalars['Boolean']['output']>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  first?: Maybe<Scalars['Int']['output']>;
  hideExistingOffer?: Maybe<Scalars['Boolean']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  includeArchived?: Maybe<Scalars['Boolean']['output']>;
  isKittChoice?: Maybe<Scalars['Boolean']['output']>;
  onMarket?: Maybe<Scalars['Boolean']['output']>;
  onlyLiveOnSearch?: Maybe<Scalars['Boolean']['output']>;
  onlyVisibleOnWebsite?: Maybe<Scalars['Boolean']['output']>;
  polygonArray?: Maybe<Array<Coordinate>>;
  potentialProductFilters?: Maybe<PotentialProductFilters>;
  productFilters?: Maybe<LocationProductFilters>;
  publishedState?: Maybe<Scalars['Boolean']['output']>;
  qualifiedBetween?: Maybe<DateRange>;
  query?: Maybe<Scalars['String']['output']>;
  sortBy?: Maybe<LocationSortBy>;
  sortByCoordinates?: Maybe<Coordinate>;
  statuses?: Maybe<Array<LocationStatus>>;
  unitFilters?: Maybe<UnitFilters>;
  unqualified?: Maybe<Scalars['Boolean']['output']>;
  unverified?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
  verifiedBetween?: Maybe<DateRange>;
};

export type GetLostReasonsRequest = {
  __typename?: 'GetLostReasonsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetLostReasonsResponse = {
  __typename?: 'GetLostReasonsResponse';
  lostReasons?: Maybe<Array<LostReason>>;
  user?: Maybe<User>;
};

export type GetManyProfilesBatchResponse = {
  __typename?: 'GetManyProfilesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetMarketingContentResponse = {
  __typename?: 'GetMarketingContentResponse';
  marketingContent?: Maybe<MarketingContent>;
};

export type GetMarketingContentsResponse = {
  __typename?: 'GetMarketingContentsResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type GetMatchedSpacesRequest = {
  __typename?: 'GetMatchedSpacesRequest';
  dealId: Scalars['String']['output'];
  includeDeleted: Scalars['Boolean']['output'];
  requirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetMatchedSpacesResponse = {
  __typename?: 'GetMatchedSpacesResponse';
  matches?: Maybe<Array<MatchedSpace>>;
  user?: Maybe<User>;
};

export type GetMeanAgeForCompanyResponse = {
  __typename?: 'GetMeanAgeForCompanyResponse';
  meanAge: Scalars['Int']['output'];
};

export type GetMessagesByChatIdResponse = {
  __typename?: 'GetMessagesByChatIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetMessagesInThread = {
  __typename?: 'GetMessagesInThread';
  parentMessageId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetMessagesInThreadResponse = {
  __typename?: 'GetMessagesInThreadResponse';
  messages?: Maybe<Array<ChatMessage>>;
  user?: Maybe<User>;
};

export type GetMessagesRequest = {
  __typename?: 'GetMessagesRequest';
  chatId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetMessagesResponse = {
  __typename?: 'GetMessagesResponse';
  messages?: Maybe<Array<ChatMessage>>;
  user?: Maybe<User>;
};

export type GetMinSafeCapacityRequest = {
  __typename?: 'GetMinSafeCapacityRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetMinSafeCapacityResponse = {
  __typename?: 'GetMinSafeCapacityResponse';
  minSafeCapacity: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetModelResponse = {
  __typename?: 'GetModelResponse';
  model: Scalars['String']['output'];
};

export type GetMyAttendancePolicyRequest = {
  __typename?: 'GetMyAttendancePolicyRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetMyAttendancePolicyResponse = {
  __typename?: 'GetMyAttendancePolicyResponse';
  policy?: Maybe<AttendancePoliciesList>;
  user?: Maybe<User>;
};

export type GetMyBookingsPaginatedRequest = {
  __typename?: 'GetMyBookingsPaginatedRequest';
  after?: Maybe<Scalars['String']['output']>;
  afterDate?: Maybe<Timestamp>;
  ascending?: Maybe<Scalars['Boolean']['output']>;
  beforeDate?: Maybe<Timestamp>;
  first?: Maybe<Scalars['Int']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  includeOngoing?: Maybe<Scalars['Boolean']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  sortBy?: Maybe<BookingSortBy>;
  user?: Maybe<User>;
};

export type GetMyBookingsRequest = {
  __typename?: 'GetMyBookingsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetMyCompanyDesksRequest = {
  __typename?: 'GetMyCompanyDesksRequest';
  tenancyIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetMyCompanyDesksResponse = {
  __typename?: 'GetMyCompanyDesksResponse';
  desks?: Maybe<Array<Desk>>;
  user?: Maybe<User>;
};

export type GetMyCompanyEnquiriesResponse = {
  __typename?: 'GetMyCompanyEnquiriesResponse';
  count: Scalars['Int']['output'];
  edges?: Maybe<Array<EnquiryEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type GetMyDeskBookingsRequest = {
  __typename?: 'GetMyDeskBookingsRequest';
  after?: Maybe<Scalars['String']['output']>;
  end?: Maybe<DateTime>;
  first?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetMyGuestsPaginated = {
  __typename?: 'GetMyGuestsPaginated';
  after?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
  visitAfter?: Maybe<Timestamp>;
  visitBefore?: Maybe<Timestamp>;
};

export type GetMyNotificationPreferencesRequest = {
  __typename?: 'GetMyNotificationPreferencesRequest';
  metadata?: Maybe<Array<NotificationPreferenceMetadata>>;
  user?: Maybe<User>;
};

export type GetMyNotificationPreferencesResponse = {
  __typename?: 'GetMyNotificationPreferencesResponse';
  preferences?: Maybe<Array<Preference>>;
  user?: Maybe<User>;
};

export type GetMyOfficeAttendanceResponse = {
  __typename?: 'GetMyOfficeAttendanceResponse';
  attendances: Scalars['Int']['output'];
  attendeeUserIds: Array<Scalars['String']['output']>;
  attendees?: Maybe<Array<Maybe<User>>>;
  capacity: Scalars['Int']['output'];
};

export type GetMyRoomBookingsRequest = {
  __typename?: 'GetMyRoomBookingsRequest';
  after?: Maybe<Scalars['String']['output']>;
  end?: Maybe<DateTime>;
  first?: Maybe<Scalars['Int']['output']>;
  roomIds?: Maybe<Array<Scalars['String']['output']>>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetMyRoomsRequest = {
  __typename?: 'GetMyRoomsRequest';
  roomIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type GetNoteRequest = {
  __typename?: 'GetNoteRequest';
  noteId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetNoteResponse = {
  __typename?: 'GetNoteResponse';
  note?: Maybe<Note>;
  user?: Maybe<User>;
};

export type GetNotesBatchResponse = {
  __typename?: 'GetNotesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetNotificationsPaginatedRequest = {
  __typename?: 'GetNotificationsPaginatedRequest';
  after?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  orderByUnread?: Maybe<Scalars['Boolean']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetNotificationsRequest = {
  __typename?: 'GetNotificationsRequest';
  limit: Scalars['Int']['output'];
  offset: Scalars['Int']['output'];
  onlyUnread?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetNotificationsResponse = {
  __typename?: 'GetNotificationsResponse';
  notifications?: Maybe<Array<Notification>>;
  user?: Maybe<User>;
};

export type GetNumberOfUsersInCompanyResponse = {
  __typename?: 'GetNumberOfUsersInCompanyResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetOfficeAttendanceResponse = {
  __typename?: 'GetOfficeAttendanceResponse';
  attendeeUserIds: Array<Scalars['String']['output']>;
};

export type GetOfficeInsightsResponse = {
  __typename?: 'GetOfficeInsightsResponse';
  alignmentRates?: Maybe<PolicySuccessRates>;
  capacityInsights?: Maybe<CapacityInsights>;
  mandatoryWeekdaysSatisfiedRates?: Maybe<PolicySuccessRates>;
  meanDaysInPerWeekInsights?: Maybe<MeanDaysInPerWeekInsights>;
  rawInsights?: Maybe<RawInsights>;
  requiredDaysInTimeframeSatisfiedRates?: Maybe<PolicySuccessRates>;
  weekdayInsights?: Maybe<WeekdayInsights>;
};

export type GetOfficeValuesRequest = {
  __typename?: 'GetOfficeValuesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetOfficeValuesResponse = {
  __typename?: 'GetOfficeValuesResponse';
  officeValues?: Maybe<Array<OfficeValue>>;
  user?: Maybe<User>;
};

export type GetOrderCategoriesResponse = {
  __typename?: 'GetOrderCategoriesResponse';
  categories?: Maybe<Array<OrderCategory>>;
};

export type GetOrderedPrioritiesResponse = {
  __typename?: 'GetOrderedPrioritiesResponse';
  priorities?: Maybe<Array<Priority>>;
  user?: Maybe<User>;
};

export type GetOrderedUsersResponse = {
  __typename?: 'GetOrderedUsersResponse';
  user?: Maybe<User>;
  users?: Maybe<Array<User>>;
};

export type GetPermissionKeysResponse = {
  __typename?: 'GetPermissionKeysResponse';
  permissions: Array<Scalars['String']['output']>;
};

export type GetPermissionsResponse = {
  __typename?: 'GetPermissionsResponse';
  permission?: Maybe<Array<Permission>>;
};

export type GetPhoneNumbersRequest = {
  __typename?: 'GetPhoneNumbersRequest';
  accessIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetPhoneNumbersResponse = {
  __typename?: 'GetPhoneNumbersResponse';
  phoneNumbers?: Maybe<Array<PhoneNumber>>;
  user?: Maybe<User>;
};

export type GetPhotoRequest = {
  __typename?: 'GetPhotoRequest';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetPhotoResponse = {
  __typename?: 'GetPhotoResponse';
  photo: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetPipelineStagesBatchResponse = {
  __typename?: 'GetPipelineStagesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetPlaceResponse = {
  __typename?: 'GetPlaceResponse';
  place?: Maybe<Place>;
};

export type GetPlacesResponse = {
  __typename?: 'GetPlacesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type GetPoliciesResponse = {
  __typename?: 'GetPoliciesResponse';
  casbinPolicyLineFormat: Array<Scalars['String']['output']>;
};

export type GetPreviewRequest = {
  __typename?: 'GetPreviewRequest';
  attachmentId: Scalars['String']['output'];
  color: Scalars['Boolean']['output'];
  landscape: Scalars['Boolean']['output'];
  size: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetPreviewResponse = {
  __typename?: 'GetPreviewResponse';
  attachmentId: Scalars['String']['output'];
  message: Scalars['String']['output'];
  status: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type GetPricingRequest = {
  __typename?: 'GetPricingRequest';
  overrideMinTermMonths?: Maybe<Scalars['Int']['output']>;
  tierInputs?: Maybe<TierInputs>;
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetPricingResponse = {
  __typename?: 'GetPricingResponse';
  allPermutations?: Maybe<Array<Pricing>>;
  fixedPricing?: Maybe<Pricing>;
  maxPricing?: Maybe<Pricing>;
  minPricing?: Maybe<Pricing>;
  specifiedPricing?: Maybe<Pricing>;
  user?: Maybe<User>;
};

export type GetPricingsBatchRequest = {
  __typename?: 'GetPricingsBatchRequest';
  getPricingRequests?: Maybe<Array<GetPricingRequest>>;
  user?: Maybe<User>;
};

export type GetPricingsBatchResponse = {
  __typename?: 'GetPricingsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetPrintersRequest = {
  __typename?: 'GetPrintersRequest';
  printerIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetPrintersResponse = {
  __typename?: 'GetPrintersResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetPrioritiesRequest = {
  __typename?: 'GetPrioritiesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetPrioritiesResponse = {
  __typename?: 'GetPrioritiesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetProductResponse = {
  __typename?: 'GetProductResponse';
  product?: Maybe<Product>;
};

export type GetProductsResponse = {
  __typename?: 'GetProductsResponse';
  filterOptions?: Maybe<ProductFilterOptions>;
  products?: Maybe<ProductsConnection>;
  viewport?: Maybe<ProductViewport>;
};

export type GetProfileForEmailRequest = {
  __typename?: 'GetProfileForEmailRequest';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetProfileRequest = {
  __typename?: 'GetProfileRequest';
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type GetProfileResponse = {
  __typename?: 'GetProfileResponse';
  profile?: Maybe<Profile>;
  user?: Maybe<User>;
};

export type GetProfilesBatchResponse = {
  __typename?: 'GetProfilesBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetProfilesListRequest = {
  __typename?: 'GetProfilesListRequest';
  after?: Maybe<Scalars['String']['output']>;
  companyId?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  query?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  userIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type GetProfilesRequest = {
  __typename?: 'GetProfilesRequest';
  companyId?: Maybe<Scalars['String']['output']>;
  companyIds?: Maybe<Array<Scalars['String']['output']>>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  limit?: Maybe<Scalars['Int']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  userIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type GetProfilesResponse = {
  __typename?: 'GetProfilesResponse';
  allProfiles?: Maybe<Array<Profile>>;
  user?: Maybe<User>;
};

export type GetPurchaseResponse = {
  __typename?: 'GetPurchaseResponse';
  purchase?: Maybe<Purchase>;
};

export type GetQueueRequest = {
  __typename?: 'GetQueueRequest';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetQueueResponse = {
  __typename?: 'GetQueueResponse';
  queue: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetQuietestDayOfTheWeekResponse = {
  __typename?: 'GetQuietestDayOfTheWeekResponse';
  day: Scalars['String']['output'];
};

export type GetReadMessageUsersResponse = {
  __typename?: 'GetReadMessageUsersResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetReadinessStateRequest = {
  __typename?: 'GetReadinessStateRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetReadinessStateResponse = {
  __typename?: 'GetReadinessStateResponse';
  state?: Maybe<ReadyStatus>;
  user?: Maybe<User>;
};

export type GetRequestRequest = {
  __typename?: 'GetRequestRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetRequestResponse = {
  __typename?: 'GetRequestResponse';
  request?: Maybe<Request>;
  user?: Maybe<User>;
};

export type GetRequestsRequest = {
  __typename?: 'GetRequestsRequest';
  assigneeIds?: Maybe<Array<Scalars['String']['output']>>;
  categories?: Maybe<Array<Scalars['String']['output']>>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
  ignoreStatuses?: Maybe<Array<Scalars['String']['output']>>;
  includeArchived?: Maybe<Scalars['Boolean']['output']>;
  locationIds?: Maybe<Array<Scalars['String']['output']>>;
  onlyArchived?: Maybe<Scalars['Boolean']['output']>;
  page?: Maybe<Scalars['Int']['output']>;
  priorities?: Maybe<Array<Scalars['String']['output']>>;
  query?: Maybe<Scalars['String']['output']>;
  reporters?: Maybe<Array<Scalars['String']['output']>>;
  scheduledForDay?: Maybe<Scalars['String']['output']>;
  sortBy?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  statuses?: Maybe<Array<Scalars['String']['output']>>;
  techRequest?: Maybe<Scalars['Boolean']['output']>;
  unassigned?: Maybe<Scalars['Boolean']['output']>;
  unitIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type GetRequestsResponse = {
  __typename?: 'GetRequestsResponse';
  pages: Scalars['Int']['output'];
  requests?: Maybe<Array<Request>>;
  total: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetRoomAvailabilityRequest = {
  __typename?: 'GetRoomAvailabilityRequest';
  date?: Maybe<Timestamp>;
  duration: Scalars['Int']['output'];
  roomId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetRoomAvailabilityResponse = {
  __typename?: 'GetRoomAvailabilityResponse';
  slots?: Maybe<Array<Interval>>;
  user?: Maybe<User>;
};

export type GetRoomBookingsRequest = {
  __typename?: 'GetRoomBookingsRequest';
  after?: Maybe<Scalars['String']['output']>;
  end?: Maybe<DateTime>;
  filterToMyCompany?: Maybe<Scalars['Boolean']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  roomIds?: Maybe<Array<Scalars['String']['output']>>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type GetRoomByIdRequest = {
  __typename?: 'GetRoomByIdRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetRoomRequest = {
  __typename?: 'GetRoomRequest';
  roomId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetRoomsPaginatedRequest = {
  __typename?: 'GetRoomsPaginatedRequest';
  after?: Maybe<Scalars['String']['output']>;
  first?: Maybe<Scalars['Int']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetRoomsRequest = {
  __typename?: 'GetRoomsRequest';
  companyId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetRoomsResponse = {
  __typename?: 'GetRoomsResponse';
  myRooms?: Maybe<Array<Room>>;
  user?: Maybe<User>;
};

export type GetSalesTeamRequest = {
  __typename?: 'GetSalesTeamRequest';
  brokerCompanyId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetSalesTeamResponse = {
  __typename?: 'GetSalesTeamResponse';
  salesTeam?: Maybe<SalesTeam>;
  user?: Maybe<User>;
};

export type GetSalesTeamsBatchResponse = {
  __typename?: 'GetSalesTeamsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetSchedulesResponse = {
  __typename?: 'GetSchedulesResponse';
  scheduleList?: Maybe<Array<Schedule>>;
};

export type GetSearchRequirementsRequest = {
  __typename?: 'GetSearchRequirementsRequest';
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetSearchRequirementsResponse = {
  __typename?: 'GetSearchRequirementsResponse';
  searchRequirements?: Maybe<SearchRequirements>;
  user?: Maybe<User>;
};

export type GetSelectionFromUnitGroupIdRequest = {
  __typename?: 'GetSelectionFromUnitGroupIdRequest';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  unitGroupId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetSelectionsBatchResponse = {
  __typename?: 'GetSelectionsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetSelectionsFromUnitGroupIdsBatchResponse = {
  __typename?: 'GetSelectionsFromUnitGroupIdsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetServiceActivitiesResponse = {
  __typename?: 'GetServiceActivitiesResponse';
  edges?: Maybe<Array<ServiceActivityEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type GetSessionRequest = {
  __typename?: 'GetSessionRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetSessionResponse = {
  __typename?: 'GetSessionResponse';
  session?: Maybe<Session>;
  user?: Maybe<User>;
};

export type GetSessionsRequest = {
  __typename?: 'GetSessionsRequest';
  accessId: Scalars['String']['output'];
  answeredOnly: Scalars['Boolean']['output'];
  excludeAnswered: Scalars['Boolean']['output'];
  inLastMinutes: Scalars['Int']['output'];
  includeEnded: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type GetSessionsResponse = {
  __typename?: 'GetSessionsResponse';
  hasNextPage: Scalars['Boolean']['output'];
  numOfPages: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  sessions?: Maybe<Array<Session>>;
  user?: Maybe<User>;
};

export type GetSettingsRequest = {
  __typename?: 'GetSettingsRequest';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetSettingsResponse = {
  __typename?: 'GetSettingsResponse';
  color: Scalars['String']['output'];
  printer?: Maybe<Printer>;
  user?: Maybe<User>;
};

export type GetSharedInboxesRequest = {
  __typename?: 'GetSharedInboxesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetSharedInboxesResponse = {
  __typename?: 'GetSharedInboxesResponse';
  emailAddress: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetShortlistRequest = {
  __typename?: 'GetShortlistRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetShortlistResponse = {
  __typename?: 'GetShortlistResponse';
  shortlist?: Maybe<Shortlist>;
  user?: Maybe<User>;
};

export type GetShortlistSummaryRequest = {
  __typename?: 'GetShortlistSummaryRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetShortlistSummaryResponse = {
  __typename?: 'GetShortlistSummaryResponse';
  summary?: Maybe<ShortlistSummary>;
  user?: Maybe<User>;
};

export type GetSpaceMatchLocationsResponse = {
  __typename?: 'GetSpaceMatchLocationsResponse';
  edges?: Maybe<Array<LocationSpaceMatchEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type GetStagesRequest = {
  __typename?: 'GetStagesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetStagesResponse = {
  __typename?: 'GetStagesResponse';
  stages?: Maybe<Array<PipelineStage>>;
  user?: Maybe<User>;
};

export type GetStatusRequest = {
  __typename?: 'GetStatusRequest';
  alarmId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetStatusResponse = {
  __typename?: 'GetStatusResponse';
  armed: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type GetStatusesRequest = {
  __typename?: 'GetStatusesRequest';
  alarmIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetStatusesResponse = {
  __typename?: 'GetStatusesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetSubscribedCategoryGroupsForTenancyResponse = {
  __typename?: 'GetSubscribedCategoryGroupsForTenancyResponse';
  categoryGroups?: Maybe<Array<CategoryGroup>>;
};

export type GetTemplateBrochureBatchResponse = {
  __typename?: 'GetTemplateBrochureBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetTemplateRequest = {
  __typename?: 'GetTemplateRequest';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetTemplateResponse = {
  __typename?: 'GetTemplateResponse';
  template?: Maybe<Template>;
  user?: Maybe<User>;
};

export type GetTemplatesRequest = {
  __typename?: 'GetTemplatesRequest';
  createdBy: Array<Scalars['String']['output']>;
  ids: Array<Scalars['String']['output']>;
  query: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  types?: Maybe<Array<TemplateType>>;
  user?: Maybe<User>;
};

export type GetTemplatesResponse = {
  __typename?: 'GetTemplatesResponse';
  templates?: Maybe<Array<Template>>;
  user?: Maybe<User>;
};

export type GetTenanciesList = {
  __typename?: 'GetTenanciesList';
  tenancies?: Maybe<Array<Tenancy>>;
};

export type GetTenanciesResponse = {
  __typename?: 'GetTenanciesResponse';
  tenancies?: Maybe<Array<Tenancy>>;
};

export type GetTenancyFinancialModelResponse = {
  __typename?: 'GetTenancyFinancialModelResponse';
  financialModel?: Maybe<TenancyFinancialModel>;
};

export type GetTenancyResponse = {
  __typename?: 'GetTenancyResponse';
  tenancy?: Maybe<Tenancy>;
};

export type GetTenantPrioritiesRequest = {
  __typename?: 'GetTenantPrioritiesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetTenantPrioritiesResponse = {
  __typename?: 'GetTenantPrioritiesResponse';
  priorities?: Maybe<Array<TenantPriority>>;
  user?: Maybe<User>;
};

export type GetThreadDealsRequest = {
  __typename?: 'GetThreadDealsRequest';
  threadIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetThreadDealsResponse = {
  __typename?: 'GetThreadDealsResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetThreadResponse = {
  __typename?: 'GetThreadResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetThreadsResponse = {
  __typename?: 'GetThreadsResponse';
  threadList?: Maybe<Array<Thread>>;
};

export type GetTimelineStageCountsResponse = {
  __typename?: 'GetTimelineStageCountsResponse';
  counts?: Maybe<Array<TimelineStageCount>>;
};

export type GetTotalDesksForTeamBatchRequest = {
  __typename?: 'GetTotalDesksForTeamBatchRequest';
  requests?: Maybe<Array<GetTotalDesksForTeamRequest>>;
  user?: Maybe<User>;
};

export type GetTotalDesksForTeamRequest = {
  __typename?: 'GetTotalDesksForTeamRequest';
  floorplanId: Scalars['String']['output'];
  teamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetTrainStationsForLocationRequest = {
  __typename?: 'GetTrainStationsForLocationRequest';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetTrainStationsForLocationResponse = {
  __typename?: 'GetTrainStationsForLocationResponse';
  stations?: Maybe<Array<LocationStation>>;
  user?: Maybe<User>;
};

export type GetUnitFinancialModelResponse = {
  __typename?: 'GetUnitFinancialModelResponse';
  financialModel?: Maybe<UnitFinancialModel>;
};

export type GetUnitResponse = {
  __typename?: 'GetUnitResponse';
  unit?: Maybe<Unit>;
};

export type GetUnitTenanciesResponse = {
  __typename?: 'GetUnitTenanciesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type GetUnitsForBuildingsBatchResponse = {
  __typename?: 'GetUnitsForBuildingsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUnitsResponse = {
  __typename?: 'GetUnitsResponse';
  combinationDetails?: Maybe<CombinationDetails>;
  location?: Maybe<Location>;
  metaData?: Maybe<FilterOptions>;
  paginationData?: Maybe<PaginationData>;
  pricing?: Maybe<GetPricingResponse>;
  unitGroupDetails?: Maybe<GetDetailsForUnitsResponse>;
  units?: Maybe<Array<Unit>>;
};


export type GetUnitsResponsePricingArgs = {
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};


export type GetUnitsResponseUnitGroupDetailsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type GetUnreadMessageCountResponse = {
  __typename?: 'GetUnreadMessageCountResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUnreadMessagesRequest = {
  __typename?: 'GetUnreadMessagesRequest';
  chatIds: Array<Scalars['String']['output']>;
  limit?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type GetUploadRequest = {
  __typename?: 'GetUploadRequest';
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['String']['output'];
  quality?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type GetUploadResponse = {
  __typename?: 'GetUploadResponse';
  upload?: Maybe<UploadMessage>;
  user?: Maybe<User>;
};

export type GetUploadsBatchRequest = {
  __typename?: 'GetUploadsBatchRequest';
  reqs?: Maybe<Array<GetUploadRequest>>;
  user?: Maybe<User>;
};

export type GetUploadsBatchResponse = {
  __typename?: 'GetUploadsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUploadsRequest = {
  __typename?: 'GetUploadsRequest';
  ids: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetUploadsResponse = {
  __typename?: 'GetUploadsResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUserBrokerSearchesRequest = {
  __typename?: 'GetUserBrokerSearchesRequest';
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type GetUserBrokerSearchesResponse = {
  __typename?: 'GetUserBrokerSearchesResponse';
  searches?: Maybe<Array<BrokerSearch>>;
  user?: Maybe<User>;
};

export type GetUserIdRequest = {
  __typename?: 'GetUserIdRequest';
  queue: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetUserIdResponse = {
  __typename?: 'GetUserIdResponse';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GetUserIdsWithNoTeamRequest = {
  __typename?: 'GetUserIdsWithNoTeamRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUserIdsWithNoTeamResponse = {
  __typename?: 'GetUserIdsWithNoTeamResponse';
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type GetUserRequest = {
  __typename?: 'GetUserRequest';
  cookie: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
  verificationToken: Scalars['String']['output'];
};

export type GetUserShortlistsRequest = {
  __typename?: 'GetUserShortlistsRequest';
  containingUnitGroupIds?: Maybe<Array<Scalars['String']['output']>>;
  descending?: Maybe<Scalars['Boolean']['output']>;
  excludeUnitGroupIds?: Maybe<Array<Scalars['String']['output']>>;
  first?: Maybe<Scalars['Int']['output']>;
  includeShortlistsByProfileId?: Maybe<Scalars['String']['output']>;
  onlyArchived?: Maybe<Scalars['Boolean']['output']>;
  onlyShared?: Maybe<Scalars['Boolean']['output']>;
  onlyUserMade?: Maybe<Scalars['Boolean']['output']>;
  page?: Maybe<Scalars['Int']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  sortBy?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetUserShortlistsResponse = {
  __typename?: 'GetUserShortlistsResponse';
  shortlists?: Maybe<ShortlistConnection>;
  user?: Maybe<User>;
};

export type GetUserViewingRequestsRequest = {
  __typename?: 'GetUserViewingRequestsRequest';
  onlyUpcoming?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUserViewingRequestsResponse = {
  __typename?: 'GetUserViewingRequestsResponse';
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ShortlistViewingRequest>>;
};

export type GetUserViewingsRequest = {
  __typename?: 'GetUserViewingsRequest';
  includeViewingsByProfileId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type GetUserViewingsResponse = {
  __typename?: 'GetUserViewingsResponse';
  user?: Maybe<User>;
  viewings?: Maybe<Array<Activity>>;
};

export type GetUsersByCompanyIdResponse = {
  __typename?: 'GetUsersByCompanyIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUsersByIdResponse = {
  __typename?: 'GetUsersByIdResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUsersRequest = {
  __typename?: 'GetUsersRequest';
  companyIds: Array<Scalars['String']['output']>;
  cookie: Scalars['String']['output'];
  emails: Array<Scalars['String']['output']>;
  ids: Array<Scalars['String']['output']>;
  query: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetUsersResponse = {
  __typename?: 'GetUsersResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUsersUnreadChatMessagesRequest = {
  __typename?: 'GetUsersUnreadChatMessagesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetUsersUnreadChatMessagesResponse = {
  __typename?: 'GetUsersUnreadChatMessagesResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetVersionedDocumentsResponse = {
  __typename?: 'GetVersionedDocumentsResponse';
  versionedDocuments?: Maybe<Array<VersionedDocument>>;
};

export type GetVideoTokenRequest = {
  __typename?: 'GetVideoTokenRequest';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetVideoTokenResponse = {
  __typename?: 'GetVideoTokenResponse';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetViewingRequestsForShortlistRequest = {
  __typename?: 'GetViewingRequestsForShortlistRequest';
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetViewingRequestsForShortlistResponse = {
  __typename?: 'GetViewingRequestsForShortlistResponse';
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ViewingRequest>>;
};

export type GetViewingsForShortlistBatchResponse = {
  __typename?: 'GetViewingsForShortlistBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetWebhookRequest = {
  __typename?: 'GetWebhookRequest';
  from: Scalars['String']['output'];
  path: Scalars['String']['output'];
  recordingUrl: Scalars['String']['output'];
  to: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetWebhookResponse = {
  __typename?: 'GetWebhookResponse';
  response: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetWhitelistedCompanyForEmailRequest = {
  __typename?: 'GetWhitelistedCompanyForEmailRequest';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GetWhitelistedCompanyForEmailResponse = {
  __typename?: 'GetWhitelistedCompanyForEmailResponse';
  company?: Maybe<Company>;
  user?: Maybe<User>;
};

export type GetWorkplaceGoalsRequest = {
  __typename?: 'GetWorkplaceGoalsRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetWorkplaceGoalsResponse = {
  __typename?: 'GetWorkplaceGoalsResponse';
  user?: Maybe<User>;
  workplaceGoals?: Maybe<Array<WorkplaceGoal>>;
};

export type GetWorkspaceStatusesRequest = {
  __typename?: 'GetWorkspaceStatusesRequest';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type GetWorkspaceStatusesResponse = {
  __typename?: 'GetWorkspaceStatusesResponse';
  user?: Maybe<User>;
  workspaceStatuses?: Maybe<Array<WorkspaceStatus>>;
};

export type GoogleLoginRequest = {
  __typename?: 'GoogleLoginRequest';
  code: Scalars['String']['output'];
  redirectUrl: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GoogleLoginResponse = {
  __typename?: 'GoogleLoginResponse';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum GreySpace {
  CatA = 'CAT_A',
  CatBGrey = 'CAT_B_GREY',
  CatBNew = 'CAT_B_NEW'
}

export type GreySpaceOptionalInput = {
  greySpace?: InputMaybe<GreySpace>;
};

export type Guest = {
  __typename?: 'Guest';
  accessIds: Array<Scalars['String']['output']>;
  accesses?: Maybe<Array<Maybe<Access>>>;
  checkedInAt?: Maybe<Timestamp>;
  date?: Maybe<Timestamp>;
  dateUtc?: Maybe<DateTime>;
  email: Scalars['String']['output'];
  expiryDateUtc?: Maybe<DateTime>;
  id: Scalars['String']['output'];
  location?: Maybe<Location>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  note: Scalars['String']['output'];
  permissionExpiry?: Maybe<Timestamp>;
  permissionExpiryActual?: Maybe<Timestamp>;
  requester?: Maybe<User>;
  requesterCompanyId: Scalars['String']['output'];
  requesterId: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GuestArrived = {
  __typename?: 'GuestArrived';
  accessId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  requesterId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GuestArrivedCommand = {
  __typename?: 'GuestArrivedCommand';
  accessId?: Maybe<Scalars['String']['output']>;
  guestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GuestConnection = {
  __typename?: 'GuestConnection';
  edges?: Maybe<Array<GuestEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type GuestDateRange = {
  __typename?: 'GuestDateRange';
  end?: Maybe<Timestamp>;
  start?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type GuestDateRangeInput = {
  end?: InputMaybe<TimestampInput>;
  start?: InputMaybe<TimestampInput>;
};

export type GuestDayPassResent = {
  __typename?: 'GuestDayPassResent';
  guestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GuestDeleted = {
  __typename?: 'GuestDeleted';
  guestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type GuestEdge = {
  __typename?: 'GuestEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Guest>;
  user?: Maybe<User>;
};

export type GuestRegistered = {
  __typename?: 'GuestRegistered';
  accessIds: Array<Scalars['String']['output']>;
  accesses?: Maybe<Array<Maybe<Access>>>;
  date?: Maybe<Timestamp>;
  dateUtc?: Maybe<DateTime>;
  email: Scalars['String']['output'];
  expiryDate?: Maybe<Timestamp>;
  expiryDateUtc?: Maybe<DateTime>;
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  note: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Holiday = {
  __typename?: 'Holiday';
  bunting?: Maybe<Scalars['Boolean']['output']>;
  date?: Maybe<Date>;
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
};

export type HuddleUsersChased = {
  __typename?: 'HuddleUsersChased';
  oneWeekOldUsers?: Maybe<Array<User>>;
  twoWeeksOldUsers?: Maybe<Array<User>>;
  user?: Maybe<User>;
};

export type HybridWorkInformationSaved = {
  __typename?: 'HybridWorkInformationSaved';
  inputs?: Maybe<Array<PolicyInput>>;
  user?: Maybe<User>;
};

export type IsoString = {
  __typename?: 'ISOString';
  ISOString: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type IndexRebuilt = {
  __typename?: 'IndexRebuilt';
  index: Scalars['String']['output'];
};

export type Industry = {
  __typename?: 'Industry';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type IndustryCreated = {
  __typename?: 'IndustryCreated';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type IndustryDeleted = {
  __typename?: 'IndustryDeleted';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type IndustryInput = {
  id: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

export type IngestFloorplan = {
  __typename?: 'IngestFloorplan';
  json: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Int32OptionalRange = {
  __typename?: 'Int32OptionalRange';
  max?: Maybe<Scalars['Int']['output']>;
  min?: Maybe<Scalars['Int']['output']>;
};

export type Int32OptionalRangeInput = {
  max?: InputMaybe<Scalars['Int']['input']>;
  min?: InputMaybe<Scalars['Int']['input']>;
};

export type IntercomPressed = {
  __typename?: 'IntercomPressed';
  AccessId: Scalars['String']['output'];
  SessionId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Interval = {
  __typename?: 'Interval';
  end?: Maybe<IsoString>;
  start?: Maybe<IsoString>;
  user?: Maybe<User>;
};

export type Issue = {
  __typename?: 'Issue';
  addon?: Maybe<Addon>;
  archivedAt?: Maybe<Timestamp>;
  assigneeUser?: Maybe<User>;
  category?: Maybe<IssueCategory>;
  chat?: Maybe<Chat>;
  chatId: Scalars['String']['output'];
  closureSlaUtc?: Maybe<DateTime>;
  contractorAssigneeUser?: Maybe<User>;
  /** @deprecated Use contractorAssigneeUser */
  contractorCompanies?: Maybe<Array<Maybe<Company>>>;
  coordinator?: Maybe<User>;
  createdAt?: Maybe<Timestamp>;
  createdByUser?: Maybe<User>;
  createdByUserId: Scalars['String']['output'];
  data?: Maybe<IssueMutableData>;
  deletedAt?: Maybe<Timestamp>;
  displayId: Scalars['String']['output'];
  externalChat?: Maybe<Chat>;
  externalChatId: Scalars['String']['output'];
  feedback?: Maybe<Feedback>;
  firstNextStepSlaUtc?: Maybe<DateTime>;
  id: Scalars['String']['output'];
  location?: Maybe<Location>;
  nextStep?: Maybe<IssueUpdate>;
  order?: Maybe<Order>;
  orderCategory?: Maybe<OrderCategory>;
  previousStatus?: Maybe<IssueStatus>;
  priority?: Maybe<IssuePriority>;
  priorityStatus: Scalars['String']['output'];
  purchaseOrderNumber: Scalars['String']['output'];
  raisedByChat?: Maybe<Chat>;
  raisedByUser?: Maybe<User>;
  relevantSla?: Maybe<RelevantSla>;
  status?: Maybe<IssueStatus>;
  statusUpdates?: Maybe<Array<Maybe<IssueStatusUpdate>>>;
  subjectCompany?: Maybe<Company>;
  tenancyFloorplanZone?: Maybe<TenancyFloorplanZone>;
  units?: Maybe<Array<Maybe<Unit>>>;
  updatedAt?: Maybe<Timestamp>;
  uploadIds: Array<Scalars['String']['output']>;
  uploads?: Maybe<Array<Maybe<UploadMessage>>>;
  url: Scalars['String']['output'];
  visits?: Maybe<Array<Maybe<Visit>>>;
  /** Get all the users that are watching this issue */
  watchers?: Maybe<Array<Maybe<User>>>;
};

export type IssueArchived = {
  __typename?: 'IssueArchived';
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
};

export type IssueCategory = {
  __typename?: 'IssueCategory';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  priorityId: Scalars['String']['output'];
};

export type IssueClosed = {
  __typename?: 'IssueClosed';
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
};

export type IssueCreated = {
  __typename?: 'IssueCreated';
  issue?: Maybe<Issue>;
};

export type IssueDeleted = {
  __typename?: 'IssueDeleted';
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
};

export type IssueEdge = {
  __typename?: 'IssueEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Issue>;
};

export type IssueFiltersInput = {
  assigneeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  categoryIds?: InputMaybe<Array<Scalars['String']['input']>>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  contractorAssigneeUserId?: InputMaybe<Scalars['String']['input']>;
  coordinatorUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  createdAfter?: InputMaybe<TimestampInput>;
  createdBefore?: InputMaybe<TimestampInput>;
  cssOwnerIds?: InputMaybe<Array<Scalars['String']['input']>>;
  detailIncludes?: InputMaybe<Scalars['String']['input']>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  onlyTenantVisible?: InputMaybe<Scalars['Boolean']['input']>;
  priorities?: InputMaybe<Array<Scalars['String']['input']>>;
  purchaseOrderNumbers?: InputMaybe<Array<Scalars['String']['input']>>;
  statuses?: InputMaybe<Array<Scalars['String']['input']>>;
  summaryIncludes?: InputMaybe<Scalars['String']['input']>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
  watcherIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type IssueMutableData = {
  __typename?: 'IssueMutableData';
  addonId?: Maybe<Scalars['String']['output']>;
  assigneeUserId?: Maybe<Scalars['String']['output']>;
  categoryId?: Maybe<Scalars['String']['output']>;
  contractorAssigneeUserId?: Maybe<Scalars['String']['output']>;
  contractorCompanyId?: Maybe<Scalars['String']['output']>;
  contractorCompanyIds?: Maybe<Array<Scalars['String']['output']>>;
  coordinatorUserId?: Maybe<Scalars['String']['output']>;
  cost?: Maybe<Scalars['String']['output']>;
  costOwner?: Maybe<CostOwner>;
  daysUntilSla?: Maybe<Scalars['Int']['output']>;
  detail?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Timestamp>;
  hideFromTenant?: Maybe<Scalars['Boolean']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  orderCategoryId?: Maybe<Scalars['String']['output']>;
  orderId?: Maybe<Scalars['String']['output']>;
  priorityId?: Maybe<Scalars['String']['output']>;
  proactive?: Maybe<Scalars['Boolean']['output']>;
  purchaseOrderNumber?: Maybe<Scalars['String']['output']>;
  raisedByChatId?: Maybe<Scalars['String']['output']>;
  raisedByUserId?: Maybe<Scalars['String']['output']>;
  snagging?: Maybe<Scalars['Boolean']['output']>;
  statusId?: Maybe<Scalars['String']['output']>;
  subjectCompanyId?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  tenancyFloorplanZoneId?: Maybe<Scalars['String']['output']>;
  unitIds?: Maybe<Array<Scalars['String']['output']>>;
  updates?: Maybe<Array<IssueUpdate>>;
  uploadIds?: Maybe<Array<Scalars['String']['output']>>;
  watcherUserIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type IssueMutableDataInput = {
  addonId?: InputMaybe<Scalars['String']['input']>;
  assigneeUserId?: InputMaybe<Scalars['String']['input']>;
  categoryId?: InputMaybe<Scalars['String']['input']>;
  contractorAssigneeUserId?: InputMaybe<Scalars['String']['input']>;
  contractorCompanyId?: InputMaybe<Scalars['String']['input']>;
  contractorCompanyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  coordinatorUserId?: InputMaybe<Scalars['String']['input']>;
  cost?: InputMaybe<Scalars['String']['input']>;
  costOwner?: InputMaybe<CostOwner>;
  daysUntilSla?: InputMaybe<Scalars['Int']['input']>;
  detail?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<TimestampInput>;
  hideFromTenant?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  orderCategoryId?: InputMaybe<Scalars['String']['input']>;
  orderId?: InputMaybe<Scalars['String']['input']>;
  priorityId?: InputMaybe<Scalars['String']['input']>;
  proactive?: InputMaybe<Scalars['Boolean']['input']>;
  purchaseOrderNumber?: InputMaybe<Scalars['String']['input']>;
  raisedByChatId?: InputMaybe<Scalars['String']['input']>;
  raisedByUserId?: InputMaybe<Scalars['String']['input']>;
  snagging?: InputMaybe<Scalars['Boolean']['input']>;
  statusId?: InputMaybe<Scalars['String']['input']>;
  subjectCompanyId?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  tenancyFloorplanZoneId?: InputMaybe<Scalars['String']['input']>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
  updates?: InputMaybe<Array<IssueUpdateInput>>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  watcherUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type IssuePriority = {
  __typename?: 'IssuePriority';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  sla: Scalars['Int']['output'];
};

export type IssueReOpened = {
  __typename?: 'IssueReOpened';
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
};

export type IssueStatus = {
  __typename?: 'IssueStatus';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type IssueStatusUpdate = {
  __typename?: 'IssueStatusUpdate';
  createdAt?: Maybe<Timestamp>;
  deletedAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  issueId: Scalars['String']['output'];
  statusId: Scalars['String']['output'];
};

export type IssueUpdate = {
  __typename?: 'IssueUpdate';
  completedAt?: Maybe<Date>;
  createdAt?: Maybe<Timestamp>;
  dueDate?: Maybe<Timestamp>;
  hideFromTenant: Scalars['Boolean']['output'];
  id?: Maybe<Scalars['String']['output']>;
  isComplete?: Maybe<Scalars['Boolean']['output']>;
  owner?: Maybe<User>;
  ownerUserId?: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type?: Maybe<IssueUpdateType>;
};

export type IssueUpdateCreated = {
  __typename?: 'IssueUpdateCreated';
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  issueId: Scalars['String']['output'];
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type IssueUpdateDeleted = {
  __typename?: 'IssueUpdateDeleted';
  id: Scalars['String']['output'];
};

export type IssueUpdateInput = {
  completedAt?: InputMaybe<DateInput>;
  createdAt?: InputMaybe<TimestampInput>;
  dueDate?: InputMaybe<TimestampInput>;
  hideFromTenant: Scalars['Boolean']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  isComplete?: InputMaybe<Scalars['Boolean']['input']>;
  ownerUserId?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
  title: Scalars['String']['input'];
  type?: InputMaybe<IssueUpdateType>;
};

export enum IssueUpdateOwnerFetchKey {
  FromCssAssignee = 'FromCSSAssignee'
}

export enum IssueUpdateType {
  Default = 'Default',
  SubmitForReview = 'SubmitForReview'
}

export type IssueUpdateUpdated = {
  __typename?: 'IssueUpdateUpdated';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
  update?: Maybe<IssueUpdate>;
};

export type IssueUpdateWorkflow = {
  __typename?: 'IssueUpdateWorkflow';
  templateName: Scalars['String']['output'];
  updateDueSecondsFromNow?: Maybe<Scalars['Int']['output']>;
  updateHideFromTenant: Scalars['Boolean']['output'];
  updateOwnerFetchKey?: Maybe<IssueUpdateOwnerFetchKey>;
  updateText: Scalars['String']['output'];
  updateTitle: Scalars['String']['output'];
  updateType?: Maybe<IssueUpdateType>;
};

export type IssueUpdated = {
  __typename?: 'IssueUpdated';
  changelogJson: Scalars['String']['output'];
  changes?: Maybe<Array<KeyValuePair>>;
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
  newContractorAssigneeUserId: Scalars['String']['output'];
  newNextStepOwners: Array<Scalars['String']['output']>;
  watcherIds: Array<Scalars['String']['output']>;
};

export type IssueUploadDeleted = {
  __typename?: 'IssueUploadDeleted';
  issue?: Maybe<Issue>;
  issueId: Scalars['String']['output'];
  uploadId: Scalars['String']['output'];
};

export type IssueUploadsCleared = {
  __typename?: 'IssueUploadsCleared';
  issue?: Maybe<Issue>;
  issueId: Scalars['String']['output'];
};

export type IssuesConnection = {
  __typename?: 'IssuesConnection';
  edges?: Maybe<Array<IssueEdge>>;
  newIssues: Scalars['Int']['output'];
  openIssues: Scalars['Int']['output'];
  pageInfo?: Maybe<PageInfo>;
};

export enum IssuesSortBy {
  RelevantSlaAsc = 'RelevantSlaAsc',
  RelevantSlaDesc = 'RelevantSlaDesc'
}

export type KeyValuePair = {
  __typename?: 'KeyValuePair';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type KitchenSinkSent = {
  __typename?: 'KitchenSinkSent';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type LandlordFinancials = {
  __typename?: 'LandlordFinancials';
  definedServicesRollback: Scalars['Boolean']['output'];
  legalEntity: Scalars['String']['output'];
  user?: Maybe<User>;
  whoCollectsRent?: Maybe<CompanyType>;
  whoProcuresFitout?: Maybe<CompanyType>;
};

export type LandlordFinancialsInput = {
  definedServicesRollback: Scalars['Boolean']['input'];
  legalEntity: Scalars['String']['input'];
  whoCollectsRent?: InputMaybe<CompanyType>;
  whoProcuresFitout?: InputMaybe<CompanyType>;
};

export type LeadSource = {
  __typename?: 'LeadSource';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LeadTenantsRemindedAboutIssue = {
  __typename?: 'LeadTenantsRemindedAboutIssue';
  issueId: Scalars['String']['output'];
};

export enum LeadType {
  BrokerLeadType = 'BROKER_LEAD_TYPE',
  DirectLeadType = 'DIRECT_LEAD_TYPE',
  RenewalLeadType = 'RENEWAL_LEAD_TYPE',
  UnknownLeadType = 'UNKNOWN_LEAD_TYPE'
}

export type LineItem = {
  __typename?: 'LineItem';
  id: Scalars['String']['output'];
  orderId: Scalars['String']['output'];
  pause?: Maybe<LineItemPause>;
  product?: Maybe<OrderProduct>;
  productId: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
};

export type LineItemInputInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type LineItemPause = {
  __typename?: 'LineItemPause';
  dateRange?: Maybe<DateRange>;
  id: Scalars['String']['output'];
  lineItemId: Scalars['String']['output'];
  reason: Scalars['String']['output'];
};

export type LineItemPauseCreated = {
  __typename?: 'LineItemPauseCreated';
  lineItemPause?: Maybe<LineItemPause>;
};

export type LineItemPauseDeleted = {
  __typename?: 'LineItemPauseDeleted';
  lineItemPauseId: Scalars['String']['output'];
};

export enum LineMode {
  Dlr = 'DLR',
  ElizabethLine = 'ELIZABETH_LINE',
  NationalRail = 'NATIONAL_RAIL',
  Overground = 'OVERGROUND',
  Tube = 'TUBE',
  UnknownLineMode = 'UNKNOWN_LINE_MODE'
}

export type ListedBuildingsDatasetCreated = {
  __typename?: 'ListedBuildingsDatasetCreated';
  count: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type ListedLocationsCheckedAndUpdated = {
  __typename?: 'ListedLocationsCheckedAndUpdated';
  countPotentiallyListed: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type ListenForEmailsCommand = {
  __typename?: 'ListenForEmailsCommand';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ListeningForEmails = {
  __typename?: 'ListeningForEmails';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type Location = {
  __typename?: 'Location';
  accessNotes: Scalars['String']['output'];
  activeTenancies?: Maybe<GetTenanciesList>;
  address?: Maybe<Address>;
  agencies?: Maybe<Array<Maybe<Company>>>;
  agentProfileIds: Array<Scalars['String']['output']>;
  approvedToMarketAt?: Maybe<Timestamp>;
  archivedAt?: Maybe<Timestamp>;
  area?: Maybe<Array<Maybe<Boundary>>>;
  buildingUnits?: Maybe<Array<Maybe<BuildingUnit>>>;
  content?: Maybe<Scalars['JSON']['output']>;
  coordinates?: Maybe<Coordinate>;
  createdAt?: Maybe<Timestamp>;
  currencyCode: Scalars['String']['output'];
  data?: Maybe<LocationMutableData>;
  deletedAt?: Maybe<Timestamp>;
  displayId: Scalars['String']['output'];
  displayOnWebsite: Scalars['Boolean']['output'];
  facilities?: Maybe<Array<LocationFacility>>;
  facilityIds: Array<Scalars['String']['output']>;
  financialData?: Maybe<LocationMutableFinancialModel>;
  financialModel?: Maybe<LocationFinancialModel>;
  googleDriveFileId: Scalars['String']['output'];
  googleDriveFileLink: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isKittChoice: Scalars['Boolean']['output'];
  isLiveOnSearch?: Maybe<Scalars['Boolean']['output']>;
  isRiskWarning: Scalars['Boolean']['output'];
  kittTemplateBrochure?: Maybe<GetKittTemplateForEntityGroupResponse>;
  /** @deprecated Use landlordProfile instead */
  landlordCompany?: Maybe<Company>;
  landlordCompanyId: Scalars['String']['output'];
  landlordCoversEntireFitout?: Maybe<Scalars['Boolean']['output']>;
  landlordProfile?: Maybe<Profile>;
  landlordProfileId: Scalars['String']['output'];
  locationAgencies?: Maybe<Array<LocationAgency>>;
  locationSourceUrls?: Maybe<Array<LocationSourceUrl>>;
  marketingContent?: Maybe<MarketingContent>;
  name: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  onboardedAt?: Maybe<Timestamp>;
  primaryAccessMethod: Scalars['String']['output'];
  primaryAccessMethodType?: Maybe<AccessMethodOptional>;
  productDetails?: Maybe<LocationProductDetails>;
  products?: Maybe<Array<Maybe<Product>>>;
  qualifiedAt?: Maybe<Timestamp>;
  qualifiedByUser?: Maybe<User>;
  qualifiedByUserId: Scalars['String']['output'];
  requiredFields?: Maybe<LocationRequiredFields>;
  salesBlurb: Scalars['String']['output'];
  scrapedStatus?: Maybe<ScrapedStatus>;
  sellingPointIds?: Maybe<Array<Scalars['String']['output']>>;
  sellingPoints?: Maybe<Array<Maybe<LocationSellingPoint>>>;
  spacePartner?: Maybe<User>;
  spacePartnerId: Scalars['String']['output'];
  status?: Maybe<LocationStatus>;
  strapiLocationUrl?: Maybe<Scalars['String']['output']>;
  surveyPhotoUploadIds: Array<Scalars['String']['output']>;
  surveyPhotos?: Maybe<Array<Maybe<UploadMessage>>>;
  templateBrochure?: Maybe<Brochure>;
  templateBrochureId?: Maybe<Scalars['String']['output']>;
  /** @deprecated use trainStations instead */
  tflStopTypes?: Maybe<TflStopTypes>;
  timezoneId?: Maybe<Scalars['String']['output']>;
  trainStations?: Maybe<Array<Maybe<LocationStation>>>;
  traits?: Maybe<Array<BuildingTrait>>;
  units?: Maybe<UnitsByLocation>;
  updatedAt?: Maybe<Timestamp>;
  urls: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
  verifiedAt?: Maybe<Timestamp>;
  verifiedByUser?: Maybe<User>;
  verifiedByUserId: Scalars['String']['output'];
  virtualTourLinks: Array<Scalars['String']['output']>;
};


export type LocationSurveyPhotosArgs = {
  height?: InputMaybe<Scalars['Int']['input']>;
  quality?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};


export type LocationTflStopTypesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  radius?: InputMaybe<Scalars['Int']['input']>;
};


export type LocationUnitsArgs = {
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LocationAgency = {
  __typename?: 'LocationAgency';
  agencyCompanyId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationAgencyInput = {
  agencyCompanyId: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
};

export type LocationArchived = {
  __typename?: 'LocationArchived';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationCreated = {
  __typename?: 'LocationCreated';
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LocationDateRange = {
  __typename?: 'LocationDateRange';
  max?: Maybe<Timestamp>;
  min?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type LocationDateRangeInput = {
  max?: InputMaybe<TimestampInput>;
  min?: InputMaybe<TimestampInput>;
};

export type LocationDeleted = {
  __typename?: 'LocationDeleted';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationDisqualified = {
  __typename?: 'LocationDisqualified';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationEdge = {
  __typename?: 'LocationEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationEdited = {
  __typename?: 'LocationEdited';
  location?: Maybe<Location>;
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type LocationFacility = {
  __typename?: 'LocationFacility';
  icon?: Maybe<UploadMessage>;
  iconUploadId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type LocationFacilityCreated = {
  __typename?: 'LocationFacilityCreated';
  facility?: Maybe<LocationFacility>;
  user?: Maybe<User>;
};

export type LocationFinancialModel = {
  __typename?: 'LocationFinancialModel';
  aflUsed: Scalars['Boolean']['output'];
  agentSetUp?: Maybe<AgentSetUp>;
  bidLevy: Scalars['Boolean']['output'];
  buildingInsurance?: Maybe<LocationMoney>;
  buildingInsuranceRenewalDate?: Maybe<Timestamp>;
  serviceCharge?: Maybe<LocationMoney>;
  serviceChargeYearEnd?: Maybe<Timestamp>;
  user?: Maybe<User>;
  utilitiesRechargedFromLandlord: Scalars['Boolean']['output'];
  withinCityOfLondon: Scalars['Boolean']['output'];
};

export type LocationFinancialModelMutation = {
  __typename?: 'LocationFinancialModelMutation';
  aflUsed?: Maybe<Scalars['Boolean']['output']>;
  agentSetUp?: Maybe<AgentSetUpOptional>;
  bidLevy?: Maybe<Scalars['Boolean']['output']>;
  buildingInsurancePennies?: Maybe<Scalars['Int']['output']>;
  buildingInsuranceRenewalDate?: Maybe<Timestamp>;
  serviceChargePennies?: Maybe<Scalars['Int']['output']>;
  serviceChargeYearEnd?: Maybe<Timestamp>;
  user?: Maybe<User>;
  utilitiesRechargedFromLandlord?: Maybe<Scalars['Boolean']['output']>;
  withinCityOfLondon?: Maybe<Scalars['Boolean']['output']>;
};

export type LocationFinancialModelMutationInput = {
  aflUsed?: InputMaybe<Scalars['Boolean']['input']>;
  agentSetUp?: InputMaybe<AgentSetUpOptionalInput>;
  bidLevy?: InputMaybe<Scalars['Boolean']['input']>;
  buildingInsurancePennies?: InputMaybe<Scalars['Int']['input']>;
  buildingInsuranceRenewalDate?: InputMaybe<TimestampInput>;
  serviceChargePennies?: InputMaybe<Scalars['Int']['input']>;
  serviceChargeYearEnd?: InputMaybe<TimestampInput>;
  utilitiesRechargedFromLandlord?: InputMaybe<Scalars['Boolean']['input']>;
  withinCityOfLondon?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LocationMoney = {
  __typename?: 'LocationMoney';
  currencySymbol: Scalars['String']['output'];
  formatted: Scalars['String']['output'];
  pennies: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type LocationMutableData = {
  __typename?: 'LocationMutableData';
  accessNotes?: Maybe<Scalars['String']['output']>;
  address?: Maybe<Address>;
  agentProfileIds?: Maybe<Array<Scalars['String']['output']>>;
  coordinates?: Maybe<Coordinate>;
  displayOnWebsite?: Maybe<Scalars['Boolean']['output']>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  isKittChoice?: Maybe<Scalars['Boolean']['output']>;
  landlordCompanyId?: Maybe<Scalars['String']['output']>;
  landlordProfileId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  primaryAccessMethod?: Maybe<Scalars['String']['output']>;
  primaryAccessMethodType?: Maybe<AccessMethodOptional>;
  salesBlurb?: Maybe<Scalars['String']['output']>;
  spacePartnerId?: Maybe<Scalars['String']['output']>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  urls?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  virtualTourLinks?: Maybe<Array<Scalars['String']['output']>>;
};

export type LocationMutableDataInput = {
  accessNotes?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<AddressInput>;
  agentProfileIds?: InputMaybe<Array<Scalars['String']['input']>>;
  coordinates?: InputMaybe<CoordinateInput>;
  displayOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  landlordCompanyId?: InputMaybe<Scalars['String']['input']>;
  landlordProfileId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  primaryAccessMethod?: InputMaybe<Scalars['String']['input']>;
  primaryAccessMethodType?: InputMaybe<AccessMethodOptionalInput>;
  salesBlurb?: InputMaybe<Scalars['String']['input']>;
  spacePartnerId?: InputMaybe<Scalars['String']['input']>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  urls?: InputMaybe<Array<Scalars['String']['input']>>;
  virtualTourLinks?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type LocationMutableFinancialModel = {
  __typename?: 'LocationMutableFinancialModel';
  agentSetUp?: Maybe<AgentSetUpOptional>;
  bidLevy?: Maybe<Scalars['Boolean']['output']>;
  buildingInsurance?: Maybe<Money>;
  buildingInsuranceRenewalDate?: Maybe<Timestamp>;
  serviceCharge?: Maybe<Money>;
  serviceChargeIncInsurance?: Maybe<Scalars['Boolean']['output']>;
  serviceChargeIncMAndE?: Maybe<Scalars['Boolean']['output']>;
  serviceChargeIncUtilities?: Maybe<Scalars['Boolean']['output']>;
  serviceChargeYearEnd?: Maybe<Timestamp>;
  user?: Maybe<User>;
  utilitiesRechargedFromLandlord?: Maybe<Scalars['Boolean']['output']>;
  withinCityOfLondon?: Maybe<Scalars['Boolean']['output']>;
};

export type LocationMutableFinancialModelInput = {
  agentSetUp?: InputMaybe<AgentSetUpOptionalInput>;
  bidLevy?: InputMaybe<Scalars['Boolean']['input']>;
  buildingInsurance?: InputMaybe<MoneyInput>;
  buildingInsuranceRenewalDate?: InputMaybe<TimestampInput>;
  serviceCharge?: InputMaybe<MoneyInput>;
  serviceChargeIncInsurance?: InputMaybe<Scalars['Boolean']['input']>;
  serviceChargeIncMAndE?: InputMaybe<Scalars['Boolean']['input']>;
  serviceChargeIncUtilities?: InputMaybe<Scalars['Boolean']['input']>;
  serviceChargeYearEnd?: InputMaybe<TimestampInput>;
  utilitiesRechargedFromLandlord?: InputMaybe<Scalars['Boolean']['input']>;
  withinCityOfLondon?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LocationNameUpdated = {
  __typename?: 'LocationNameUpdated';
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationProductDetails = {
  __typename?: 'LocationProductDetails';
  desks?: Maybe<Range>;
  price?: Maybe<ProductPriceRange>;
  sqFt?: Maybe<Range>;
};

export type LocationProductFilters = {
  __typename?: 'LocationProductFilters';
  availableFrom?: Maybe<Timestamp>;
  desk?: Maybe<LocationRangeFilter>;
  facility?: Maybe<Array<Scalars['String']['output']>>;
  minTerm?: Maybe<LocationRange>;
  polygon?: Maybe<Array<Coordinate>>;
  price?: Maybe<LocationRangeFilter>;
  squareFoot?: Maybe<LocationRangeFilter>;
  startDate?: Maybe<LocationDateRange>;
  user?: Maybe<User>;
  viewport?: Maybe<LocationViewport>;
};

export type LocationProductFiltersInput = {
  availableFrom?: InputMaybe<TimestampInput>;
  desk?: InputMaybe<LocationRangeFilterInput>;
  facility?: InputMaybe<Array<Scalars['String']['input']>>;
  minTerm?: InputMaybe<LocationRangeInput>;
  polygon?: InputMaybe<Array<CoordinateInput>>;
  price?: InputMaybe<LocationRangeFilterInput>;
  squareFoot?: InputMaybe<LocationRangeFilterInput>;
  startDate?: InputMaybe<LocationDateRangeInput>;
  viewport?: InputMaybe<LocationViewportInput>;
};

export type LocationQualified = {
  __typename?: 'LocationQualified';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationRange = {
  __typename?: 'LocationRange';
  max: Scalars['Int']['output'];
  min: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type LocationRangeFilter = {
  __typename?: 'LocationRangeFilter';
  max: Scalars['String']['output'];
  min: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationRangeFilterInput = {
  max: Scalars['String']['input'];
  min: Scalars['String']['input'];
};

export type LocationRangeInput = {
  max: Scalars['Int']['input'];
  min: Scalars['Int']['input'];
};

export type LocationRequiredFields = {
  __typename?: 'LocationRequiredFields';
  location?: Maybe<RequiredFields>;
  units?: Maybe<Array<RequiredFields>>;
  user?: Maybe<User>;
};

export type LocationSellingPoint = {
  __typename?: 'LocationSellingPoint';
  icon?: Maybe<UploadMessage>;
  iconUploadId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationSellingPointCreated = {
  __typename?: 'LocationSellingPointCreated';
  sellingPointId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationSellingPointDeleted = {
  __typename?: 'LocationSellingPointDeleted';
  sellingPointId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum LocationSortBy {
  Address = 'ADDRESS',
  AvailableFrom = 'AVAILABLE_FROM',
  CreatedAt = 'CREATED_AT',
  Desks = 'DESKS',
  MinimumTerm = 'MINIMUM_TERM',
  Name = 'NAME',
  Price = 'PRICE',
  Sqft = 'SQFT',
  Type = 'TYPE',
  Units = 'UNITS'
}

export type LocationSourceUrl = {
  __typename?: 'LocationSourceUrl';
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationSpaceMatchEdge = {
  __typename?: 'LocationSpaceMatchEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<LocationSpaceMatchResult>;
  user?: Maybe<User>;
};

export type LocationSpaceMatchResult = {
  __typename?: 'LocationSpaceMatchResult';
  location?: Maybe<Location>;
  user?: Maybe<User>;
  validCombinations?: Maybe<Array<UnitCombinationResult>>;
  validUnitIds: Array<Scalars['String']['output']>;
  validUnits?: Maybe<Array<Maybe<Unit>>>;
};

export type LocationStation = {
  __typename?: 'LocationStation';
  distanceInMetres: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  lines?: Maybe<Array<TrainLine>>;
  minutesToWalk: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum LocationStatus {
  ReadyToMarket = 'READY_TO_MARKET',
  ReadyToSell = 'READY_TO_SELL',
  ReadyToSource = 'READY_TO_SOURCE',
  ReadyToView = 'READY_TO_VIEW',
  Unverified = 'UNVERIFIED'
}

export type LocationUnarchived = {
  __typename?: 'LocationUnarchived';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationUpdated = {
  __typename?: 'LocationUpdated';
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LocationVerified = {
  __typename?: 'LocationVerified';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LocationViewport = {
  __typename?: 'LocationViewport';
  nw?: Maybe<Coordinate>;
  se?: Maybe<Coordinate>;
  user?: Maybe<User>;
};

export type LocationViewportInput = {
  nw?: InputMaybe<CoordinateInput>;
  se?: InputMaybe<CoordinateInput>;
};

export type LocationsBatchResponse = {
  __typename?: 'LocationsBatchResponse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type LocationsConnection = {
  __typename?: 'LocationsConnection';
  edges?: Maybe<Array<LocationEdge>>;
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  pageInfo?: Maybe<PageInfo>;
  totalCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type LocationsInboxEntity = {
  __typename?: 'LocationsInboxEntity';
  entity?: Maybe<LocationsInboxEntityUnion>;
  id: Scalars['String']['output'];
  totalUnits?: Maybe<Scalars['Int']['output']>;
  type?: Maybe<LocationsInboxEntityType>;
  viewsThisMonth: Scalars['Int']['output'];
};

export enum LocationsInboxEntityType {
  LocationInboxLocation = 'LOCATION_INBOX_LOCATION',
  LocationInboxUnit = 'LOCATION_INBOX_UNIT'
}

export type LocationsInboxEntityUnion = Building | BuildingUnit;

export type LocationsInboxSortByInput = {
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<LocationsInboxSortByType>;
};

export enum LocationsInboxSortByType {
  LocationInboxSortByBaselinesMetFrom = 'LOCATION_INBOX_SORT_BY_BASELINES_MET_FROM',
  LocationInboxSortByEntityName = 'LOCATION_INBOX_SORT_BY_ENTITY_NAME',
  LocationInboxSortByEntityType = 'LOCATION_INBOX_SORT_BY_ENTITY_TYPE',
  LocationInboxSortByPriority = 'LOCATION_INBOX_SORT_BY_PRIORITY',
  LocationInboxSortByTotalUnits = 'LOCATION_INBOX_SORT_BY_TOTAL_UNITS',
  LocationInboxSortByViewsThisMonth = 'LOCATION_INBOX_SORT_BY_VIEWS_THIS_MONTH'
}

export type LocationsInboxTabCounts = {
  __typename?: 'LocationsInboxTabCounts';
  allCount: Scalars['Int']['output'];
  archivedCount: Scalars['Int']['output'];
  liveCount: Scalars['Int']['output'];
  pendingCount: Scalars['Int']['output'];
};

export type LocationsMerged = {
  __typename?: 'LocationsMerged';
  deletedUnitIds: Array<Scalars['String']['output']>;
  fromId: Scalars['String']['output'];
  mergedUnitIds: Array<Scalars['String']['output']>;
  toId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LocationsUpdated = {
  __typename?: 'LocationsUpdated';
  locations?: Maybe<Array<Location>>;
  user?: Maybe<User>;
};

export type LockAcquiredForLocationVerification = {
  __typename?: 'LockAcquiredForLocationVerification';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LockLocationForVerificationCommand = {
  __typename?: 'LockLocationForVerificationCommand';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LockReleasedForLocationVerification = {
  __typename?: 'LockReleasedForLocationVerification';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type LogOutFromContextCommand = {
  __typename?: 'LogOutFromContextCommand';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type LoggedInAsUser = {
  __typename?: 'LoggedInAsUser';
  authToken: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LoginAsUserCommand = {
  __typename?: 'LoginAsUserCommand';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LoginCommand = {
  __typename?: 'LoginCommand';
  email: Scalars['String']['output'];
  password: Scalars['String']['output'];
  rememberMe: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type LoginRequest = {
  __typename?: 'LoginRequest';
  authCode?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  password: Scalars['String']['output'];
  rememberMe?: Maybe<Scalars['Boolean']['output']>;
  type?: Maybe<AuthenticationFactorType>;
  user?: Maybe<User>;
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  authenticationFactors?: Maybe<Array<AuthenticationFactorType>>;
  cookie?: Maybe<Scalars['String']['output']>;
  rememberMe?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type LoginRevokedForUser = {
  __typename?: 'LoginRevokedForUser';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LogoutUserCommand = {
  __typename?: 'LogoutUserCommand';
  cookie: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LostReason = {
  __typename?: 'LostReason';
  id: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type LumpSums = {
  __typename?: 'LumpSums';
  agentFee: Scalars['Float']['output'];
  designDressing: Scalars['Float']['output'];
  fitout: Scalars['Float']['output'];
  leaseVoidRecovery: Scalars['Float']['output'];
  oldBrokerFee: Scalars['Float']['output'];
  topup: Scalars['Float']['output'];
  user?: Maybe<User>;
};

export type MsaCreated = {
  __typename?: 'MSACreated';
  msas?: Maybe<Array<ManagedServiceAgreement>>;
  submittedByUserId: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type MsaInputInput = {
  agreedAmounts?: InputMaybe<Array<MsaItemInputInput>>;
  categoryId: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  rrule?: InputMaybe<Scalars['String']['input']>;
};

export type MsaItemInputInput = {
  unitId: Scalars['String']['input'];
  unitQuantity: Scalars['Int']['input'];
};

export type ManagedServiceAgreement = {
  __typename?: 'ManagedServiceAgreement';
  agreedAmounts?: Maybe<Array<ManagedServiceAgreementItem>>;
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  lineItems?: Maybe<Array<Maybe<LineItem>>>;
  notes: Scalars['String']['output'];
  rrule: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type ManagedServiceAgreementItem = {
  __typename?: 'ManagedServiceAgreementItem';
  id: Scalars['String']['output'];
  msaId: Scalars['String']['output'];
  unit?: Maybe<UnitOfMeasure>;
  unitId: Scalars['String']['output'];
  unitQuantity: Scalars['Int']['output'];
};

export type ManyProfiles = {
  __typename?: 'ManyProfiles';
  profiles?: Maybe<Array<Profile>>;
  user?: Maybe<User>;
};

export type MarkChatAsReadAction = {
  __typename?: 'MarkChatAsReadAction';
  chatId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MarkMessagesAsReadCommand = {
  __typename?: 'MarkMessagesAsReadCommand';
  chatMessageIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type MarkNotificationAsRead = {
  __typename?: 'MarkNotificationAsRead';
  notificationIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type MarketingContent = {
  __typename?: 'MarketingContent';
  advertisementDescription: Scalars['String']['output'];
  area: Scalars['String']['output'];
  areaFacts: Array<Scalars['String']['output']>;
  brochureId: Scalars['String']['output'];
  description: Scalars['String']['output'];
  floorplans?: Maybe<Array<Media>>;
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  photos?: Maybe<Array<Media>>;
  ranking: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  status: Scalars['Boolean']['output'];
  videos?: Maybe<Array<ExternalMedia>>;
  virtualTourLink: Scalars['String']['output'];
  vrId: Scalars['String']['output'];
};

export type MarketingStatusInput = {
  published: Scalars['Boolean']['input'];
};

export type MatchSpacesCommand = {
  __typename?: 'MatchSpacesCommand';
  matches?: Maybe<Array<MatchedSpace>>;
  requirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MatchedSpace = {
  __typename?: 'MatchedSpace';
  createdAt?: Maybe<Timestamp>;
  dealId: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  index: Scalars['String']['output'];
  matchedAt?: Maybe<Timestamp>;
  productId: Scalars['String']['output'];
  reasonUnmatched: Scalars['String']['output'];
  requirementsId: Scalars['String']['output'];
  unmatchedAt?: Maybe<Timestamp>;
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type MatchedSpaceDeleted = {
  __typename?: 'MatchedSpaceDeleted';
  productId: Scalars['String']['output'];
  requirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MatchedSpaceRestored = {
  __typename?: 'MatchedSpaceRestored';
  dealId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MatchedSpacesReordered = {
  __typename?: 'MatchedSpacesReordered';
  matches?: Maybe<Array<MatchedSpace>>;
  requirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MeanDaysInPerWeekInsight = {
  __typename?: 'MeanDaysInPerWeekInsight';
  entityId: Scalars['String']['output'];
  percentageIncrease: Scalars['Float']['output'];
  value: Scalars['Float']['output'];
};

export type MeanDaysInPerWeekInsights = {
  __typename?: 'MeanDaysInPerWeekInsights';
  companyWide?: Maybe<MeanDaysInPerWeekInsight>;
  perTeam?: Maybe<Array<MeanDaysInPerWeekInsight>>;
};

export type Media = {
  __typename?: 'Media';
  unitId: Scalars['String']['output'];
  uploadId: Scalars['String']['output'];
};

export type MeetingRoom = {
  __typename?: 'MeetingRoom';
  amenities?: Maybe<AmenityList>;
  building?: Maybe<Building>;
  capacity: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  location?: Maybe<Building>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price: Scalars['String']['output'];
  shared: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type MergeBuildingsCommand = {
  __typename?: 'MergeBuildingsCommand';
  mergeFromIds: Array<Scalars['String']['output']>;
  mergeIntoId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MergeCompanies = {
  __typename?: 'MergeCompanies';
  fromId: Scalars['String']['output'];
  toId: Scalars['String']['output'];
  updates?: Maybe<UpdateCompanyCommand>;
  user?: Maybe<User>;
};

export type MergeDealsCommand = {
  __typename?: 'MergeDealsCommand';
  deal?: Maybe<Deal>;
  fromId: Scalars['String']['output'];
  toId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MergeLocation = {
  __typename?: 'MergeLocation';
  accessNotes?: Maybe<Scalars['String']['output']>;
  address?: Maybe<Address>;
  agentProfileIds?: Maybe<Array<Scalars['String']['output']>>;
  agentSetUp?: Maybe<AgentSetUpOptional>;
  bidLevy: Scalars['Boolean']['output'];
  buildingInsurance?: Maybe<Money>;
  buildingInsuranceRenewalDate?: Maybe<Timestamp>;
  coordinates?: Maybe<Coordinate>;
  displayOnWebsite?: Maybe<Scalars['Boolean']['output']>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  googleDriveFileLink?: Maybe<Scalars['String']['output']>;
  isKittChoice?: Maybe<Scalars['Boolean']['output']>;
  landlordCoversEntireFitout?: Maybe<Scalars['Boolean']['output']>;
  landlordProfileId?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  notes: Scalars['String']['output'];
  primaryAccessMethodType?: Maybe<AccessMethodOptional>;
  salesBlurb?: Maybe<Scalars['String']['output']>;
  sellingPointIds?: Maybe<Array<Scalars['String']['output']>>;
  serviceCharge?: Maybe<Money>;
  serviceChargeYearEnd?: Maybe<Timestamp>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  urls?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  utilitiesRechargedFromLandlord?: Maybe<Scalars['Boolean']['output']>;
  virtualTourLinks?: Maybe<Array<Scalars['String']['output']>>;
  withinCityOfLondon: Scalars['Boolean']['output'];
};

export type MergeLocationInput = {
  accessNotes?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<AddressInput>;
  agentProfileIds?: InputMaybe<Array<Scalars['String']['input']>>;
  agentSetUp?: InputMaybe<AgentSetUpOptionalInput>;
  bidLevy: Scalars['Boolean']['input'];
  buildingInsurance?: InputMaybe<MoneyInput>;
  buildingInsuranceRenewalDate?: InputMaybe<TimestampInput>;
  coordinates?: InputMaybe<CoordinateInput>;
  displayOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  googleDriveFileLink?: InputMaybe<Scalars['String']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  landlordCoversEntireFitout?: InputMaybe<Scalars['Boolean']['input']>;
  landlordProfileId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes: Scalars['String']['input'];
  primaryAccessMethodType?: InputMaybe<AccessMethodOptionalInput>;
  salesBlurb?: InputMaybe<Scalars['String']['input']>;
  sellingPointIds?: InputMaybe<Array<Scalars['String']['input']>>;
  serviceCharge?: InputMaybe<MoneyInput>;
  serviceChargeYearEnd?: InputMaybe<TimestampInput>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  urls?: InputMaybe<Array<Scalars['String']['input']>>;
  utilitiesRechargedFromLandlord?: InputMaybe<Scalars['Boolean']['input']>;
  virtualTourLinks?: InputMaybe<Array<Scalars['String']['input']>>;
  withinCityOfLondon: Scalars['Boolean']['input'];
};

export type MergeLocationsCommand = {
  __typename?: 'MergeLocationsCommand';
  editUnits?: Maybe<Array<EditUnit>>;
  fromId: Scalars['String']['output'];
  mergeLocation?: Maybe<MergeLocation>;
  toId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type MergeVerifyLocationsCommand = {
  __typename?: 'MergeVerifyLocationsCommand';
  locationIdFrom: Scalars['String']['output'];
  locationIdTo: Scalars['String']['output'];
  user?: Maybe<User>;
  verifyUnits?: Maybe<Array<VerifyUnit>>;
};

export type Message = {
  __typename?: 'Message';
  archived: Scalars['Boolean']['output'];
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  deal?: Maybe<Deal>;
  email?: Maybe<Email>;
  entityId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  thread?: Maybe<Thread>;
  threadId: Scalars['String']['output'];
  type?: Maybe<Type>;
};

export type MessageList = {
  __typename?: 'MessageList';
  messages?: Maybe<Array<ChatMessage>>;
  user?: Maybe<User>;
};

export enum MessageType {
  Document = 'DOCUMENT',
  Event = 'EVENT',
  IssueRaised = 'IssueRaised',
  Membership = 'MEMBERSHIP',
  Message = 'MESSAGE',
  Ooh = 'OOH',
  ToDo = 'ToDo'
}

export type MessagesMarkedAsRead = {
  __typename?: 'MessagesMarkedAsRead';
  chatMessageIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type Metadata = {
  __typename?: 'Metadata';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type MetadataInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum MilestoneStatus {
  Active = 'Active',
  Complete = 'Complete',
  Inactive = 'Inactive'
}

export type MinMax = {
  __typename?: 'MinMax';
  max: Scalars['Float']['output'];
  min: Scalars['Float']['output'];
  user?: Maybe<User>;
};

export type Money = {
  __typename?: 'Money';
  /** The three-letter currency code defined in ISO 4217. */
  currencyCode?: Maybe<Scalars['String']['output']>;
  /** https://github.com/leekchan/accounting */
  format?: Maybe<Scalars['String']['output']>;
  /** The currency symbol associated with the currencyCode */
  symbol?: Maybe<Scalars['String']['output']>;
  /** The smallest unit for the given currency code. For example if `currencyCode` is `GBP`, then 1 unit is one UK penny. */
  units?: Maybe<Scalars['Int']['output']>;
};

export type MoneyInput = {
  /** The three-letter currency code defined in ISO 4217. */
  currencyCode?: InputMaybe<Scalars['String']['input']>;
  /** The whole units of the amount. For example if `currencyCode` is `GBP`, then 1 unit is one UK penny. */
  units: Scalars['Int']['input'];
};

export type MoneyRange = {
  __typename?: 'MoneyRange';
  max?: Maybe<Money>;
  min?: Maybe<Money>;
};

export type MoneyRangeInput = {
  max?: InputMaybe<MoneyInput>;
  min?: InputMaybe<MoneyInput>;
};

export type MonthlyPricingBreakdown = {
  __typename?: 'MonthlyPricingBreakdown';
  monthlyAdvertisedPrice?: Maybe<Money>;
  monthlyBrokerCommission?: Maybe<Money>;
  monthlyFitoutCost?: Maybe<Money>;
  monthlyKittFee?: Maybe<Money>;
  monthlyNetRent?: Maybe<Money>;
  monthlyOpsCost?: Maybe<Money>;
  monthlyRates?: Maybe<Money>;
  monthlyServiceCharge?: Maybe<Money>;
  monthlyUtilitiesCost?: Maybe<Money>;
};

export type Mutation = {
  __typename?: 'Mutation';
  accesssvc_ConfigureAccessCommand?: Maybe<AccessBeingConfigured>;
  accesssvc_CreateAccessCommand?: Maybe<AccessCreated>;
  accesssvc_CreateTemporaryPinCommand?: Maybe<TemporaryPinCreated>;
  accesssvc_DeleteAccessCommand?: Maybe<AccessDeleted>;
  accesssvc_OpenDoorCommand?: Maybe<DoorOpened>;
  accesssvc_RotateCodeCommand?: Maybe<CodeRotated>;
  accesssvc_UpdateAccessNameCommand?: Maybe<AccessUpdated>;
  accesssvc_UpdateNetworkConfigCommand?: Maybe<AccessUpdated>;
  addonsvc_CreateAddonCommand?: Maybe<AddonCreated>;
  addonsvc_CreatePurchaseCommand?: Maybe<PurchaseCreated>;
  addonsvc_DeleteAddonCommand?: Maybe<AddonDeleted>;
  addonsvc_DeletePurchaseCommand?: Maybe<PurchaseDeleted>;
  addonsvc_UpdateAddonCommand?: Maybe<AddonUpdated>;
  addonsvc_UpdatePurchaseCommand?: Maybe<PurchaseUpdated>;
  bookingsvc_ApproveFloorplan?: Maybe<FloorplanApproved>;
  bookingsvc_AssignUserToDeskCommand?: Maybe<UserAssignedToDesk>;
  bookingsvc_BatchSetAttendanceCommand?: Maybe<AttendanceBatchSet>;
  bookingsvc_CreateAttendanceCommand?: Maybe<AttendanceCreated>;
  bookingsvc_CreateBooking?: Maybe<BookingCreated>;
  bookingsvc_CreateRoom?: Maybe<BookingRoomCreatedEffect>;
  bookingsvc_DeleteAmenity?: Maybe<AmenityDeleted>;
  bookingsvc_DeleteAttendanceCommand?: Maybe<AttendanceDeleted>;
  bookingsvc_DeleteBooking?: Maybe<BookingDeleted>;
  bookingsvc_DeleteFloorplan?: Maybe<FloorplanDeleted>;
  bookingsvc_EnquireAboutDeskBooking?: Maybe<DeskBookingFeatureEnquired>;
  bookingsvc_GenerateFloorplans?: Maybe<FloorplansGenerationStarted>;
  bookingsvc_IngestFloorplan?: Maybe<FloorplanIngested>;
  bookingsvc_SaveAmenity?: Maybe<AmenitySaved>;
  bookingsvc_SetCapacityCommand?: Maybe<CapacitySet>;
  bookingsvc_SetDesksOnTeamCommand?: Maybe<DesksOnTeamSet>;
  bookingsvc_SetTeamsOnDeskCommand?: Maybe<TeamsOnDeskSet>;
  bookingsvc_UpdateDesk?: Maybe<DeskUpdated>;
  bookingsvc_UpdateFloorplan?: Maybe<FloorplanUpdated>;
  bookingsvc_UpdateFloorplanZone?: Maybe<FloorplanZoneUpdated>;
  bookingsvc_UpdateRoom?: Maybe<BookingRoomUpdatedEffect>;
  brochuresvc_CloneTemplateCommand?: Maybe<BrochureTemplateCloned>;
  brochuresvc_CreateBrochureCommand?: Maybe<BrochureCreated>;
  brochuresvc_DeleteBrochureCommand?: Maybe<BrochureDeleted>;
  brochuresvc_UpdateBrochureCommand?: Maybe<BrochureUpdated>;
  chatsvc_CreateChatCommand?: Maybe<ChatCreated>;
  chatsvc_CreateChatMemberCommand?: Maybe<ChatMemberCreated>;
  chatsvc_CreateChatMessageCommand?: Maybe<ChatMessageCreated>;
  chatsvc_DeleteChatCommand?: Maybe<ChatDeleted>;
  chatsvc_DeleteChatMemberCommand?: Maybe<ChatMemberDeleted>;
  chatsvc_DeleteChatMessageAction?: Maybe<ChatMessageDeletedEffect>;
  chatsvc_MarkChatAsReadAction?: Maybe<ChatMarkedAsReadEffect>;
  chatsvc_MarkMessagesAsReadCommand?: Maybe<MessagesMarkedAsRead>;
  chatsvc_UpdateChatMessage?: Maybe<ChatMessageUpdated>;
  companysvc_CreateAgencyDomainAndCompanyCommand?: Maybe<AgencyDomainAndCompanyCreated>;
  companysvc_CreateCompanyCommand?: Maybe<CompanyCreated>;
  companysvc_CreateCompanyTeamsCommand?: Maybe<CompanyTeamsCreated>;
  companysvc_DeleteCompanyCommand?: Maybe<CompanyDeleted>;
  companysvc_DeleteCompanyTeamCommand?: Maybe<CompanyTeamDeleted>;
  companysvc_MergeCompanies?: Maybe<CompaniesMerged>;
  companysvc_SaveCompanyCultureCommand?: Maybe<CompanyCultureSaved>;
  companysvc_SaveHybridWorkInformationCommand?: Maybe<HybridWorkInformationSaved>;
  companysvc_SetCompanyIndustriesCommand?: Maybe<CompanyIndustriesUpdated>;
  companysvc_SetCompanyIngressesCommand?: Maybe<CompanyIngresses>;
  companysvc_UpdateCompanyCommand?: Maybe<CompanyUpdated>;
  companysvc_UpdateCompanyTeamCommand?: Maybe<CompanyTeamUpdated>;
  companysvc_UpdateOwnCompany?: Maybe<CompanyUpdated>;
  configuratorsvc_CreateConfiguratorSession?: Maybe<ConfiguratorSessionCreated>;
  configuratorsvc_UpdateConfigurationSession?: Maybe<ConfiguratorSessionUpdated>;
  dealsvc_AddSelectionsCommand?: Maybe<SelectionsAdded>;
  dealsvc_AddShortlistsToDealCommand?: Maybe<ShortlistsAddedToDeal>;
  dealsvc_ApproveShortlistCommand?: Maybe<ShortlistApproved>;
  dealsvc_AssignSalesTeamToBrokerCompanyCommand?: Maybe<SalesTeamAssignedToBrokerCompany>;
  dealsvc_CreateActivityCommand?: Maybe<ActivityCreated>;
  dealsvc_CreateBrokerEnquiryCommand?: Maybe<BrokerEnquiryCreated>;
  dealsvc_CreateBrokerSearchCommand?: Maybe<BrokerSearchCreated>;
  dealsvc_CreateDealCommand?: Maybe<DealCreated>;
  dealsvc_CreateDealSpaceMatchCommand?: Maybe<DealSpaceMatched>;
  dealsvc_CreateDismissedRecommendationsCommand?: Maybe<DismissedRecommendationsCreated>;
  dealsvc_CreateNoteOnDealCommand?: Maybe<NoteCreated>;
  dealsvc_CreateSelectionFeedbacksCommand?: Maybe<SelectionFeedbacksCreated>;
  dealsvc_CreateShortlistCommand?: Maybe<ShortlistCreated>;
  dealsvc_CreateShortlistViewingRequestsCommand?: Maybe<ShortlistViewingRequestsCreated>;
  dealsvc_CreateViewingRequestCommand?: Maybe<ViewingRequestCreated>;
  dealsvc_DeleteActivityCommand?: Maybe<ActivityDeleted>;
  dealsvc_DeleteBrokerSearchCommand?: Maybe<BrokerSearchDeleted>;
  dealsvc_DeleteDealCommand?: Maybe<DealDeleted>;
  dealsvc_DeleteDealSpaceMatchCommand?: Maybe<DealSpaceMatchDeleted>;
  dealsvc_DeleteNoteOnDealCommand?: Maybe<NoteDeleted>;
  dealsvc_DeleteShortlistCommand?: Maybe<ShortlistDeleted>;
  dealsvc_MergeDealsCommand?: Maybe<DealsMerged>;
  dealsvc_RemoveSelectionsCommand?: Maybe<SelectionsRemoved>;
  dealsvc_RemoveShortlistsFromDealCommand?: Maybe<ShortlistsRemovedFromDeal>;
  dealsvc_RequestAddShortlistToValveCommand?: Maybe<ShortlistAddToValveRequested>;
  dealsvc_RestoreShortlistCommand?: Maybe<ShortlistRestored>;
  dealsvc_SaveSearchRequirementsCommand?: Maybe<SearchRequirementsSaved>;
  dealsvc_ShareShortlistWithCurrentUserCommand?: Maybe<ShortlistSharedCurrentUser>;
  dealsvc_UpdateActivityCommand?: Maybe<ActivityUpdated>;
  dealsvc_UpdateBrokerSearchCommand?: Maybe<BrokerSearchUpdated>;
  dealsvc_UpdateBrokerSearchPolygonCommand?: Maybe<BrokerSearchPolygonUpdated>;
  dealsvc_UpdateDealCommand?: Maybe<DealUpdated>;
  dealsvc_UpdateDealSpaceMatchCommand?: Maybe<DealSpaceMatchUpdated>;
  dealsvc_UpdateNoteOnDealCommand?: Maybe<NoteUpdated>;
  dealsvc_UpdateSelectionsCommand?: Maybe<SelectionsUpdated>;
  dealsvc_UpdateShortlistCommand?: Maybe<ShortlistUpdated>;
  deploymentsvc_DeployPreviewCommand?: Maybe<DeployStarted>;
  documentsvc_CreateDocumentCommand?: Maybe<DocumentCreated>;
  enquirysvc_CreateEnquiryCommand?: Maybe<EnquiryCreated>;
  enquirysvc_CreateQuoteCommand?: Maybe<QuoteCreated>;
  enquirysvc_DeleteEnquiryCommand?: Maybe<EnquiryDeleted>;
  enquirysvc_DeleteQuoteCommand?: Maybe<QuoteDeleted>;
  enquirysvc_DuplicateQuoteCommand?: Maybe<QuoteDuplicated>;
  enquirysvc_UpdateEnquiryCommand?: Maybe<EnquiryUpdated>;
  enquirysvc_UpdateQuoteCommand?: Maybe<QuoteUpdated>;
  favouritesvc_AddFavourite?: Maybe<FavouriteAdded>;
  favouritesvc_RemoveFavourite?: Maybe<FavouriteRemoved>;
  feedbacksvc_CreateFeedbackCommand?: Maybe<FeedbackCreated>;
  feedbacksvc_MarkFeaturesAsReadCommand?: Maybe<FeaturesMarkedAsRead>;
  gmailsvc_ListenForEmailsCommand?: Maybe<ListeningForEmails>;
  gmailsvc_SendEmailCommand?: Maybe<EmailSent>;
  guestsvc_DeleteGuestCommand?: Maybe<GuestDeleted>;
  guestsvc_GuestArrivedCommand?: Maybe<GuestArrived>;
  guestsvc_OpenDoorForGuestCommand?: Maybe<DoorOpened>;
  guestsvc_RegisterGuestCommand?: Maybe<GuestRegistered>;
  guestsvc_ResendGuestDayPass?: Maybe<GuestDayPassResent>;
  iamsvc_AddSubjectToGroup?: Maybe<SubjectAddedToGroup>;
  iamsvc_ArchivePermissionCommand?: Maybe<PermissionArchived>;
  iamsvc_CreatePermissionCommand?: Maybe<PermissionCreated>;
  iamsvc_RemoveSubjectFromGroup?: Maybe<SubjectRemovedFromGroup>;
  insightsvc_GetAccessesFullLoad?: Maybe<IndexRebuilt>;
  issuesvc_ArchiveIssueAction?: Maybe<IssueArchived>;
  issuesvc_AttachUploadToIssueAction?: Maybe<UploadAttachedToIssue>;
  issuesvc_ClearIssueUploads?: Maybe<IssueUploadsCleared>;
  issuesvc_CloseIssueCommand?: Maybe<IssueClosed>;
  issuesvc_CreateIssueAction?: Maybe<IssueCreated>;
  issuesvc_CreateIssueUpdateCommand?: Maybe<IssueUpdateCreated>;
  issuesvc_DeleteIssueAction?: Maybe<IssueDeleted>;
  issuesvc_DeleteIssueUpdateCommand?: Maybe<IssueUpdateDeleted>;
  issuesvc_DeleteIssueUploadAction?: Maybe<IssueUploadDeleted>;
  issuesvc_MigrateVisits?: Maybe<VisitsMigrated>;
  issuesvc_ReOpenIssueAction?: Maybe<IssueReOpened>;
  issuesvc_RemindLeadTenantsAboutIssue?: Maybe<LeadTenantsRemindedAboutIssue>;
  issuesvc_SendSummaryEmail?: Maybe<SummaryEmailSent>;
  issuesvc_UpdateIssueAction?: Maybe<IssueUpdated>;
  issuesvc_UpdateIssueUpdateCommand?: Maybe<IssueUpdateUpdated>;
  locationsvc_ArchiveLocationCommand?: Maybe<LocationArchived>;
  locationsvc_CreateBuildingTraitCommand?: Maybe<BuildingTraitCreated>;
  locationsvc_CreateLocationCommand?: Maybe<LocationCreated>;
  locationsvc_CreateLocationFacilityCommand?: Maybe<LocationFacilityCreated>;
  locationsvc_CreateLocationSellingPoint?: Maybe<LocationSellingPointCreated>;
  locationsvc_CreateScrapedLocationsCommand?: Maybe<ScrapedLocationsCreated>;
  locationsvc_DeleteLocationCommand?: Maybe<LocationDeleted>;
  locationsvc_DeleteLocationSellingPoint?: Maybe<LocationSellingPointDeleted>;
  locationsvc_DiscardSourcedLocationCommand?: Maybe<SourcedLocationDiscarded>;
  locationsvc_DisqualifyLocation?: Maybe<LocationDisqualified>;
  locationsvc_EditLocationCommand?: Maybe<LocationEdited>;
  locationsvc_LockLocationForVerificationCommand?: Maybe<LockAcquiredForLocationVerification>;
  locationsvc_MergeBuildingsCommand?: Maybe<BuildingsMerged>;
  locationsvc_MergeLocationsCommand?: Maybe<LocationsMerged>;
  locationsvc_MergeVerifyLocationsCommand?: Maybe<VerifyLocationsMerged>;
  locationsvc_QualifyLocationCommand?: Maybe<LocationQualified>;
  locationsvc_RestoreBuildingUnitCommand?: Maybe<BuildingUnitRestored>;
  locationsvc_SaveBuildingCommand?: Maybe<BuildingSaved>;
  locationsvc_SubmitBuildingCommand?: Maybe<BuildingSubmitted>;
  locationsvc_UnarchiveLocationCommand?: Maybe<LocationUnarchived>;
  locationsvc_UnlockLocationForVerificationCommand?: Maybe<LockReleasedForLocationVerification>;
  locationsvc_UpdateAgenciesForLocationCommand?: Maybe<AgenciesForLocationUpdated>;
  locationsvc_UpdateLocationNameCommand?: Maybe<LocationNameUpdated>;
  locationsvc_UpdateLocationStatusesCommand?: Maybe<LocationsUpdated>;
  locationsvc_UpdateSourcedLocationCommand?: Maybe<SourcedLocationUpdated>;
  locationsvc_VerifyLocationCommand?: Maybe<LocationVerified>;
  notificationsvc_DeleteUserPushTokenCommand?: Maybe<UserPushTokenDeleted>;
  notificationsvc_MarkNotificationAsRead?: Maybe<NotificationMarkedAsRead>;
  notificationsvc_NotifyAboutTenancyCommand?: Maybe<UserNotifiedAboutTenancy>;
  notificationsvc_SaveUserPushTokenCommand?: Maybe<UserPushTokenSaved>;
  notificationsvc_SendChatPulse?: Maybe<FeedbackCreated>;
  notificationsvc_SendEmailAction?: Maybe<EmailSentEvent>;
  notificationsvc_SendKitchenSinkCommand?: Maybe<KitchenSinkSent>;
  notificationsvc_SendNewEnquiryNotificationCommand?: Maybe<NewEnquiryNotificationSent>;
  notificationsvc_SendNotificationToAllUsersCommand?: Maybe<NotificationSentToAllUsers>;
  notificationsvc_SendTenancyPulse?: Maybe<FeedbackCreated>;
  notificationsvc_SetCommunicationPreference?: Maybe<CommunicationPreferenceSet>;
  notificationsvc_SetCommunicationPreferenceForAllEmployeesOfCompany?: Maybe<CommunicationPreferenceSet>;
  notificationsvc_TenantAppFeedbackSubmission?: Maybe<NewEnquiryNotificationSent>;
  ordersvc_CreateLineItemPauseCommand?: Maybe<LineItemPauseCreated>;
  ordersvc_CreateMSA?: Maybe<MsaCreated>;
  ordersvc_DeleteLineItemPauseCommand?: Maybe<LineItemPauseDeleted>;
  ordersvc_SaveOrderNotes?: Maybe<OrderNotesSaved>;
  ordersvc_SaveOrdersCommand?: Maybe<OrdersSaved>;
  productsvc_ArchiveProductCommand?: Maybe<ProductArchived>;
  productsvc_CreateProductCommand?: Maybe<ProductCreated>;
  productsvc_DeleteProductCommand?: Maybe<ProductDeleted>;
  productsvc_UnarchiveProductCommand?: Maybe<ProductUnarchived>;
  productsvc_UpdateProductCommand?: Maybe<ProductUpdated>;
  profilesvc_CreateProfileCommand?: Maybe<ProfileCreated>;
  profilesvc_DeleteProfileCommand?: Maybe<ProfileDeleted>;
  profilesvc_UpdateProfileCommand?: Maybe<ProfileUpdated>;
  requestsvc_CreateRequestCommand?: Maybe<RequestCreated>;
  requestsvc_UpdateRequestCommand?: Maybe<RequestUpdated>;
  roomsvc_CancelBookingCommand?: Maybe<BookingCancelled>;
  roomsvc_CreateBookingCommand?: Maybe<BookingConfirmed>;
  roomsvc_CreateRoomAction?: Maybe<RoomCreated>;
  roomsvc_DeleteRoomAction?: Maybe<RoomDeletedEffect>;
  roomsvc_RecoverRoomAction?: Maybe<RoomRecoveredEffect>;
  roomsvc_UpdateRoomAction?: Maybe<RoomUpdated>;
  schedulersvc_ActivateScheduleCommand?: Maybe<ScheduleActivated>;
  schedulersvc_CreateScheduleCommand?: Maybe<ScheduleCreated>;
  schedulersvc_DeactivateScheduleCommand?: Maybe<ScheduleDeactivated>;
  schedulersvc_DeleteScheduleCommand?: Maybe<ScheduleDeleted>;
  scrapersvc_StartScrapeCommand?: Maybe<FailedToScrapeSite>;
  searchsvc_RebuildIndex?: Maybe<IndexRebuilt>;
  tenancysvc_AddDocumentToTenancy?: Maybe<DocumentAddedToTenancy>;
  tenancysvc_CompleteTenancyTodoCommand?: Maybe<TenancyTodoCompleted>;
  tenancysvc_CreateTenancyCommand?: Maybe<TenancyCreated>;
  tenancysvc_CreateTenancyFloorplanZoneCommand?: Maybe<TenancyFloorplanZoneCreated>;
  tenancysvc_CreateTenancyTodoCommand?: Maybe<TenancyTodoCreated>;
  tenancysvc_CreateTransactionMemberCommand?: Maybe<TransactionMemberCreated>;
  tenancysvc_DeleteTenancyCommand?: Maybe<TenancyDeleted>;
  tenancysvc_DeleteTenancyDocumentCommand?: Maybe<TenancyDocumentDeleted>;
  tenancysvc_DeleteTenancyFloorplanZoneCommand?: Maybe<TenancyFloorplanZoneDeleted>;
  tenancysvc_DeleteTenancyTodoCommand?: Maybe<TenancyTodoDeleted>;
  tenancysvc_DeleteTransactionMemberCommand?: Maybe<TransactionMemberDeleted>;
  tenancysvc_ExerciseBreakClauseCommand?: Maybe<BreakClauseExercised>;
  tenancysvc_RequestChangesOnTenancyTodoCommand?: Maybe<TenancyTodoChangesRequested>;
  tenancysvc_SendReminderForTenancyTodo?: Maybe<ReminderSentForTenancyTodo>;
  tenancysvc_SendWelcomeMessageCommand?: Maybe<SendWelcomeMessageCommand>;
  tenancysvc_SetAppHeaderUploadForTenancyCommand?: Maybe<AppHeaderUploadForTenancySet>;
  tenancysvc_SetTenancyGoogleDriveCommand?: Maybe<TenancyGoogleDriveSet>;
  tenancysvc_SetTenancyTaskCompletionMutation?: Maybe<TenancyTasksUpdated>;
  tenancysvc_SetTenancyWelcomePackCommand?: Maybe<TenancyWelcomePackSet>;
  tenancysvc_SetupTenancyForOnboardingCommand?: Maybe<TenancyUpdated>;
  tenancysvc_StartTenancyTodoCommand?: Maybe<TenancyTodoStarted>;
  tenancysvc_ToggleTenancyMoveInCategoryVisibilityCommand?: Maybe<TenancyMoveInCategoryVisibilityToggled>;
  tenancysvc_UncompleteTenancyTodoCommand?: Maybe<TenancyTodoUncompleted>;
  tenancysvc_UnstartTenancyTodoCommand?: Maybe<TenancyTodoUnstarted>;
  tenancysvc_UpdateTenancyCommand?: Maybe<TenancyUpdated>;
  tenancysvc_UpdateTenancyFloorplanZoneCommand?: Maybe<TenancyFloorplanZoneUpdated>;
  tenancysvc_UpdateTenancyMoveInDate?: Maybe<TenancyMoveInDateUpdated>;
  tenancysvc_UpdateTenancyTodoCommand?: Maybe<TenancyTodoUpdated>;
  tenancysvc_UpdateTimelineStageCompletionDate?: Maybe<TimelineStageCompletionDateUpdated>;
  tenancysvc_UpdateTimelineStateCommand?: Maybe<TimelineStateUpdated>;
  unitsvc_ArchiveUnitCommand?: Maybe<UnitArchived>;
  unitsvc_CreateUnitFloorNumberRowsCommand?: Maybe<UnitFloorNumberRowsCreated>;
  unitsvc_DeleteUnitCommand?: Maybe<UnitDeleted>;
  unitsvc_UnarchiveUnitCommand?: Maybe<UnitUnarchived>;
  unitsvc_UpdateSourcedUnitCommand?: Maybe<SourcedUnitUpdated>;
  uploadsvc_DeleteUploadCommand?: Maybe<UploadDeleted>;
  usersvc_AddUserToLeadTenantsGroupCommand?: Maybe<UserAddedToLeadTenantsGroup>;
  usersvc_ChangePassword?: Maybe<PasswordChanged>;
  usersvc_ChangeUserEmailCommand?: Maybe<UserEmailUpdated>;
  usersvc_ChangeUserPasswordCommand?: Maybe<UserPasswordChanged>;
  usersvc_CompleteOnboardingCommand?: Maybe<OnboadingCompleted>;
  usersvc_CreateUserCommand?: Maybe<UserCreated>;
  usersvc_DeleteUserCommand?: Maybe<UserDeleted>;
  usersvc_DeleteUsersInCompany?: Maybe<UsersDeletedInCompany>;
  usersvc_LogOutFromContextCommand?: Maybe<UserLoggedOut>;
  usersvc_LoginAsUserCommand?: Maybe<LoggedInAsUser>;
  usersvc_LoginCommand?: Maybe<UserLoggedIn>;
  usersvc_LogoutUserCommand?: Maybe<UserLoggedOut>;
  usersvc_OnboardUserCommand?: Maybe<UserOnboarded>;
  usersvc_OnboardUsersCommand?: Maybe<UsersOnboarded>;
  usersvc_RegisterUserForBrokerPlatformCommand?: Maybe<Usersvc_RegisterUserForBrokerPlatformCommandResponseUnion>;
  usersvc_RemoveUserFromLeadTenantsGroupCommand?: Maybe<UserRemovedFromLeadTenantsGroup>;
  usersvc_ResendOnboardingEmailCommand?: Maybe<OnboardingEmailResent>;
  usersvc_ResendVerificationEmailForBrokerPlatformCommand?: Maybe<VerificationEmailResentForBrokerPlatform>;
  usersvc_ResetPasswordCommand?: Maybe<PasswordReset>;
  usersvc_RevokeLoginForUser?: Maybe<LoginRevokedForUser>;
  usersvc_SignUpCommand?: Maybe<UserSignedUp>;
  usersvc_StartAccountRecoveryCommand?: Maybe<AccountRecoveryStarted>;
  usersvc_VerifyEmailForBrokerPlatformCommand?: Maybe<OnboadingCompleted>;
  visitsvc_CreateVisitCommand?: Maybe<VisitCreated>;
  visitsvc_DeleteVisitCommand?: Maybe<VisitDeleted>;
  visitsvc_RemindLeadTenants?: Maybe<ReminderSent>;
  visitsvc_UpdateVisitCommand?: Maybe<VisitUpdated>;
};


export type MutationAccesssvc_ConfigureAccessCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationAccesssvc_CreateAccessCommandArgs = {
  access?: InputMaybe<AccessInput>;
};


export type MutationAccesssvc_CreateTemporaryPinCommandArgs = {
  accessId: Scalars['String']['input'];
  email: Scalars['String']['input'];
  from?: InputMaybe<TimestampInput>;
  to?: InputMaybe<TimestampInput>;
  userId: Scalars['String']['input'];
};


export type MutationAccesssvc_DeleteAccessCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationAccesssvc_OpenDoorCommandArgs = {
  accessId: Scalars['String']['input'];
};


export type MutationAccesssvc_RotateCodeCommandArgs = {
  subjectId: Scalars['String']['input'];
};


export type MutationAccesssvc_UpdateAccessNameCommandArgs = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationAccesssvc_UpdateNetworkConfigCommandArgs = {
  access?: InputMaybe<AccessInput>;
};


export type MutationAddonsvc_CreateAddonCommandArgs = {
  addon?: InputMaybe<AddonInput>;
};


export type MutationAddonsvc_CreatePurchaseCommandArgs = {
  purchase?: InputMaybe<PurchaseInput>;
};


export type MutationAddonsvc_DeleteAddonCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationAddonsvc_DeletePurchaseCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationAddonsvc_UpdateAddonCommandArgs = {
  addon?: InputMaybe<AddonInput>;
};


export type MutationAddonsvc_UpdatePurchaseCommandArgs = {
  purchase?: InputMaybe<PurchaseInput>;
};


export type MutationBookingsvc_ApproveFloorplanArgs = {
  floorplanId: Scalars['String']['input'];
};


export type MutationBookingsvc_AssignUserToDeskCommandArgs = {
  deskId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationBookingsvc_BatchSetAttendanceCommandArgs = {
  dates?: InputMaybe<Array<DateInput>>;
};


export type MutationBookingsvc_CreateAttendanceCommandArgs = {
  date?: InputMaybe<DateInput>;
};


export type MutationBookingsvc_CreateBookingArgs = {
  attendeeEmailAddresses?: InputMaybe<Array<Scalars['String']['input']>>;
  end?: InputMaybe<DateTimeInput>;
  entityId: Scalars['String']['input'];
  entityType?: InputMaybe<BookableEntity>;
  id?: InputMaybe<Scalars['String']['input']>;
  start?: InputMaybe<DateTimeInput>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationBookingsvc_CreateRoomArgs = {
  amenityIds: Array<Scalars['String']['input']>;
  capacity: Scalars['Int']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price: Scalars['String']['input'];
  shared: Scalars['Boolean']['input'];
};


export type MutationBookingsvc_DeleteAmenityArgs = {
  id: Scalars['String']['input'];
};


export type MutationBookingsvc_DeleteAttendanceCommandArgs = {
  date?: InputMaybe<DateInput>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationBookingsvc_DeleteBookingArgs = {
  id: Scalars['String']['input'];
};


export type MutationBookingsvc_DeleteFloorplanArgs = {
  id: Scalars['String']['input'];
};


export type MutationBookingsvc_EnquireAboutDeskBookingArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationBookingsvc_GenerateFloorplansArgs = {
  name: Scalars['String']['input'];
  optimise?: InputMaybe<Scalars['Boolean']['input']>;
  quality?: InputMaybe<Scalars['Float']['input']>;
  src: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationBookingsvc_IngestFloorplanArgs = {
  json: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  tenancyId: Scalars['String']['input'];
};


export type MutationBookingsvc_SaveAmenityArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  entityIds: Array<Scalars['String']['input']>;
  entityType?: InputMaybe<BookableEntity>;
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationBookingsvc_SetCapacityCommandArgs = {
  capacity: Scalars['Int']['input'];
  companyId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationBookingsvc_SetDesksOnTeamCommandArgs = {
  deskIds: Array<Scalars['String']['input']>;
  teamId: Scalars['String']['input'];
};


export type MutationBookingsvc_SetTeamsOnDeskCommandArgs = {
  deskId: Scalars['String']['input'];
  teamIds: Array<Scalars['String']['input']>;
};


export type MutationBookingsvc_UpdateDeskArgs = {
  amenityIds: Array<Scalars['String']['input']>;
  floorplanId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationBookingsvc_UpdateFloorplanArgs = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationBookingsvc_UpdateFloorplanZoneArgs = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationBookingsvc_UpdateRoomArgs = {
  amenityIds: Array<Scalars['String']['input']>;
  capacity: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price: Scalars['String']['input'];
  shared: Scalars['Boolean']['input'];
};


export type MutationBrochuresvc_CloneTemplateCommandArgs = {
  brochureId: Scalars['String']['input'];
};


export type MutationBrochuresvc_CreateBrochureCommandArgs = {
  entities?: InputMaybe<Array<BrochureEntityInput>>;
  id?: InputMaybe<Scalars['String']['input']>;
  stateJson: Scalars['String']['input'];
  templateForEntityId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationBrochuresvc_DeleteBrochureCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationBrochuresvc_UpdateBrochureCommandArgs = {
  entities?: InputMaybe<Array<BrochureEntityInput>>;
  id: Scalars['String']['input'];
  stateJson?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChatsvc_CreateChatCommandArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ChatType>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChatsvc_CreateChatMemberCommandArgs = {
  chatId: Scalars['String']['input'];
  message?: InputMaybe<CreateChatMessageCommandInput>;
  noNotification?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['String']['input'];
};


export type MutationChatsvc_CreateChatMessageCommandArgs = {
  associatedEntityId?: InputMaybe<Scalars['String']['input']>;
  chatId: Scalars['String']['input'];
  editedFromMessageId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  issueId?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  messageHtml?: InputMaybe<Scalars['String']['input']>;
  notify?: InputMaybe<Scalars['Boolean']['input']>;
  parentMessageId?: InputMaybe<Scalars['String']['input']>;
  taggedUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<MessageType>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChatsvc_DeleteChatCommandArgs = {
  chatId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChatsvc_DeleteChatMemberCommandArgs = {
  chatId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationChatsvc_DeleteChatMessageActionArgs = {
  messageId: Scalars['String']['input'];
};


export type MutationChatsvc_MarkChatAsReadActionArgs = {
  chatId: Scalars['String']['input'];
};


export type MutationChatsvc_MarkMessagesAsReadCommandArgs = {
  chatMessageIds: Array<Scalars['String']['input']>;
};


export type MutationChatsvc_UpdateChatMessageArgs = {
  newMessageId: Scalars['String']['input'];
  oldMessageId: Scalars['String']['input'];
  updatedMessage?: InputMaybe<CreateChatMessageCommandInput>;
};


export type MutationCompanysvc_CreateAgencyDomainAndCompanyCommandArgs = {
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};


export type MutationCompanysvc_CreateCompanyCommandArgs = {
  address?: InputMaybe<Scalars['String']['input']>;
  companyNumber?: InputMaybe<Scalars['String']['input']>;
  contractorCompany?: InputMaybe<ContractorCompanyInput>;
  landlordFinancials?: InputMaybe<LandlordFinancialsInput>;
  logoUploadId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  primaryColorHex?: InputMaybe<Scalars['String']['input']>;
  secondaryColorHex?: InputMaybe<Scalars['String']['input']>;
  tenantCompany?: InputMaybe<TenantCompanyInput>;
  type?: InputMaybe<OptionalCompanyTypeInput>;
};


export type MutationCompanysvc_CreateCompanyTeamsCommandArgs = {
  companyId: Scalars['String']['input'];
  companyTeams: Array<Scalars['String']['input']>;
};


export type MutationCompanysvc_DeleteCompanyCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationCompanysvc_DeleteCompanyTeamCommandArgs = {
  companyTeamId: Scalars['String']['input'];
};


export type MutationCompanysvc_MergeCompaniesArgs = {
  fromId: Scalars['String']['input'];
  toId: Scalars['String']['input'];
  updates?: InputMaybe<UpdateCompanyCommandInput>;
};


export type MutationCompanysvc_SaveCompanyCultureCommandArgs = {
  companyId: Scalars['String']['input'];
  data?: InputMaybe<CompanyCultureDataInputInput>;
};


export type MutationCompanysvc_SaveHybridWorkInformationCommandArgs = {
  inputs?: InputMaybe<Array<PolicyInputInput>>;
};


export type MutationCompanysvc_SetCompanyIndustriesCommandArgs = {
  companyId: Scalars['String']['input'];
  industryIds: Array<Scalars['String']['input']>;
};


export type MutationCompanysvc_SetCompanyIngressesCommandArgs = {
  companyIngresses?: InputMaybe<Array<CompanyIngressInput>>;
};


export type MutationCompanysvc_UpdateCompanyCommandArgs = {
  accountManagerUserId?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<Scalars['String']['input']>;
  clientServicesManagerUserId?: InputMaybe<Scalars['String']['input']>;
  clientSupportSpecialistUserId?: InputMaybe<Scalars['String']['input']>;
  companyNumber?: InputMaybe<Scalars['String']['input']>;
  contractorCompany?: InputMaybe<ContractorCompanyInput>;
  id: Scalars['String']['input'];
  landlordFinancials?: InputMaybe<LandlordFinancialsInput>;
  logoUploadId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryColorHex?: InputMaybe<Scalars['String']['input']>;
  researchNotes?: InputMaybe<Scalars['String']['input']>;
  secondaryColorHex?: InputMaybe<Scalars['String']['input']>;
  tenantCompany?: InputMaybe<TenantCompanyInput>;
  type?: InputMaybe<OptionalCompanyTypeInput>;
};


export type MutationCompanysvc_UpdateCompanyTeamCommandArgs = {
  companyTeam?: InputMaybe<CompanyTeamInput>;
};


export type MutationCompanysvc_UpdateOwnCompanyArgs = {
  id: Scalars['String']['input'];
  logoUploadId?: InputMaybe<Scalars['String']['input']>;
  primaryColorHex?: InputMaybe<Scalars['String']['input']>;
  secondaryColorHex?: InputMaybe<Scalars['String']['input']>;
};


export type MutationConfiguratorsvc_CreateConfiguratorSessionArgs = {
  dealId: Scalars['String']['input'];
  desks?: InputMaybe<Scalars['Int']['input']>;
  floorplanDocumentId?: InputMaybe<Scalars['String']['input']>;
  floorplanDrawing?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  lookAndFeelDocumentId?: InputMaybe<Scalars['String']['input']>;
  markupJson?: InputMaybe<Scalars['String']['input']>;
  meetingRooms?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pdfSummaryUploadId?: InputMaybe<Scalars['String']['input']>;
  unitId: Scalars['String']['input'];
};


export type MutationConfiguratorsvc_UpdateConfigurationSessionArgs = {
  dealId?: InputMaybe<Scalars['String']['input']>;
  desks?: InputMaybe<Scalars['Int']['input']>;
  floorplanDocumentId?: InputMaybe<Scalars['String']['input']>;
  floorplanDrawing?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  lookAndFeelDocumentId?: InputMaybe<Scalars['String']['input']>;
  markupJson?: InputMaybe<Scalars['String']['input']>;
  meetingRooms?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pdfSummaryUploadId?: InputMaybe<Scalars['String']['input']>;
  unitId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDealsvc_AddSelectionsCommandArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  selections?: InputMaybe<Array<SelectionInput>>;
  shortlistId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDealsvc_AddShortlistsToDealCommandArgs = {
  dealId: Scalars['String']['input'];
  shortlistIds: Array<Scalars['String']['input']>;
};


export type MutationDealsvc_ApproveShortlistCommandArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  shortlistId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDealsvc_AssignSalesTeamToBrokerCompanyCommandArgs = {
  brokerCompanyId: Scalars['String']['input'];
  salesTeamId: Scalars['String']['input'];
};


export type MutationDealsvc_CreateActivityCommandArgs = {
  activity?: InputMaybe<ActivityInput>;
};


export type MutationDealsvc_CreateBrokerEnquiryCommandArgs = {
  brokerSearchId: Scalars['String']['input'];
  unitGroup?: InputMaybe<SelectionInput>;
};


export type MutationDealsvc_CreateBrokerSearchCommandArgs = {
  dealId?: InputMaybe<Scalars['String']['input']>;
  desiredLocation?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  kittChoicesOnly?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  requirements?: InputMaybe<DealRequirementsInput>;
  unitGroups?: InputMaybe<Array<SelectionInput>>;
};


export type MutationDealsvc_CreateDealCommandArgs = {
  deal?: InputMaybe<DealInput>;
  note?: InputMaybe<NoteInput>;
};


export type MutationDealsvc_CreateDealSpaceMatchCommandArgs = {
  dealId: Scalars['String']['input'];
  desiredTerm?: InputMaybe<Scalars['Int']['input']>;
  overriddenPrice: Scalars['Int']['input'];
  unitIds: Array<Scalars['String']['input']>;
};


export type MutationDealsvc_CreateDismissedRecommendationsCommandArgs = {
  brokerSearchId: Scalars['String']['input'];
  selections?: InputMaybe<Array<SelectionInput>>;
};


export type MutationDealsvc_CreateNoteOnDealCommandArgs = {
  note?: InputMaybe<NoteInput>;
};


export type MutationDealsvc_CreateSelectionFeedbacksCommandArgs = {
  feedbacks?: InputMaybe<Array<SelectionFeedbackInput>>;
};


export type MutationDealsvc_CreateShortlistCommandArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationDealsvc_CreateShortlistViewingRequestsCommandArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  company: Scalars['String']['input'];
  notes: Scalars['String']['input'];
  shortlistId?: InputMaybe<Scalars['String']['input']>;
  viewingRequests?: InputMaybe<Array<ViewingRequestInput>>;
};


export type MutationDealsvc_CreateViewingRequestCommandArgs = {
  viewingRequest?: InputMaybe<ShortlistViewingRequestInput>;
};


export type MutationDealsvc_DeleteActivityCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationDealsvc_DeleteBrokerSearchCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationDealsvc_DeleteDealCommandArgs = {
  id: Scalars['String']['input'];
  lostReason: Scalars['String']['input'];
};


export type MutationDealsvc_DeleteDealSpaceMatchCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationDealsvc_DeleteNoteOnDealCommandArgs = {
  dealId: Scalars['String']['input'];
  noteId: Scalars['String']['input'];
};


export type MutationDealsvc_DeleteShortlistCommandArgs = {
  archive?: InputMaybe<Scalars['Boolean']['input']>;
  shortlistId: Scalars['String']['input'];
};


export type MutationDealsvc_MergeDealsCommandArgs = {
  deal?: InputMaybe<DealInput>;
  fromId: Scalars['String']['input'];
  toId: Scalars['String']['input'];
};


export type MutationDealsvc_RemoveSelectionsCommandArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  selections?: InputMaybe<Array<SelectionInput>>;
  shortlistId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDealsvc_RemoveShortlistsFromDealCommandArgs = {
  dealId: Scalars['String']['input'];
  shortlistIds: Array<Scalars['String']['input']>;
};


export type MutationDealsvc_RequestAddShortlistToValveCommandArgs = {
  brokerSearchId: Scalars['String']['input'];
};


export type MutationDealsvc_RestoreShortlistCommandArgs = {
  shortlistId: Scalars['String']['input'];
};


export type MutationDealsvc_SaveSearchRequirementsCommandArgs = {
  requirements?: InputMaybe<SearchRequirementsInput>;
};


export type MutationDealsvc_ShareShortlistWithCurrentUserCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationDealsvc_UpdateActivityCommandArgs = {
  activity?: InputMaybe<ActivityInput>;
  completed?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDealsvc_UpdateBrokerSearchCommandArgs = {
  clientName?: InputMaybe<Scalars['String']['input']>;
  desiredLocation?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  kittChoicesOnly?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  requirements?: InputMaybe<DealRequirementsInput>;
};


export type MutationDealsvc_UpdateBrokerSearchPolygonCommandArgs = {
  brokerSearchId: Scalars['String']['input'];
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
};


export type MutationDealsvc_UpdateDealCommandArgs = {
  deal?: InputMaybe<DealInput>;
  note?: InputMaybe<NoteInput>;
};


export type MutationDealsvc_UpdateDealSpaceMatchCommandArgs = {
  id: Scalars['String']['input'];
  orderIndex?: InputMaybe<Scalars['String']['input']>;
  salesBlurb?: InputMaybe<Scalars['String']['input']>;
  starred?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDealsvc_UpdateNoteOnDealCommandArgs = {
  note?: InputMaybe<NoteInput>;
};


export type MutationDealsvc_UpdateSelectionsCommandArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  selections?: InputMaybe<Array<SelectionInput>>;
  shortlistId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDealsvc_UpdateShortlistCommandArgs = {
  clientName?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  shortlistId: Scalars['String']['input'];
};


export type MutationDeploymentsvc_DeployPreviewCommandArgs = {
  branch: Scalars['String']['input'];
};


export type MutationDocumentsvc_CreateDocumentCommandArgs = {
  metadata?: InputMaybe<Array<MetadataInput>>;
  typeId: Scalars['String']['input'];
  uploadId: Scalars['String']['input'];
};


export type MutationEnquirysvc_CreateEnquiryCommandArgs = {
  data?: InputMaybe<EnquiryMutableDataInput>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnquirysvc_CreateQuoteCommandArgs = {
  data?: InputMaybe<QuoteMutableDataInput>;
  enquiryId: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnquirysvc_DeleteEnquiryCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationEnquirysvc_DeleteQuoteCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationEnquirysvc_DuplicateQuoteCommandArgs = {
  id: Scalars['String']['input'];
  newId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnquirysvc_UpdateEnquiryCommandArgs = {
  data?: InputMaybe<EnquiryMutableDataInput>;
  id: Scalars['String']['input'];
};


export type MutationEnquirysvc_UpdateQuoteCommandArgs = {
  data?: InputMaybe<QuoteMutableDataInput>;
  id: Scalars['String']['input'];
};


export type MutationFavouritesvc_AddFavouriteArgs = {
  productId: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationFavouritesvc_RemoveFavouriteArgs = {
  productId: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationFeedbacksvc_CreateFeedbackCommandArgs = {
  additionalInfoJson?: InputMaybe<Scalars['String']['input']>;
  app?: InputMaybe<App>;
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<FeedbackEntityType>;
  id?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  rating?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationFeedbacksvc_MarkFeaturesAsReadCommandArgs = {
  features?: InputMaybe<Array<TenantAppFeature>>;
};


export type MutationGmailsvc_ListenForEmailsCommandArgs = {
  userId: Scalars['String']['input'];
};


export type MutationGmailsvc_SendEmailCommandArgs = {
  bccAddresses?: InputMaybe<Array<Scalars['String']['input']>>;
  ccAddresses?: InputMaybe<Array<Scalars['String']['input']>>;
  fromAddress: Scalars['String']['input'];
  fromName: Scalars['String']['input'];
  gmailThreadId?: InputMaybe<Scalars['String']['input']>;
  htmlMessage: Scalars['String']['input'];
  metadata?: InputMaybe<Array<EmailMetadataInput>>;
  replyToEmailId?: InputMaybe<Scalars['String']['input']>;
  subject: Scalars['String']['input'];
  threadId?: InputMaybe<Scalars['String']['input']>;
  toAddresses: Array<Scalars['String']['input']>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationGuestsvc_DeleteGuestCommandArgs = {
  guestId: Scalars['String']['input'];
};


export type MutationGuestsvc_GuestArrivedCommandArgs = {
  accessId?: InputMaybe<Scalars['String']['input']>;
  guestId: Scalars['String']['input'];
};


export type MutationGuestsvc_OpenDoorForGuestCommandArgs = {
  accessId: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationGuestsvc_RegisterGuestCommandArgs = {
  accessIds?: InputMaybe<Array<Scalars['String']['input']>>;
  date?: InputMaybe<TimestampInput>;
  dateUtc?: InputMaybe<DateTimeInput>;
  email: Scalars['String']['input'];
  expiryDate?: InputMaybe<TimestampInput>;
  expiryDateUtc?: InputMaybe<DateTimeInput>;
  guestId?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  requesterCompanyId?: InputMaybe<Scalars['String']['input']>;
  requesterId: Scalars['String']['input'];
};


export type MutationGuestsvc_ResendGuestDayPassArgs = {
  guestId: Scalars['String']['input'];
};


export type MutationIamsvc_AddSubjectToGroupArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<TimestampInput>;
  groupId: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<TimestampInput>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationIamsvc_ArchivePermissionCommandArgs = {
  permissionId: Scalars['String']['input'];
  subject?: InputMaybe<Subject>;
};


export type MutationIamsvc_CreatePermissionCommandArgs = {
  resource?: InputMaybe<Resource>;
  resourceId: Scalars['String']['input'];
  subject?: InputMaybe<Subject>;
  subjectId: Scalars['String']['input'];
};


export type MutationIamsvc_RemoveSubjectFromGroupArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  groupId: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationInsightsvc_GetAccessesFullLoadArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationIssuesvc_ArchiveIssueActionArgs = {
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_AttachUploadToIssueActionArgs = {
  issueId: Scalars['String']['input'];
  uploadId: Scalars['String']['input'];
};


export type MutationIssuesvc_ClearIssueUploadsArgs = {
  issueId: Scalars['String']['input'];
};


export type MutationIssuesvc_CloseIssueCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_CreateIssueActionArgs = {
  data?: InputMaybe<IssueMutableDataInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  updates?: InputMaybe<Array<IssueUpdateInput>>;
};


export type MutationIssuesvc_CreateIssueUpdateCommandArgs = {
  dueDate?: InputMaybe<TimestampInput>;
  issueId: Scalars['String']['input'];
  ownerUserId?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationIssuesvc_DeleteIssueActionArgs = {
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_DeleteIssueUpdateCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_DeleteIssueUploadActionArgs = {
  issueId: Scalars['String']['input'];
  uploadId: Scalars['String']['input'];
};


export type MutationIssuesvc_MigrateVisitsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationIssuesvc_ReOpenIssueActionArgs = {
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_RemindLeadTenantsAboutIssueArgs = {
  issueId: Scalars['String']['input'];
};


export type MutationIssuesvc_SendSummaryEmailArgs = {
  companyId: Scalars['String']['input'];
  toUserIds: Array<Scalars['String']['input']>;
};


export type MutationIssuesvc_UpdateIssueActionArgs = {
  data?: InputMaybe<IssueMutableDataInput>;
  id: Scalars['String']['input'];
};


export type MutationIssuesvc_UpdateIssueUpdateCommandArgs = {
  dueDate?: InputMaybe<TimestampInput>;
  id: Scalars['String']['input'];
  ownerUserId?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationLocationsvc_ArchiveLocationCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationLocationsvc_CreateBuildingTraitCommandArgs = {
  iconId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type?: InputMaybe<BuildingTraitType>;
  uploadId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLocationsvc_CreateLocationCommandArgs = {
  address?: InputMaybe<AddressInput>;
  areaId?: InputMaybe<Scalars['String']['input']>;
  coordinates?: InputMaybe<CoordinateInput>;
  data?: InputMaybe<LocationMutableDataInput>;
  financialData?: InputMaybe<LocationMutableFinancialModelInput>;
  financialModel?: InputMaybe<LocationFinancialModelMutationInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  landlordCompanyId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  owningCompany?: InputMaybe<Scalars['String']['input']>;
  owningCompanyNumber?: InputMaybe<Scalars['String']['input']>;
  primaryAccessMethod?: InputMaybe<Scalars['String']['input']>;
  published?: InputMaybe<Scalars['Boolean']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  spacePartnerId?: InputMaybe<Scalars['String']['input']>;
  sqFt?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLocationsvc_CreateLocationFacilityCommandArgs = {
  iconUploadId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  rank?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationLocationsvc_CreateLocationSellingPointArgs = {
  iconUploadId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationLocationsvc_CreateScrapedLocationsCommandArgs = {
  locations?: InputMaybe<Array<ScrapedLocationInput>>;
};


export type MutationLocationsvc_DeleteLocationCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationLocationsvc_DeleteLocationSellingPointArgs = {
  sellingPointId: Scalars['String']['input'];
};


export type MutationLocationsvc_DiscardSourcedLocationCommandArgs = {
  locationId: Scalars['String']['input'];
};


export type MutationLocationsvc_DisqualifyLocationArgs = {
  id: Scalars['String']['input'];
};


export type MutationLocationsvc_EditLocationCommandArgs = {
  editLocation?: InputMaybe<EditLocationInput>;
  editUnits?: InputMaybe<Array<EditUnitInput>>;
};


export type MutationLocationsvc_LockLocationForVerificationCommandArgs = {
  locationId: Scalars['String']['input'];
};


export type MutationLocationsvc_MergeBuildingsCommandArgs = {
  mergeFromIds: Array<Scalars['String']['input']>;
  mergeIntoId: Scalars['String']['input'];
};


export type MutationLocationsvc_MergeLocationsCommandArgs = {
  editUnits?: InputMaybe<Array<EditUnitInput>>;
  fromId: Scalars['String']['input'];
  mergeLocation?: InputMaybe<MergeLocationInput>;
  toId: Scalars['String']['input'];
};


export type MutationLocationsvc_MergeVerifyLocationsCommandArgs = {
  locationIdFrom: Scalars['String']['input'];
  locationIdTo: Scalars['String']['input'];
  verifyUnits?: InputMaybe<Array<VerifyUnitInput>>;
};


export type MutationLocationsvc_QualifyLocationCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationLocationsvc_RestoreBuildingUnitCommandArgs = {
  unitId: Scalars['String']['input'];
};


export type MutationLocationsvc_SaveBuildingCommandArgs = {
  building?: InputMaybe<BuildingInputInput>;
  units?: InputMaybe<Array<BuildingUnitInputInput>>;
};


export type MutationLocationsvc_SubmitBuildingCommandArgs = {
  url: Scalars['String']['input'];
};


export type MutationLocationsvc_UnarchiveLocationCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationLocationsvc_UnlockLocationForVerificationCommandArgs = {
  locationId: Scalars['String']['input'];
};


export type MutationLocationsvc_UpdateAgenciesForLocationCommandArgs = {
  agencyCompanyIds: Array<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
};


export type MutationLocationsvc_UpdateLocationNameCommandArgs = {
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationLocationsvc_UpdateLocationStatusesCommandArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLocationsvc_UpdateSourcedLocationCommandArgs = {
  accessNotes?: InputMaybe<Scalars['String']['input']>;
  agentProfileIds?: InputMaybe<Array<Scalars['String']['input']>>;
  agentSetUp?: InputMaybe<AgentSetUpOptionalInput>;
  buildingInsuranceRenewalDate?: InputMaybe<TimestampInput>;
  displayOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  googleDriveFileLink?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  isRiskWarning?: InputMaybe<Scalars['Boolean']['input']>;
  landlordCoversEntireFitout?: InputMaybe<Scalars['Boolean']['input']>;
  landlordProfileId?: InputMaybe<Scalars['String']['input']>;
  locationAgencies?: InputMaybe<Array<LocationAgencyInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  primaryAccessMethod?: InputMaybe<Scalars['String']['input']>;
  primaryAccessMethodType?: InputMaybe<AccessMethodOptionalInput>;
  sellingPointIds?: InputMaybe<Array<Scalars['String']['input']>>;
  serviceChargeYearEnd?: InputMaybe<TimestampInput>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  utilitiesRechargedFromLandlord?: InputMaybe<Scalars['Boolean']['input']>;
  virtualTourLinks?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLocationsvc_VerifyLocationCommandArgs = {
  verifyLocation?: InputMaybe<VerifyLocationInput>;
  verifyUnits?: InputMaybe<Array<VerifyUnitInput>>;
};


export type MutationNotificationsvc_DeleteUserPushTokenCommandArgs = {
  deviceId: Scalars['String']['input'];
};


export type MutationNotificationsvc_MarkNotificationAsReadArgs = {
  notificationIds: Array<Scalars['String']['input']>;
};


export type MutationNotificationsvc_NotifyAboutTenancyCommandArgs = {
  dealId?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  notifyBroker?: InputMaybe<Scalars['Boolean']['input']>;
  tenancyId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationNotificationsvc_SaveUserPushTokenCommandArgs = {
  deviceId: Scalars['String']['input'];
  token: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationNotificationsvc_SendChatPulseArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationNotificationsvc_SendEmailActionArgs = {
  body?: InputMaybe<EmailBodyInput>;
  emails: Array<Scalars['String']['input']>;
  from: Scalars['String']['input'];
  subject: Scalars['String']['input'];
  userIds: Array<Scalars['String']['input']>;
};


export type MutationNotificationsvc_SendKitchenSinkCommandArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationNotificationsvc_SendNewEnquiryNotificationCommandArgs = {
  email: Scalars['String']['input'];
  message: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};


export type MutationNotificationsvc_SendNotificationToAllUsersCommandArgs = {
  message: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationNotificationsvc_SendTenancyPulseArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationNotificationsvc_SetCommunicationPreferenceArgs = {
  communicationClass: Scalars['String']['input'];
  frequency?: InputMaybe<CommunicationFrequency>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationNotificationsvc_SetCommunicationPreferenceForAllEmployeesOfCompanyArgs = {
  communicationClass: Scalars['String']['input'];
  companyId?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<CommunicationFrequency>;
};


export type MutationNotificationsvc_TenantAppFeedbackSubmissionArgs = {
  feedback: Scalars['String']['input'];
  score: Scalars['Int']['input'];
};


export type MutationOrdersvc_CreateLineItemPauseCommandArgs = {
  dateRange?: InputMaybe<DateRangeInput>;
  lineItemId: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};


export type MutationOrdersvc_CreateMsaArgs = {
  msas?: InputMaybe<Array<MsaInputInput>>;
  tenancyId: Scalars['String']['input'];
};


export type MutationOrdersvc_DeleteLineItemPauseCommandArgs = {
  lineItemPauseId: Scalars['String']['input'];
};


export type MutationOrdersvc_SaveOrderNotesArgs = {
  categoryId: Scalars['String']['input'];
  notes: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationOrdersvc_SaveOrdersCommandArgs = {
  orders?: InputMaybe<Array<OrderInputInput>>;
  tenancyId: Scalars['String']['input'];
};


export type MutationProductsvc_ArchiveProductCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationProductsvc_CreateProductCommandArgs = {
  advertisedPricePennies: Scalars['Int']['input'];
  displayOnWebsite: Scalars['Boolean']['input'];
  facilities: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  terms?: InputMaybe<Array<ProductTermInputInput>>;
  units: Array<Scalars['String']['input']>;
};


export type MutationProductsvc_DeleteProductCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationProductsvc_UnarchiveProductCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationProductsvc_UpdateProductCommandArgs = {
  advertisedPricePennies?: InputMaybe<Scalars['Int']['input']>;
  displayOnWebsite: Scalars['Boolean']['input'];
  facilities?: InputMaybe<Array<Scalars['String']['input']>>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  terms?: InputMaybe<Array<ProductTermInputInput>>;
  units: Array<Scalars['String']['input']>;
};


export type MutationProfilesvc_CreateProfileCommandArgs = {
  addresses?: InputMaybe<Array<ProfileAddressInput>>;
  birthday?: InputMaybe<DateInput>;
  companyId: Scalars['String']['input'];
  companyTeamId?: InputMaybe<Scalars['String']['input']>;
  emails: Array<Scalars['String']['input']>;
  hideBirthday?: InputMaybe<Scalars['Boolean']['input']>;
  img: Scalars['String']['input'];
  jobTitle: Scalars['String']['input'];
  linkedInUrl: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phoneNumbers: Array<Scalars['String']['input']>;
  profilePhotoUploadId: Scalars['String']['input'];
  tags: Array<Scalars['String']['input']>;
  userId: Scalars['String']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};


export type MutationProfilesvc_DeleteProfileCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationProfilesvc_UpdateProfileCommandArgs = {
  addresses?: InputMaybe<Array<ProfileAddressInput>>;
  birthday?: InputMaybe<DateInput>;
  companyId?: InputMaybe<Scalars['String']['input']>;
  companyTeamId?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  hideBirthday?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  img?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  linkedInUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumbers?: InputMaybe<Array<Scalars['String']['input']>>;
  profilePhotoUploadId?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  userId?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRequestsvc_CreateRequestCommandArgs = {
  categoryId: Scalars['String']['input'];
  chatIds: Array<Scalars['String']['input']>;
  detail: Scalars['String']['input'];
  fileIds: Array<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  priority: Scalars['String']['input'];
  summary: Scalars['String']['input'];
  techRequest?: InputMaybe<Scalars['Boolean']['input']>;
  unitId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationRequestsvc_UpdateRequestCommandArgs = {
  assigneeId: Scalars['String']['input'];
  categoryId: Scalars['String']['input'];
  chatIds: Array<Scalars['String']['input']>;
  contractor: Scalars['String']['input'];
  cost: Scalars['String']['input'];
  details: Scalars['String']['input'];
  dueDate: Scalars['String']['input'];
  id: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  priority: Scalars['String']['input'];
  status: Scalars['String']['input'];
  summary: Scalars['String']['input'];
  techRequest?: InputMaybe<Scalars['Boolean']['input']>;
  unitId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationRoomsvc_CancelBookingCommandArgs = {
  bookingId: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRoomsvc_CreateBookingCommandArgs = {
  bookedById?: InputMaybe<Scalars['String']['input']>;
  dateTime?: InputMaybe<BookingTimeInputInput>;
  email?: InputMaybe<Scalars['String']['input']>;
  minutes: Scalars['Int']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  roomId: Scalars['String']['input'];
  start?: InputMaybe<TimestampInput>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRoomsvc_CreateRoomActionArgs = {
  description: Scalars['String']['input'];
  imageUploadId: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  numberOfPeople: Scalars['Int']['input'];
  timezone: Scalars['String']['input'];
};


export type MutationRoomsvc_DeleteRoomActionArgs = {
  id: Scalars['String']['input'];
};


export type MutationRoomsvc_RecoverRoomActionArgs = {
  id: Scalars['String']['input'];
};


export type MutationRoomsvc_UpdateRoomActionArgs = {
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  imageUploadId: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  numberOfPeople: Scalars['Int']['input'];
  timezone: Scalars['String']['input'];
};


export type MutationSchedulersvc_ActivateScheduleCommandArgs = {
  scheduleId: Scalars['String']['input'];
};


export type MutationSchedulersvc_CreateScheduleCommandArgs = {
  cron: Scalars['String']['input'];
  modelId: Scalars['String']['input'];
  scheduleType?: InputMaybe<ScheduleType>;
  timezone: Scalars['String']['input'];
  type: Scalars['String']['input'];
};


export type MutationSchedulersvc_DeactivateScheduleCommandArgs = {
  scheduleId: Scalars['String']['input'];
};


export type MutationSchedulersvc_DeleteScheduleCommandArgs = {
  scheduleId: Scalars['String']['input'];
};


export type MutationScrapersvc_StartScrapeCommandArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationSearchsvc_RebuildIndexArgs = {
  index: Scalars['String']['input'];
};


export type MutationTenancysvc_AddDocumentToTenancyArgs = {
  documentId: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_CompleteTenancyTodoCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_CreateTenancyCommandArgs = {
  breakClauses?: InputMaybe<Array<BreakClauseInput>>;
  companyId: Scalars['String']['input'];
  dealId?: InputMaybe<Scalars['String']['input']>;
  documentIds: Array<Scalars['String']['input']>;
  end?: InputMaybe<DateInput>;
  endDate?: InputMaybe<TimestampInput>;
  excludeFromReporting?: InputMaybe<Scalars['Boolean']['input']>;
  financialModel?: InputMaybe<TenancyFinancialModelMutationInput>;
  renewalType?: InputMaybe<RenewalType>;
  rollingConditions?: InputMaybe<Array<RollingConditionInput>>;
  start?: InputMaybe<DateInput>;
  startDate?: InputMaybe<TimestampInput>;
  status?: InputMaybe<TenancyStatus>;
  term?: InputMaybe<Array<PaymentInput>>;
  transactionMemberUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  unitIds: Array<Scalars['String']['input']>;
};


export type MutationTenancysvc_CreateTenancyFloorplanZoneCommandArgs = {
  floorplanId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  radius: Scalars['Int']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
};


export type MutationTenancysvc_CreateTenancyTodoCommandArgs = {
  assigneeCompanyId: Scalars['String']['input'];
  category?: InputMaybe<TaskCategory>;
  description: Scalars['String']['input'];
  dueDate?: InputMaybe<TimestampInput>;
  floorplanZoneId?: InputMaybe<Scalars['String']['input']>;
  requiresApproval: Scalars['Boolean']['input'];
  tenancyId: Scalars['String']['input'];
  title: Scalars['String']['input'];
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationTenancysvc_CreateTransactionMemberCommandArgs = {
  tenancyId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationTenancysvc_DeleteTenancyCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_DeleteTenancyDocumentCommandArgs = {
  documentId: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_DeleteTenancyFloorplanZoneCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_DeleteTenancyTodoCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_DeleteTransactionMemberCommandArgs = {
  tenancyId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationTenancysvc_ExerciseBreakClauseCommandArgs = {
  breakClauseId: Scalars['String']['input'];
  exercisedAt?: InputMaybe<DateInput>;
};


export type MutationTenancysvc_RequestChangesOnTenancyTodoCommandArgs = {
  parentMessageId: Scalars['String']['input'];
  text: Scalars['String']['input'];
  todoId: Scalars['String']['input'];
};


export type MutationTenancysvc_SendReminderForTenancyTodoArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_SendWelcomeMessageCommandArgs = {
  category?: InputMaybe<TaskCategory>;
  message?: InputMaybe<Scalars['String']['input']>;
  receiverIds?: InputMaybe<Array<Scalars['String']['input']>>;
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_SetAppHeaderUploadForTenancyCommandArgs = {
  tenancyId: Scalars['String']['input'];
  uploadId: Scalars['String']['input'];
};


export type MutationTenancysvc_SetTenancyGoogleDriveCommandArgs = {
  googleDriveLink: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_SetTenancyTaskCompletionMutationArgs = {
  data?: InputMaybe<TenancyTaskStatusDataInput>;
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_SetTenancyWelcomePackCommandArgs = {
  tenancyId: Scalars['String']['input'];
  welcomePackUrl: Scalars['String']['input'];
};


export type MutationTenancysvc_SetupTenancyForOnboardingCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_StartTenancyTodoCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_ToggleTenancyMoveInCategoryVisibilityCommandArgs = {
  categories?: InputMaybe<Array<TaskCategory>>;
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_UncompleteTenancyTodoCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_UnstartTenancyTodoCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationTenancysvc_UpdateTenancyCommandArgs = {
  breakClauses?: InputMaybe<Array<BreakClauseInput>>;
  commercialsAgreedAt?: InputMaybe<DateInput>;
  companyId: Scalars['String']['input'];
  cwpUserId?: InputMaybe<Scalars['String']['input']>;
  dealId?: InputMaybe<Scalars['String']['input']>;
  declineReason?: InputMaybe<Scalars['String']['input']>;
  documentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  end?: InputMaybe<DateInput>;
  endDate?: InputMaybe<TimestampInput>;
  excludeFromReporting?: InputMaybe<Scalars['Boolean']['input']>;
  financialModel?: InputMaybe<TenancyFinancialModelMutationInput>;
  floorplans?: InputMaybe<Array<TenancyFloorplanInput>>;
  headsOfTermsAgreedAt?: InputMaybe<DateInput>;
  id: Scalars['String']['input'];
  isKittActingAgent?: InputMaybe<Scalars['Boolean']['input']>;
  leaseAgreedAt?: InputMaybe<DateInput>;
  notes?: InputMaybe<Scalars['String']['input']>;
  occupancyAt?: InputMaybe<DateInput>;
  renewalType?: InputMaybe<RenewalType>;
  rollingConditions?: InputMaybe<Array<RollingConditionInput>>;
  start?: InputMaybe<DateInput>;
  startDate?: InputMaybe<TimestampInput>;
  status?: InputMaybe<TenancyStatus>;
  term?: InputMaybe<Array<PaymentInput>>;
  transactionMemberUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  unitIds: Array<Scalars['String']['input']>;
};


export type MutationTenancysvc_UpdateTenancyFloorplanZoneCommandArgs = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  radius: Scalars['Int']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
};


export type MutationTenancysvc_UpdateTenancyMoveInDateArgs = {
  moveInDate?: InputMaybe<DateInput>;
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_UpdateTenancyTodoCommandArgs = {
  assigneeCompanyId: Scalars['String']['input'];
  category?: InputMaybe<TaskCategory>;
  description: Scalars['String']['input'];
  dueDate?: InputMaybe<TimestampInput>;
  floorplanZoneId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  requiresApproval: Scalars['Boolean']['input'];
  tenancyId: Scalars['String']['input'];
  title: Scalars['String']['input'];
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationTenancysvc_UpdateTimelineStageCompletionDateArgs = {
  stages?: InputMaybe<Array<TimelineStageCompletionDateInput>>;
  tenancyId: Scalars['String']['input'];
};


export type MutationTenancysvc_UpdateTimelineStateCommandArgs = {
  estimatedCompletionDate?: InputMaybe<DateInput>;
  stageId: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type MutationUnitsvc_ArchiveUnitCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationUnitsvc_CreateUnitFloorNumberRowsCommandArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUnitsvc_DeleteUnitCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationUnitsvc_UnarchiveUnitCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationUnitsvc_UpdateSourcedUnitCommandArgs = {
  accessContact?: InputMaybe<ContactInput>;
  accessInstructions?: InputMaybe<Scalars['String']['input']>;
  accessNoticeHours?: InputMaybe<Scalars['Int']['input']>;
  advertisedPrice?: InputMaybe<MoneyInput>;
  availabilityStatus?: InputMaybe<OptionalUnitAvailabilityStatusInput>;
  brokerPayee?: InputMaybe<BrokerPayeeOptionalInput>;
  desks?: InputMaybe<Scalars['Int']['input']>;
  floorplanUploadId?: InputMaybe<Scalars['String']['input']>;
  greySpace?: InputMaybe<GreySpaceOptionalInput>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  occupierContract?: InputMaybe<OccupierContractOptionalInput>;
  outOfHoursAccess?: InputMaybe<Scalars['String']['input']>;
  primaryAccessMethod?: InputMaybe<Scalars['String']['input']>;
  stateOfMAndE?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUploadsvc_DeleteUploadCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationUsersvc_AddUserToLeadTenantsGroupCommandArgs = {
  userId: Scalars['String']['input'];
};


export type MutationUsersvc_ChangePasswordArgs = {
  password: Scalars['String']['input'];
  passwordConfirm: Scalars['String']['input'];
};


export type MutationUsersvc_ChangeUserEmailCommandArgs = {
  email: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUsersvc_ChangeUserPasswordCommandArgs = {
  password: Scalars['String']['input'];
  passwordConfirm: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUsersvc_CompleteOnboardingCommandArgs = {
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  profilePictureUploadId?: InputMaybe<Scalars['String']['input']>;
  teamId?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
};


export type MutationUsersvc_CreateUserCommandArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationUsersvc_DeleteUserCommandArgs = {
  UserId: Scalars['String']['input'];
};


export type MutationUsersvc_DeleteUsersInCompanyArgs = {
  companyId: Scalars['String']['input'];
};


export type MutationUsersvc_LogOutFromContextCommandArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUsersvc_LoginAsUserCommandArgs = {
  userId: Scalars['String']['input'];
};


export type MutationUsersvc_LoginCommandArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  rememberMe: Scalars['Boolean']['input'];
};


export type MutationUsersvc_LogoutUserCommandArgs = {
  cookie: Scalars['String']['input'];
};


export type MutationUsersvc_OnboardUserCommandArgs = {
  companyId: Scalars['String']['input'];
  dealId?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  leadTenant?: InputMaybe<Scalars['Boolean']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  onboardBrokerToHuddle?: InputMaybe<Scalars['Boolean']['input']>;
  onboardToBrokerPlatform?: InputMaybe<Scalars['Boolean']['input']>;
  onboardToHuddle?: InputMaybe<Scalars['Boolean']['input']>;
  profileId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUsersvc_OnboardUsersCommandArgs = {
  companyId: Scalars['String']['input'];
  emails: Array<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUsersvc_RegisterUserForBrokerPlatformCommandArgs = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationUsersvc_RemoveUserFromLeadTenantsGroupCommandArgs = {
  userId: Scalars['String']['input'];
};


export type MutationUsersvc_ResendOnboardingEmailCommandArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUsersvc_ResendVerificationEmailForBrokerPlatformCommandArgs = {
  email: Scalars['String']['input'];
};


export type MutationUsersvc_ResetPasswordCommandArgs = {
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationUsersvc_RevokeLoginForUserArgs = {
  userId: Scalars['String']['input'];
};


export type MutationUsersvc_SignUpCommandArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  rememberMe: Scalars['Boolean']['input'];
};


export type MutationUsersvc_StartAccountRecoveryCommandArgs = {
  email: Scalars['String']['input'];
  inAppRecovery?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUsersvc_VerifyEmailForBrokerPlatformCommandArgs = {
  token: Scalars['String']['input'];
};


export type MutationVisitsvc_CreateVisitCommandArgs = {
  data?: InputMaybe<VisitMutableDataInput>;
  dontSendNotification?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVisitsvc_DeleteVisitCommandArgs = {
  id: Scalars['String']['input'];
};


export type MutationVisitsvc_RemindLeadTenantsArgs = {
  visitId: Scalars['String']['input'];
};


export type MutationVisitsvc_UpdateVisitCommandArgs = {
  data?: InputMaybe<VisitMutableDataInput>;
  id: Scalars['String']['input'];
};

export type NetworkConfig = {
  __typename?: 'NetworkConfig';
  ip: Scalars['String']['output'];
  password: Scalars['String']['output'];
  port: Scalars['Int']['output'];
  user?: Maybe<User>;
  username: Scalars['String']['output'];
};

export type NetworkConfigInput = {
  ip: Scalars['String']['input'];
  password: Scalars['String']['input'];
  port: Scalars['Int']['input'];
  username: Scalars['String']['input'];
};

export type NewEnquiryNotificationSent = {
  __typename?: 'NewEnquiryNotificationSent';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type Note = {
  __typename?: 'Note';
  attachmentIds: Array<Scalars['String']['output']>;
  attachments?: Maybe<Array<Maybe<UploadMessage>>>;
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  dealId: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  draftStateString: Scalars['String']['output'];
  html: Scalars['String']['output'];
  id: Scalars['String']['output'];
  plainText: Scalars['String']['output'];
  taggedUserIds?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Timestamp>;
  updatedBy?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type NoteCreated = {
  __typename?: 'NoteCreated';
  dealId: Scalars['String']['output'];
  noteId: Scalars['String']['output'];
  taggedUserIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type NoteDeleted = {
  __typename?: 'NoteDeleted';
  dealId: Scalars['String']['output'];
  noteId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type NoteInput = {
  attachmentIds: Array<Scalars['String']['input']>;
  createdAt?: InputMaybe<TimestampInput>;
  createdBy: Scalars['String']['input'];
  dealId: Scalars['String']['input'];
  deletedAt?: InputMaybe<TimestampInput>;
  draftStateString: Scalars['String']['input'];
  html: Scalars['String']['input'];
  id: Scalars['String']['input'];
  plainText: Scalars['String']['input'];
  taggedUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  updatedAt?: InputMaybe<TimestampInput>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

export type NoteUpdated = {
  __typename?: 'NoteUpdated';
  dealId: Scalars['String']['output'];
  noteId: Scalars['String']['output'];
  taggedUserIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type Notification = {
  __typename?: 'Notification';
  author?: Maybe<Profile>;
  authorId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  readByUser?: Maybe<Scalars['Boolean']['output']>;
  title: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Notification>;
  user?: Maybe<User>;
};

export type NotificationMarkedAsRead = {
  __typename?: 'NotificationMarkedAsRead';
  notificationIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type NotificationPreferenceMetadata = {
  __typename?: 'NotificationPreferenceMetadata';
  key: Scalars['String']['output'];
  user?: Maybe<User>;
  value: Scalars['String']['output'];
};

export type NotificationPreferenceMetadataInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type NotificationSentToAllUsers = {
  __typename?: 'NotificationSentToAllUsers';
  message: Scalars['String']['output'];
  title: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type NotificationsConnection = {
  __typename?: 'NotificationsConnection';
  edges?: Maybe<Array<NotificationEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type NotifyAboutTenancyCommand = {
  __typename?: 'NotifyAboutTenancyCommand';
  dealId?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  notifyBroker?: Maybe<Scalars['Boolean']['output']>;
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type NotifyAboutUnactionedChatsCommand = {
  __typename?: 'NotifyAboutUnactionedChatsCommand';
  chatIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type OccupiedFilterInput = {
  occupied: Scalars['Boolean']['input'];
};

export enum OccupierContract {
  AgreementWithKitt = 'AGREEMENT_WITH_KITT',
  Lease = 'LEASE',
  License = 'LICENSE'
}

export type OccupierContractOptionalInput = {
  occupierContract?: InputMaybe<OccupierContract>;
};

export type OfficeAttendancePeriod = {
  __typename?: 'OfficeAttendancePeriod';
  periodDate?: Maybe<Date>;
  value: Scalars['Int']['output'];
};

export type OfficeValue = {
  __typename?: 'OfficeValue';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type OnboadingCompleted = {
  __typename?: 'OnboadingCompleted';
  name: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type OnboardUserCommand = {
  __typename?: 'OnboardUserCommand';
  companyId: Scalars['String']['output'];
  dealId?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  leadTenant?: Maybe<Scalars['Boolean']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  onboardBrokerToHuddle?: Maybe<Scalars['Boolean']['output']>;
  onboardToBrokerPlatform?: Maybe<Scalars['Boolean']['output']>;
  onboardToHuddle?: Maybe<Scalars['Boolean']['output']>;
  profileId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type OnboardUsersCommand = {
  __typename?: 'OnboardUsersCommand';
  companyId: Scalars['String']['output'];
  emails: Array<Scalars['String']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type OnboardingEmailResent = {
  __typename?: 'OnboardingEmailResent';
  email: Scalars['String']['output'];
  onboardingAlreadyCompleted: Scalars['Boolean']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type OpenDoorCommand = {
  __typename?: 'OpenDoorCommand';
  access: Access;
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type OpenDoorForGuestCommand = {
  __typename?: 'OpenDoorForGuestCommand';
  accessId: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type OpenDoorResponse = {
  __typename?: 'OpenDoorResponse';
  opened: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export enum OpsTier {
  HighOpsTier = 'HIGH_OPS_TIER',
  LowOpsTier = 'LOW_OPS_TIER',
  MediumOpsTier = 'MEDIUM_OPS_TIER',
  UnknownOpsTier = 'UNKNOWN_OPS_TIER'
}

export type OptionalCompanyType = {
  __typename?: 'OptionalCompanyType';
  type?: Maybe<CompanyType>;
  user?: Maybe<User>;
};

export type OptionalCompanyTypeInput = {
  type?: InputMaybe<CompanyType>;
};

export type OptionalUnitAvailabilityStatus = {
  __typename?: 'OptionalUnitAvailabilityStatus';
  status?: Maybe<AvailabilityStatus>;
};

export type OptionalUnitAvailabilityStatusInput = {
  status?: InputMaybe<AvailabilityStatus>;
};

export type Order = {
  __typename?: 'Order';
  cancelledAt?: Maybe<DateTime>;
  category?: Maybe<OrderCategory>;
  categoryId: Scalars['String']['output'];
  cost?: Maybe<Money>;
  createdAt?: Maybe<DateTime>;
  displayId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
  kittCommissionPercentage: Scalars['Float']['output'];
  lineItems?: Maybe<Array<LineItem>>;
  notes: Scalars['String']['output'];
  rrule: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type OrderCategory = {
  __typename?: 'OrderCategory';
  group?: Maybe<CategoryGroup>;
  hasFrequency: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  kittCommissionPercentage: Scalars['Float']['output'];
  makeRecommendations: Scalars['Boolean']['output'];
  msa?: Maybe<ManagedServiceAgreement>;
  name: Scalars['String']['output'];
  order?: Maybe<Order>;
  products?: Maybe<Array<Maybe<OrderProduct>>>;
  unitsOfMeasure?: Maybe<Array<Maybe<UnitOfMeasure>>>;
};


export type OrderCategoryMsaArgs = {
  tenancyId: Scalars['String']['input'];
};


export type OrderCategoryOrderArgs = {
  tenancyId: Scalars['String']['input'];
};

export type OrderInputInput = {
  categoryId: Scalars['String']['input'];
  cost?: InputMaybe<MoneyInput>;
  lineItems?: InputMaybe<Array<LineItemInputInput>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rrule?: InputMaybe<Scalars['String']['input']>;
};

export type OrderList = {
  __typename?: 'OrderList';
  orders?: Maybe<Array<Order>>;
};

export type OrderNotesSaved = {
  __typename?: 'OrderNotesSaved';
  order?: Maybe<Order>;
};

export type OrderProduct = {
  __typename?: 'OrderProduct';
  category?: Maybe<OrderCategory>;
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  unit?: Maybe<UnitOfMeasure>;
  unitId: Scalars['String']['output'];
  unitQuantity: Scalars['Int']['output'];
};

export type OrdersSaved = {
  __typename?: 'OrdersSaved';
  orders?: Maybe<Array<Order>>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type PaginatedBookingsConnection = {
  __typename?: 'PaginatedBookingsConnection';
  edges?: Maybe<Array<RoomOrDeskBookingEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type PaginationData = {
  __typename?: 'PaginationData';
  count: Scalars['Int']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  totalPages: Scalars['Int']['output'];
};

export type PaginationOptions = {
  __typename?: 'PaginationOptions';
  after: Scalars['String']['output'];
  first: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type PasswordChanged = {
  __typename?: 'PasswordChanged';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type PasswordReset = {
  __typename?: 'PasswordReset';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type PasswordResetTriggered = {
  __typename?: 'PasswordResetTriggered';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Payment = {
  __typename?: 'Payment';
  date?: Maybe<Timestamp>;
  kittFee?: Maybe<Money>;
  price?: Maybe<Money>;
};

export type PaymentInput = {
  date?: InputMaybe<TimestampInput>;
  kittFee?: InputMaybe<MoneyInput>;
  price?: InputMaybe<MoneyInput>;
};

export type PdfGenerated = {
  __typename?: 'PdfGenerated';
  requestId: Scalars['String']['output'];
  upload?: Maybe<UploadMessage>;
  user?: Maybe<User>;
};

export enum PeriodDataGranularity {
  Day = 'Day',
  Month = 'Month',
  Week = 'Week'
}

export type Permission = {
  __typename?: 'Permission';
  associatedResource?: Maybe<AssociatedResource>;
  companyId: Scalars['String']['output'];
  groupId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  permission: Scalars['String']['output'];
  resource: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type PermissionArchived = {
  __typename?: 'PermissionArchived';
  permissionId: Scalars['String']['output'];
};

export type PermissionCreated = {
  __typename?: 'PermissionCreated';
  permissionId: Scalars['String']['output'];
};

export type PhoneNumber = {
  __typename?: 'PhoneNumber';
  accessId: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type PhoneNumberCreated = {
  __typename?: 'PhoneNumberCreated';
  phoneNumber?: Maybe<PhoneNumber>;
  user?: Maybe<User>;
};

export type PhoneNumberVerified = {
  __typename?: 'PhoneNumberVerified';
  phone: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type PhotoTakenAtAccess = {
  __typename?: 'PhotoTakenAtAccess';
  accessId: Scalars['String']['output'];
  photo: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type PipelineStage = {
  __typename?: 'PipelineStage';
  count: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  totalSqft: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type Place = {
  __typename?: 'Place';
  geo?: Maybe<AreaGeoPoint>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type PolicyDetails = {
  __typename?: 'PolicyDetails';
  entityId?: Maybe<Scalars['String']['output']>;
  freeTextPolicy?: Maybe<Scalars['String']['output']>;
  hasHybridWorkPolicy?: Maybe<Scalars['Boolean']['output']>;
  hasMandatoryDaysInOffice?: Maybe<Scalars['Boolean']['output']>;
  hasMinimumDaysInTimeframe?: Maybe<Scalars['Boolean']['output']>;
  hasTeamSpecificPolicies?: Maybe<Scalars['Boolean']['output']>;
  reasonNoHybridWorkPolicy?: Maybe<ReasonNoHybridWorkPolicy>;
  timeframe?: Maybe<PolicyTimeframe>;
  totalRequiredDaysInTimeframe?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type PolicyDetailsInput = {
  entityId?: InputMaybe<Scalars['String']['input']>;
  freeTextPolicy?: InputMaybe<Scalars['String']['input']>;
  hasHybridWorkPolicy?: InputMaybe<Scalars['Boolean']['input']>;
  hasMandatoryDaysInOffice?: InputMaybe<Scalars['Boolean']['input']>;
  hasMinimumDaysInTimeframe?: InputMaybe<Scalars['Boolean']['input']>;
  hasTeamSpecificPolicies?: InputMaybe<Scalars['Boolean']['input']>;
  reasonNoHybridWorkPolicy?: InputMaybe<ReasonNoHybridWorkPolicy>;
  timeframe?: InputMaybe<PolicyTimeframe>;
  totalRequiredDaysInTimeframe?: InputMaybe<Scalars['Int']['input']>;
};

export type PolicyInput = {
  __typename?: 'PolicyInput';
  companyId: Scalars['String']['output'];
  details?: Maybe<PolicyDetails>;
  policies?: Maybe<Array<AttendancePolicy>>;
  teamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type PolicyInputInput = {
  companyId: Scalars['String']['input'];
  details?: InputMaybe<PolicyDetailsInput>;
  policies?: InputMaybe<Array<AttendancePolicyInput>>;
  teamId: Scalars['String']['input'];
};

export type PolicySuccessRates = {
  __typename?: 'PolicySuccessRates';
  companyWide?: Maybe<AttendanceValue>;
  perTeam?: Maybe<Array<AttendanceValue>>;
};

export enum PolicyTimeframe {
  Monthly = 'Monthly',
  Other = 'Other',
  Quarterly = 'Quarterly',
  Weekly = 'Weekly',
  Yearly = 'Yearly'
}

export type PotentialProductFilters = {
  __typename?: 'PotentialProductFilters';
  estimatePrice?: Maybe<Scalars['Boolean']['output']>;
  fitoutState?: Maybe<UnitFitoutStateOptional>;
  fitoutStates?: Maybe<Array<UnitFitoutState>>;
  hideMultiFloorSelections?: Maybe<Scalars['Boolean']['output']>;
  includeInvalid?: Maybe<Scalars['Boolean']['output']>;
  includeUnavailable?: Maybe<Scalars['Boolean']['output']>;
  includeValidUnits?: Maybe<Scalars['Boolean']['output']>;
  onlyCombinations?: Maybe<Scalars['Boolean']['output']>;
  overrideMinTermMonths?: Maybe<Scalars['Int']['output']>;
  price?: Maybe<MoneyRange>;
  pricePerSqft?: Maybe<MoneyRange>;
  sqFt?: Maybe<Int32OptionalRange>;
  startDate?: Maybe<Date>;
  termLength?: Maybe<Scalars['Int']['output']>;
  totalUnits?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type PotentialProductFiltersInput = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  fitoutState?: InputMaybe<UnitFitoutStateOptionalInput>;
  fitoutStates?: InputMaybe<Array<UnitFitoutState>>;
  hideMultiFloorSelections?: InputMaybe<Scalars['Boolean']['input']>;
  includeInvalid?: InputMaybe<Scalars['Boolean']['input']>;
  includeUnavailable?: InputMaybe<Scalars['Boolean']['input']>;
  includeValidUnits?: InputMaybe<Scalars['Boolean']['input']>;
  onlyCombinations?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
  price?: InputMaybe<MoneyRangeInput>;
  pricePerSqft?: InputMaybe<MoneyRangeInput>;
  sqFt?: InputMaybe<Int32OptionalRangeInput>;
  startDate?: InputMaybe<DateInput>;
  termLength?: InputMaybe<Scalars['Int']['input']>;
  totalUnits?: InputMaybe<Scalars['Int']['input']>;
};

export type Preference = {
  __typename?: 'Preference';
  allowedFrequencies?: Maybe<Array<CommunicationFrequency>>;
  description: Scalars['String']['output'];
  frequency?: Maybe<CommunicationFrequency>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Pricing = {
  __typename?: 'Pricing';
  annualPsfBreakdown?: Maybe<Breakdown>;
  appliedMinimumTermMonths: Scalars['Int']['output'];
  brokerFeeLumpSum?: Maybe<Money>;
  hasEstimations: Scalars['Boolean']['output'];
  monthlyBreakdown?: Maybe<Breakdown>;
  tiers?: Maybe<TierInputs>;
  user?: Maybe<User>;
};

export type Printer = {
  __typename?: 'Printer';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Priority = {
  __typename?: 'Priority';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  sla: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export enum PriorityType {
  High = 'High',
  Low = 'Low',
  Medium = 'Medium',
  Urgent = 'Urgent'
}

export type ProcessWorkplaceStrategyTypeformResponseCommand = {
  __typename?: 'ProcessWorkplaceStrategyTypeformResponseCommand';
  json: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Product = {
  __typename?: 'Product';
  advertisedPrice?: Maybe<Money>;
  archived: Scalars['Boolean']['output'];
  availableFrom?: Maybe<Timestamp>;
  content?: Maybe<Scalars['JSON']['output']>;
  desks: Scalars['Int']['output'];
  displayOnWebsite: Scalars['Boolean']['output'];
  facilities?: Maybe<Array<ProductFacility>>;
  floors: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isFavourite?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Location>;
  maximumTermMonths: Scalars['Int']['output'];
  minimumTermMonths: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  price?: Maybe<ProductMoney>;
  pricePerSqFt?: Maybe<ProductMoney>;
  sqFt: Scalars['Int']['output'];
  status?: Maybe<ProductStatus>;
  templateBrochureId?: Maybe<Scalars['String']['output']>;
  terms?: Maybe<Array<ProductTerm>>;
  type?: Maybe<ProductType>;
  unitGroupId: Scalars['String']['output'];
  unitIds: Array<Scalars['String']['output']>;
  units?: Maybe<Array<Maybe<Unit>>>;
};

export type ProductArchived = {
  __typename?: 'ProductArchived';
  id: Scalars['String']['output'];
};

export type ProductCreated = {
  __typename?: 'ProductCreated';
  id: Scalars['String']['output'];
  product?: Maybe<Product>;
};

export type ProductDeleted = {
  __typename?: 'ProductDeleted';
  product?: Maybe<Product>;
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Product>;
};

export type ProductFacility = {
  __typename?: 'ProductFacility';
  available: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type ProductFilterOptions = {
  __typename?: 'ProductFilterOptions';
  desk: Array<Scalars['Int']['output']>;
  facility: Array<Scalars['String']['output']>;
  price: Array<Scalars['Int']['output']>;
  sqFt: Array<Scalars['Int']['output']>;
};

export type ProductFiltersInput = {
  availableFrom?: InputMaybe<TimestampInput>;
  desk?: InputMaybe<ProductRangeFilterInput>;
  facility?: InputMaybe<Array<Scalars['String']['input']>>;
  minTerm?: InputMaybe<RangeInput>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  polygon?: InputMaybe<Array<GeoPointInput>>;
  price?: InputMaybe<ProductRangeFilterInput>;
  squareFoot?: InputMaybe<ProductRangeFilterInput>;
  viewport?: InputMaybe<ProductViewportInput>;
};

export type ProductMoney = {
  __typename?: 'ProductMoney';
  currencySymbol: Scalars['String']['output'];
  formatted: Scalars['String']['output'];
  pennies: Scalars['Int']['output'];
};

export type ProductPriceRange = {
  __typename?: 'ProductPriceRange';
  max?: Maybe<ProductMoney>;
  min?: Maybe<ProductMoney>;
};

export type ProductRangeFilterInput = {
  max: Scalars['String']['input'];
  min: Scalars['String']['input'];
};

export enum ProductSortBy {
  ArchivedAt = 'ARCHIVED_AT',
  AvailableFrom = 'AVAILABLE_FROM',
  CreatedAt = 'CREATED_AT',
  Desks = 'DESKS',
  Location = 'LOCATION',
  MinimumTerm = 'MINIMUM_TERM',
  Name = 'NAME',
  Price = 'PRICE',
  Ranking = 'RANKING',
  Sqft = 'SQFT'
}

export enum ProductStatus {
  OffMarket = 'OFF_MARKET',
  OnMarket = 'ON_MARKET'
}

export type ProductTerm = {
  __typename?: 'ProductTerm';
  lengthInMonths: Scalars['Int']['output'];
  price?: Maybe<ProductMoney>;
};

export type ProductTermInputInput = {
  lengthInMonths: Scalars['Int']['input'];
  price: Scalars['Int']['input'];
};

export enum ProductType {
  Managed = 'MANAGED',
  Serviced = 'SERVICED'
}

export type ProductUnarchived = {
  __typename?: 'ProductUnarchived';
  product?: Maybe<Product>;
};

export type ProductUpdated = {
  __typename?: 'ProductUpdated';
  id: Scalars['String']['output'];
  isPriced: Scalars['Boolean']['output'];
  unitGroupId: Scalars['String']['output'];
};

export type ProductViewport = {
  __typename?: 'ProductViewport';
  nw?: Maybe<GeoPoint>;
  se?: Maybe<GeoPoint>;
};

export type ProductViewportInput = {
  nw?: InputMaybe<GeoPointInput>;
  se?: InputMaybe<GeoPointInput>;
};

export type ProductsConnection = {
  __typename?: 'ProductsConnection';
  edges?: Maybe<Array<ProductEdge>>;
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  pageInfo?: Maybe<PageInfo>;
  totalCount: Scalars['Int']['output'];
};

export type Profile = {
  __typename?: 'Profile';
  addresses?: Maybe<Array<ProfileAddress>>;
  associatedDeals?: Maybe<DealList>;
  birthday?: Maybe<Date>;
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  companyTeamId: Scalars['String']['output'];
  emails: Array<Scalars['String']['output']>;
  hideBirthday: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  img: Scalars['String']['output'];
  jobTitle: Scalars['String']['output'];
  linkedInUrl: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumbers: Array<Scalars['String']['output']>;
  photo?: Maybe<UploadMessage>;
  profilePhotoUploadId: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  team?: Maybe<CompanyTeam>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
  website: Scalars['String']['output'];
};

export type ProfileAddress = {
  __typename?: 'ProfileAddress';
  country: Scalars['String']['output'];
  postalCode: Scalars['String']['output'];
  streetAddress: Scalars['String']['output'];
  town: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ProfileAddressInput = {
  country: Scalars['String']['input'];
  postalCode: Scalars['String']['input'];
  streetAddress: Scalars['String']['input'];
  town: Scalars['String']['input'];
};

export type ProfileCreated = {
  __typename?: 'ProfileCreated';
  profile?: Maybe<Profile>;
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ProfileDeleted = {
  __typename?: 'ProfileDeleted';
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ProfileEdge = {
  __typename?: 'ProfileEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Profile>;
  user?: Maybe<User>;
};

export type ProfileObfuscated = {
  __typename?: 'ProfileObfuscated';
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type ProfileUpdated = {
  __typename?: 'ProfileUpdated';
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ProfilesConnection = {
  __typename?: 'ProfilesConnection';
  edges?: Maybe<Array<ProfileEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type ProvisionPhoneNumberCommand = {
  __typename?: 'ProvisionPhoneNumberCommand';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Purchase = {
  __typename?: 'Purchase';
  addon?: Maybe<Addon>;
  catalogItemId: Scalars['String']['output'];
  dateFulfilled?: Maybe<Timestamp>;
  feePricePennies: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  pricePennies: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  recurrenceRule?: Maybe<Array<Recurrence>>;
  tenancyId: Scalars['String']['output'];
};

export type PurchaseConnection = {
  __typename?: 'PurchaseConnection';
  edges?: Maybe<Array<PurchaseEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type PurchaseCreated = {
  __typename?: 'PurchaseCreated';
  id: Scalars['String']['output'];
};

export type PurchaseDeleted = {
  __typename?: 'PurchaseDeleted';
  id: Scalars['String']['output'];
};

export type PurchaseEdge = {
  __typename?: 'PurchaseEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Purchase>;
};

export type PurchaseInput = {
  catalogItemId: Scalars['String']['input'];
  dateFulfilled?: InputMaybe<TimestampInput>;
  feePricePennies: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  notes: Scalars['String']['input'];
  pricePennies: Scalars['Int']['input'];
  quantity: Scalars['Int']['input'];
  recurrenceRule?: InputMaybe<Array<RecurrenceInput>>;
  tenancyId: Scalars['String']['input'];
};

export type PurchaseUpdated = {
  __typename?: 'PurchaseUpdated';
  id: Scalars['String']['output'];
};

export type QualifyLocationCommand = {
  __typename?: 'QualifyLocationCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Quote = {
  __typename?: 'Quote';
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  enquiryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  mutableData?: Maybe<QuoteMutableData>;
  status?: Maybe<QuoteStatus>;
  statusEvents?: Maybe<Array<QuoteStatusEvent>>;
  updatedAt?: Maybe<Timestamp>;
  updatedBy: Scalars['String']['output'];
  uploads?: Maybe<Array<Maybe<UploadMessage>>>;
};

export type QuoteCreated = {
  __typename?: 'QuoteCreated';
  enquiryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
};

export type QuoteDeleted = {
  __typename?: 'QuoteDeleted';
  id: Scalars['String']['output'];
};

export type QuoteDuplicated = {
  __typename?: 'QuoteDuplicated';
  newId: Scalars['String']['output'];
  oldId: Scalars['String']['output'];
};

export type QuoteMutableData = {
  __typename?: 'QuoteMutableData';
  description?: Maybe<Scalars['String']['output']>;
  kittFeePennies?: Maybe<Scalars['Int']['output']>;
  pricePennies?: Maybe<Scalars['Int']['output']>;
  rejectedReason?: Maybe<Scalars['String']['output']>;
  statusId?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  uploadIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type QuoteMutableDataInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  kittFeePennies?: InputMaybe<Scalars['Int']['input']>;
  pricePennies?: InputMaybe<Scalars['Int']['input']>;
  rejectedReason?: InputMaybe<Scalars['String']['input']>;
  statusId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type QuoteStatus = {
  __typename?: 'QuoteStatus';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type QuoteStatusEvent = {
  __typename?: 'QuoteStatusEvent';
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  id: Scalars['String']['output'];
  quoteId: Scalars['String']['output'];
  statusId: Scalars['String']['output'];
};

export type QuoteUpdated = {
  __typename?: 'QuoteUpdated';
  id: Scalars['String']['output'];
};

export type Range = {
  __typename?: 'Range';
  max: Scalars['Int']['output'];
  min: Scalars['Int']['output'];
};

export type RangeFilterInput = {
  max: Scalars['String']['input'];
  min: Scalars['String']['input'];
};

export type RangeInput = {
  max: Scalars['Int']['input'];
  min: Scalars['Int']['input'];
};

export type RawInsights = {
  __typename?: 'RawInsights';
  daily?: Maybe<Array<RawInsightsInPeriod>>;
  monthly?: Maybe<Array<RawInsightsInPeriod>>;
  quarterly?: Maybe<Array<RawInsightsInPeriod>>;
  weekly?: Maybe<Array<RawInsightsInPeriod>>;
};

export type RawInsightsInPeriod = {
  __typename?: 'RawInsightsInPeriod';
  companyWide?: Maybe<AttendanceValue>;
  perTeam?: Maybe<Array<AttendanceValue>>;
  periodStartDate?: Maybe<Date>;
};

export enum ReadyStatus {
  Downloading = 'Downloading',
  NotReady = 'NotReady',
  Ready = 'Ready',
  Syncing = 'Syncing'
}

export enum ReasonNoHybridWorkPolicy {
  CompleteFlexibility = 'CompleteFlexibility',
  CompleteStrict = 'CompleteStrict',
  HasPolicy = 'HasPolicy',
  NeedHelp = 'NeedHelp',
  OtherSpecified = 'OtherSpecified'
}

export type ReconfigureDevices = {
  __typename?: 'ReconfigureDevices';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type ReconfigureProviders = {
  __typename?: 'ReconfigureProviders';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type Records = {
  __typename?: 'Records';
  ids: Array<Scalars['String']['output']>;
};

export type RecoverRoomAction = {
  __typename?: 'RecoverRoomAction';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RecoveryEmailSent = {
  __typename?: 'RecoveryEmailSent';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Rectangle = {
  __typename?: 'Rectangle';
  angle: Scalars['Float']['output'];
  center?: Maybe<GeometricPoint>;
  height: Scalars['Int']['output'];
  northWest?: Maybe<GeometricPoint>;
  user?: Maybe<User>;
  width: Scalars['Int']['output'];
};

export type Recurrence = {
  __typename?: 'Recurrence';
  end?: Maybe<Timestamp>;
  lengthInMins: Scalars['Int']['output'];
  rule: Scalars['String']['output'];
  start?: Maybe<Timestamp>;
};

export type RecurrenceInput = {
  end?: InputMaybe<TimestampInput>;
  lengthInMins: Scalars['Int']['input'];
  rule: Scalars['String']['input'];
  start?: InputMaybe<TimestampInput>;
};

/** regional data graphql types */
export type RegionalData = {
  __typename?: 'RegionalData';
  holidays?: Maybe<Array<Maybe<Holiday>>>;
  region?: Maybe<Scalars['String']['output']>;
};

export type RegisterGuestCommand = {
  __typename?: 'RegisterGuestCommand';
  accessIds?: Maybe<Array<Scalars['String']['output']>>;
  date?: Maybe<Timestamp>;
  dateUtc?: Maybe<DateTime>;
  email: Scalars['String']['output'];
  expiryDate?: Maybe<Timestamp>;
  expiryDateUtc?: Maybe<DateTime>;
  guestId?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  requesterCompanyId?: Maybe<Scalars['String']['output']>;
  requesterId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RegisterUserForBrokerPlatformCommand = {
  __typename?: 'RegisterUserForBrokerPlatformCommand';
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  password: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RelevantSla = {
  __typename?: 'RelevantSla';
  slaDateUtc?: Maybe<DateTime>;
  type?: Maybe<SlaType>;
};

export type ReminderSent = {
  __typename?: 'ReminderSent';
  leadTenantsReminded: Scalars['Boolean']['output'];
};

export type ReminderSentForTenancyTodo = {
  __typename?: 'ReminderSentForTenancyTodo';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type RemoveSelectionsCommand = {
  __typename?: 'RemoveSelectionsCommand';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  selections?: Maybe<Array<Selection>>;
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type RemoveShortlistsFromDealCommand = {
  __typename?: 'RemoveShortlistsFromDealCommand';
  dealId: Scalars['String']['output'];
  shortlistIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type RemoveUserFromLeadTenantsGroupCommand = {
  __typename?: 'RemoveUserFromLeadTenantsGroupCommand';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export enum RenewalType {
  Na = 'NA',
  RenewalNewSpace = 'RENEWAL_NEW_SPACE',
  RenewalSameSpace = 'RENEWAL_SAME_SPACE',
  UnknownRenewalType = 'UnknownRenewalType'
}

export type ReorderMatchedSpacesCommand = {
  __typename?: 'ReorderMatchedSpacesCommand';
  matches?: Maybe<Array<MatchedSpace>>;
  user?: Maybe<User>;
};

export type Request = {
  __typename?: 'Request';
  archivedAt?: Maybe<Timestamp>;
  assignee?: Maybe<User>;
  assigneeId: Scalars['String']['output'];
  category?: Maybe<Category>;
  categoryId: Scalars['String']['output'];
  chatIds: Array<Scalars['String']['output']>;
  chats?: Maybe<Array<Maybe<Chat>>>;
  comments?: Maybe<Array<Comment>>;
  contractor: Scalars['String']['output'];
  cost: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  creator?: Maybe<User>;
  daysUntilSla: Scalars['Int']['output'];
  deletedAt?: Maybe<Timestamp>;
  detail: Scalars['String']['output'];
  dueDate: Scalars['String']['output'];
  fileIds: Array<Scalars['String']['output']>;
  files?: Maybe<Array<Maybe<UploadMessage>>>;
  id: Scalars['String']['output'];
  location?: Maybe<Location>;
  locationId: Scalars['String']['output'];
  priority: Scalars['String']['output'];
  status: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  techRequest?: Maybe<Scalars['Boolean']['output']>;
  unit?: Maybe<Unit>;
  unitId: Scalars['String']['output'];
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type RequestAddShortlistToValveCommand = {
  __typename?: 'RequestAddShortlistToValveCommand';
  brokerSearchId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RequestArchived = {
  __typename?: 'RequestArchived';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RequestCreated = {
  __typename?: 'RequestCreated';
  RequestId: Scalars['String']['output'];
  RequestSummary: Scalars['String']['output'];
  Title: Scalars['String']['output'];
  request?: Maybe<Request>;
  user?: Maybe<User>;
};

export type RequestDeleted = {
  __typename?: 'RequestDeleted';
  id: Scalars['String']['output'];
  request?: Maybe<Request>;
  user?: Maybe<User>;
};

export type RequestUpdated = {
  __typename?: 'RequestUpdated';
  Messages: Array<Scalars['String']['output']>;
  RequestId: Scalars['String']['output'];
  RequestSummary: Scalars['String']['output'];
  Title: Scalars['String']['output'];
  UserId: Scalars['String']['output'];
  request?: Maybe<Request>;
  user?: Maybe<User>;
};

export type RequiredFields = {
  __typename?: 'RequiredFields';
  fields: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ResendGuestDayPass = {
  __typename?: 'ResendGuestDayPass';
  guestId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ResendOnboardingEmailCommand = {
  __typename?: 'ResendOnboardingEmailCommand';
  email?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type ResendVerificationEmailForBrokerPlatformCommand = {
  __typename?: 'ResendVerificationEmailForBrokerPlatformCommand';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ResetPassword = {
  __typename?: 'ResetPassword';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ResetPasswordCommand = {
  __typename?: 'ResetPasswordCommand';
  password: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum Resource {
  Access = 'ACCESS',
  LeadTenant = 'LEAD_TENANT',
  Room = 'ROOM'
}

export type RestartDoorCommand = {
  __typename?: 'RestartDoorCommand';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RestoreBuildingUnitCommand = {
  __typename?: 'RestoreBuildingUnitCommand';
  unitId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RestoreCompanyCommand = {
  __typename?: 'RestoreCompanyCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RestoreDeal = {
  __typename?: 'RestoreDeal';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RestoreMatchedSpace = {
  __typename?: 'RestoreMatchedSpace';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RestoreShortlistCommand = {
  __typename?: 'RestoreShortlistCommand';
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RevokeLoginForUser = {
  __typename?: 'RevokeLoginForUser';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type RollingCondition = {
  __typename?: 'RollingCondition';
  completed: Scalars['Boolean']['output'];
  exercised: Scalars['Boolean']['output'];
  exercisedDate?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  minimumDate?: Maybe<Timestamp>;
  numberOfMonths: Scalars['Int']['output'];
};

export type RollingConditionInput = {
  completed: Scalars['Boolean']['input'];
  exercised: Scalars['Boolean']['input'];
  exercisedDate?: InputMaybe<TimestampInput>;
  id: Scalars['String']['input'];
  minimumDate?: InputMaybe<TimestampInput>;
  numberOfMonths: Scalars['Int']['input'];
};

export type Room = {
  __typename?: 'Room';
  availability?: Maybe<GetRoomAvailabilityResponse>;
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  image?: Maybe<UploadMessage>;
  imageUploadId: Scalars['String']['output'];
  img: Scalars['String']['output'];
  location?: Maybe<Location>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  people: Scalars['Int']['output'];
  timezone: Scalars['String']['output'];
  user?: Maybe<User>;
};


export type RoomAvailabilityArgs = {
  date: TimestampInput;
  duration: Scalars['Int']['input'];
};

export type RoomCreated = {
  __typename?: 'RoomCreated';
  id: Scalars['String']['output'];
  room?: Maybe<Room>;
  user?: Maybe<User>;
};

export type RoomDeletedEffect = {
  __typename?: 'RoomDeletedEffect';
  id: Scalars['String']['output'];
  room?: Maybe<Room>;
  user?: Maybe<User>;
};

export type RoomEdge = {
  __typename?: 'RoomEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Room>;
  user?: Maybe<User>;
};

export type RoomMutableData = {
  __typename?: 'RoomMutableData';
  capacity: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  imageUploadId?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type RoomOrDeskBooking = {
  __typename?: 'RoomOrDeskBooking';
  bookedBy?: Maybe<Profile>;
  bookedFor?: Maybe<Profile>;
  bookedForUser?: Maybe<User>;
  bookedForUserId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  createdByCompanyId: Scalars['String']['output'];
  createdByUserId: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  desk?: Maybe<Desk>;
  end?: Maybe<DateTime>;
  entityId: Scalars['String']['output'];
  entityType?: Maybe<BookableEntity>;
  id: Scalars['String']['output'];
  room?: Maybe<MeetingRoom>;
  start?: Maybe<DateTime>;
  user?: Maybe<User>;
};

export type RoomOrDeskBookingEdge = {
  __typename?: 'RoomOrDeskBookingEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<RoomOrDeskBooking>;
  user?: Maybe<User>;
};

export type RoomRecoveredEffect = {
  __typename?: 'RoomRecoveredEffect';
  room?: Maybe<Room>;
  user?: Maybe<User>;
};

export type RoomUpdated = {
  __typename?: 'RoomUpdated';
  id: Scalars['String']['output'];
  room?: Maybe<Room>;
  user?: Maybe<User>;
};

export type RoomsConnection = {
  __typename?: 'RoomsConnection';
  edges?: Maybe<Array<RoomEdge>>;
  pageInfo?: Maybe<PageInfo>;
  user?: Maybe<User>;
};

export type RootQuery = {
  __typename?: 'RootQuery';
  accesssvc_GetAccess?: Maybe<GetAccessResponse>;
  accesssvc_GetAccessCode?: Maybe<GetAccessCodeResponse>;
  accesssvc_GetAccesses?: Maybe<GetAccessesResponse>;
  accesssvc_GetPhoto?: Maybe<GetPhotoResponse>;
  accesssvc_GetVideoToken?: Maybe<GetVideoTokenResponse>;
  addonsvc_GetAddon?: Maybe<GetAddonResponse>;
  addonsvc_GetAddons?: Maybe<AddonsConnection>;
  addonsvc_GetPurchase?: Maybe<GetPurchaseResponse>;
  addonsvc_GetPurchases?: Maybe<PurchaseConnection>;
  areasvc_GetBoundaries?: Maybe<GetBoundariesResponse>;
  areasvc_GetBoundary?: Maybe<GetBoundaryResponse>;
  areasvc_GetBoundaryList?: Maybe<GetBoundaryListResponse>;
  areasvc_GetPlace?: Maybe<GetPlaceResponse>;
  areasvc_GetPlaces?: Maybe<GetPlacesResponse>;
  authToken?: Maybe<Scalars['String']['output']>;
  /** Get UK bank holidays based on the region provided as an argument */
  bankholidays_getBankHolidays?: Maybe<BankHoliday>;
  /** Return a boolean value as to whether or not the current date is a bank holiday */
  bankholidays_isTodayABankHoliday?: Maybe<Scalars['Boolean']['output']>;
  bookingsvc_GetAdminRoomBookings?: Maybe<PaginatedBookingsConnection>;
  bookingsvc_GetAmenities?: Maybe<GetAmenitiesResponse>;
  bookingsvc_GetAttendanceState?: Maybe<GetAttendanceStateResponse>;
  bookingsvc_GetBookableRooms?: Maybe<GetBookableRoomsResponse>;
  bookingsvc_GetBooking?: Maybe<Bookingsvc_GetBookingResponse>;
  bookingsvc_GetCapacity?: Maybe<GetCapacityResponse>;
  bookingsvc_GetDeskBookings?: Maybe<GetDeskBookingsResponse>;
  bookingsvc_GetFloorplanZones?: Maybe<GetFloorplanZonesResponse>;
  bookingsvc_GetFloorplansForTenancy?: Maybe<GetFloorplansForTenancyResponse>;
  bookingsvc_GetMinSafeCapacity?: Maybe<GetMinSafeCapacityResponse>;
  bookingsvc_GetMyCompanyDesks?: Maybe<GetMyCompanyDesksResponse>;
  bookingsvc_GetMyDeskBookings?: Maybe<PaginatedBookingsConnection>;
  bookingsvc_GetMyRoomBookings?: Maybe<PaginatedBookingsConnection>;
  bookingsvc_GetRoom?: Maybe<MeetingRoom>;
  bookingsvc_GetRoomBookings?: Maybe<PaginatedBookingsConnection>;
  bookingsvc_GetRooms?: Maybe<Bookingsvc_GetRoomsResponse>;
  bookingsvc_GetTodaysAttendance?: Maybe<AttendanceStateForDate>;
  brochuresvc_GetBrochure?: Maybe<GetBrochureResponse>;
  brochuresvc_GetKittTemplateForEntityGroup?: Maybe<GetKittTemplateForEntityGroupResponse>;
  chatsvc_GetChat?: Maybe<GetChatResponse>;
  chatsvc_GetChatHistory?: Maybe<ChatMessageConnection>;
  chatsvc_GetChats?: Maybe<GetChatsResponse>;
  chatsvc_GetChatsForUser?: Maybe<GetChatsForUserResponse>;
  chatsvc_GetChatsSince?: Maybe<GetClientChatsSinceResponse>;
  chatsvc_GetMessages?: Maybe<GetMessagesResponse>;
  chatsvc_GetMessagesInThread?: Maybe<GetMessagesInThreadResponse>;
  chatsvc_GetUnreadMessages?: Maybe<GetMessagesByChatIdResponse>;
  chatsvc_GetUsersUnreadChatMessages?: Maybe<GetUsersUnreadChatMessagesResponse>;
  companysvc_GetAgencyCompanyForUrl?: Maybe<GetAgencyCompanyForUrlResponse>;
  companysvc_GetAgencyDomains?: Maybe<GetAgencyDomainsResponse>;
  companysvc_GetCompanies?: Maybe<GetCompaniesResponse>;
  companysvc_GetCompaniesForAccountManager?: Maybe<GetCompaniesForAccountManagerResponse>;
  companysvc_GetCompaniesForClientSupportSpecialists?: Maybe<GetCompaniesForClientSupportSpecialistsResponse>;
  companysvc_GetCompany?: Maybe<Company>;
  companysvc_GetCompanySizes?: Maybe<GetCompanySizesResponse>;
  companysvc_GetCultureValues?: Maybe<GetCultureValuesResponse>;
  companysvc_GetHybridWorkInformation?: Maybe<GetHybridWorkInformationResponse>;
  companysvc_GetIndustries?: Maybe<GetIndustriesResponse>;
  companysvc_GetMyAttendancePolicy?: Maybe<GetMyAttendancePolicyResponse>;
  companysvc_GetOfficeValues?: Maybe<GetOfficeValuesResponse>;
  companysvc_GetTenantPriorities?: Maybe<GetTenantPrioritiesResponse>;
  companysvc_GetWhitelistedCompanyForEmail?: Maybe<GetWhitelistedCompanyForEmailResponse>;
  companysvc_GetWorkplaceGoals?: Maybe<GetWorkplaceGoalsResponse>;
  companysvc_GetWorkspaceStatuses?: Maybe<GetWorkspaceStatusesResponse>;
  configuratorsvc_GetConfiguratorSession?: Maybe<GetConfiguratorSessionResponse>;
  dealsvc_GetActivities?: Maybe<GetActivitiesResponse>;
  dealsvc_GetActivity?: Maybe<GetActivityResponse>;
  dealsvc_GetActivityIdsForSelection?: Maybe<GetActivityIdsForSelectionResponse>;
  dealsvc_GetActivityTypes?: Maybe<GetActivityTypesResponse>;
  dealsvc_GetAllSalesTeams?: Maybe<GetAllSalesTeamsResponse>;
  /** Checks whether user is primary broker contact on requested search */
  dealsvc_GetBrokerSearch?: Maybe<GetBrokerSearchResponse>;
  dealsvc_GetDeal?: Maybe<GetDealResponse>;
  dealsvc_GetDealFromBrokerSearch?: Maybe<GetDealFromBrokerSearchResponse>;
  dealsvc_GetDealNotes?: Maybe<GetDealNotesResponse>;
  dealsvc_GetDealShortlists?: Maybe<GetDealShortlistsResponse>;
  dealsvc_GetDealSpaceMatch?: Maybe<GetDealSpaceMatchResponse>;
  dealsvc_GetDealSpaceMatches?: Maybe<GetDealSpaceMatchesResponse>;
  dealsvc_GetDeals?: Maybe<GetDealsResponse>;
  dealsvc_GetDealsList?: Maybe<DealsConnection>;
  dealsvc_GetLeadSources?: Maybe<GetLeadSourcesResponse>;
  dealsvc_GetLostReasons?: Maybe<GetLostReasonsResponse>;
  dealsvc_GetMatchedSpaces?: Maybe<GetMatchedSpacesResponse>;
  dealsvc_GetNote?: Maybe<GetNoteResponse>;
  dealsvc_GetPipelineStages?: Maybe<GetStagesResponse>;
  dealsvc_GetSalesTeam?: Maybe<GetSalesTeamResponse>;
  dealsvc_GetSearchRequirements?: Maybe<GetSearchRequirementsResponse>;
  dealsvc_GetSelectionFromUnitGroupId?: Maybe<Selection>;
  dealsvc_GetShortlist?: Maybe<GetShortlistResponse>;
  dealsvc_GetShortlistSummary?: Maybe<GetShortlistSummaryResponse>;
  dealsvc_GetTemplate?: Maybe<GetTemplateResponse>;
  dealsvc_GetTemplates?: Maybe<GetTemplatesResponse>;
  dealsvc_GetThreadDeals?: Maybe<GetThreadDealsResponse>;
  /**
   * Gets all broker searches user has created and all searches connected to deals
   * of which their profile id is the primary broker contact id
   */
  dealsvc_GetUserBrokerSearches?: Maybe<GetUserBrokerSearchesResponse>;
  dealsvc_GetUserShortlists?: Maybe<GetUserShortlistsResponse>;
  dealsvc_GetUserViewingRequests?: Maybe<GetUserViewingRequestsResponse>;
  dealsvc_GetUserViewings?: Maybe<GetUserViewingsResponse>;
  dealsvc_GetViewingRequestsForShortlist?: Maybe<GetViewingRequestsForShortlistResponse>;
  deploymentsvc_GetReadinessState?: Maybe<GetReadinessStateResponse>;
  deploymentsvc_GetStatus?: Maybe<GetDeploymentStatusResponse>;
  devsvc_GetDeployments?: Maybe<GetDeploymentsResponse>;
  documentsvc_GetDocument?: Maybe<GetDocumentResponse>;
  documentsvc_GetDocumentTypes?: Maybe<GetDocumentTypesResponse>;
  documentsvc_GetDocuments?: Maybe<GetDocumentsResponse>;
  documentsvc_GetVersionedDocuments?: Maybe<GetVersionedDocumentsResponse>;
  enquirysvc_GetAllEnquiries?: Maybe<GetAllEnquiriesResponse>;
  enquirysvc_GetAllEnquiryStatuses?: Maybe<GetAllEnquiryStatusesResponse>;
  enquirysvc_GetAllQuoteStatuses?: Maybe<GetAllQuoteStatusesResponse>;
  /** Gets enquiries; if onlyMine is true, only returns enquiries for companies that the user is an account manager for */
  enquirysvc_GetEnquiriesPaginated?: Maybe<GetEnquiriesPaginatedResponse>;
  enquirysvc_GetEnquiry?: Maybe<GetEnquiryResponse>;
  enquirysvc_GetMyCompanyEnquiries?: Maybe<GetMyCompanyEnquiriesResponse>;
  favouritesvc_GetFavourites?: Maybe<GetFavouritesResponse>;
  feedbacksvc_CanShowFeaturesToUser?: Maybe<CanShowFeaturesToUserResponse>;
  gmailsvc_GetEmail?: Maybe<GetEmailResponse>;
  gmailsvc_GetEmailContent?: Maybe<GetEmailContentResponse>;
  gmailsvc_GetEmails?: Maybe<GetEmailsResponse>;
  gmailsvc_GetSharedInboxes?: Maybe<GetSharedInboxesResponse>;
  guestsvc_GetAccesses?: Maybe<GetGuestAccessesResponse>;
  guestsvc_GetCompanyGuests?: Maybe<GetCompanyGuestsResponse>;
  guestsvc_GetGuest?: Maybe<GetGuestResponse>;
  guestsvc_GetGuests?: Maybe<GetGuestsResponse>;
  guestsvc_GetMyGuestsPaginated?: Maybe<GuestConnection>;
  iamsvc_GetModel?: Maybe<GetModelResponse>;
  iamsvc_GetPermissions?: Maybe<GetPermissionsResponse>;
  iamsvc_GetPolicies?: Maybe<GetPoliciesResponse>;
  iamsvc_MyPermissions?: Maybe<GetPermissionsResponse>;
  insightsvc_GetAccessLogs?: Maybe<GetAccessLogsResponse>;
  insightsvc_GetAverageAccessesByCompany?: Maybe<GetAverageAccessesByCompanyResponse>;
  insightsvc_GetAverageAttendancePerWeek?: Maybe<GetAverageAttendancePerWeekResponse>;
  insightsvc_GetBusiestDayOfTheWeek?: Maybe<GetBusiestDayOfTheWeekResponse>;
  insightsvc_GetCompanyOfficeAttendance?: Maybe<GetCompanyOfficeAttendanceResponse>;
  insightsvc_GetCompanyWeeklyOfficeAttendance?: Maybe<GetCompanyWeeklyOfficeAttendanceResponse>;
  insightsvc_GetDealInsights?: Maybe<GetDealInsightsResponse>;
  insightsvc_GetIndustryInsights?: Maybe<GetIndustryInsightsResponse>;
  insightsvc_GetMeanAgeForCompany?: Maybe<GetMeanAgeForCompanyResponse>;
  insightsvc_GetMyOfficeAttendance?: Maybe<GetMyOfficeAttendanceResponse>;
  insightsvc_GetOfficeAttendance?: Maybe<GetOfficeAttendanceResponse>;
  insightsvc_GetOfficeInsights?: Maybe<GetOfficeInsightsResponse>;
  insightsvc_GetQuietestDayOfTheWeek?: Maybe<GetQuietestDayOfTheWeekResponse>;
  issuesvc_GetCategories?: Maybe<GetIssueCategoriesResponse>;
  issuesvc_GetIssue?: Maybe<GetIssueResponse>;
  issuesvc_GetIssueUpdateWorkflows?: Maybe<GetIssueUpdateWorkflowsResponse>;
  issuesvc_GetIssueUpdates?: Maybe<GetIssueUpdatesResponse>;
  issuesvc_GetIssues?: Maybe<IssuesConnection>;
  issuesvc_GetMyCompanyIssues?: Maybe<IssuesConnection>;
  /** Gets issues for a user, also gets issues for their location if they are a lead tenant */
  issuesvc_GetMyIssues?: Maybe<IssuesConnection>;
  issuesvc_GetPriorities?: Maybe<GetIssuePrioritiesResponse>;
  issuesvc_GetStatuses?: Maybe<GetIssueStatusesResponse>;
  locationsvc_GetAreas?: Maybe<GetAreasResponse>;
  locationsvc_GetBuilding?: Maybe<GetBuildingResponse>;
  locationsvc_GetBuildingTraits?: Maybe<GetBuildingTraitsResponse>;
  locationsvc_GetCombinationDetails?: Maybe<GetCombinationDetailsResponse>;
  locationsvc_GetCommercialModel?: Maybe<GetCommercialModelResponse>;
  /** Get Locations with enhanced args (Favourites etc...) */
  locationsvc_GetEnhancedLocations?: Maybe<GetLocationsPaginatedResponse>;
  locationsvc_GetFacilities?: Maybe<GetLocationFacilitiesResponse>;
  locationsvc_GetFieldsRequiredForNextStatus?: Maybe<GetFieldsRequiredForNextStatusResponse>;
  locationsvc_GetLocation?: Maybe<GetLocationResponse>;
  locationsvc_GetLocationForVerification?: Maybe<GetLocationResponse>;
  locationsvc_GetLocationsPaginated?: Maybe<LocationsConnection>;
  locationsvc_GetPaginatedLocations?: Maybe<GetLocationsPaginatedResponse>;
  locationsvc_GetPricing?: Maybe<GetPricingResponse>;
  locationsvc_GetSellingPoints?: Maybe<GetLocationSellingPointsResponse>;
  locationsvc_GetSpaceMatchLocations?: Maybe<GetSpaceMatchLocationsResponse>;
  locationsvc_GetSpaceMatchLocationsV2?: Maybe<GetSpaceMatchLocationsResponse>;
  locationsvc_GetTrainStationsForLocation?: Maybe<GetTrainStationsForLocationResponse>;
  marketing_contentsvc_GetMarketingContent?: Maybe<GetMarketingContentResponse>;
  marketing_contentsvc_GetMarketingContents?: Maybe<GetMarketingContentsResponse>;
  me?: Maybe<User>;
  metasvc_GetPermissions?: Maybe<GetPermissionKeysResponse>;
  notificationsvc_GetMyNotificationPreferences?: Maybe<GetMyNotificationPreferencesResponse>;
  notificationsvc_GetNotifications?: Maybe<GetNotificationsResponse>;
  notificationsvc_GetNotificationsPaginated?: Maybe<NotificationsConnection>;
  ordersvc_DoesOrderMeetMSABaseline?: Maybe<DoesOrderMeetMsaBaselineResponse>;
  ordersvc_GetCategories?: Maybe<GetOrderCategoriesResponse>;
  ordersvc_GetOrderHistory?: Maybe<OrderList>;
  ordersvc_GetSubscribedCategoryGroupsForTenancy?: Maybe<GetSubscribedCategoryGroupsForTenancyResponse>;
  /** Get Products with enhanced args (Favourites etc...) */
  productsvc_GetEnhancedProducts?: Maybe<GetProductsResponse>;
  productsvc_GetProduct?: Maybe<GetProductResponse>;
  productsvc_GetProducts?: Maybe<GetProductsResponse>;
  profilesvc_GetProfile?: Maybe<GetProfileResponse>;
  profilesvc_GetProfileForEmail?: Maybe<GetProfileResponse>;
  profilesvc_GetProfiles?: Maybe<GetProfilesResponse>;
  profilesvc_GetProfilesList?: Maybe<ProfilesConnection>;
  profilesvc_GetUserIdsWithNoTeam?: Maybe<GetUserIdsWithNoTeamResponse>;
  requestsvc_GetAssignee?: Maybe<GetAssigneeResponse>;
  requestsvc_GetAssignments?: Maybe<GetAssignmentsResponse>;
  requestsvc_GetCategories?: Maybe<GetCategoriesResponse>;
  requestsvc_GetEvent?: Maybe<GetEventResponse>;
  requestsvc_GetEvents?: Maybe<GetEventsResponse>;
  requestsvc_GetOrderedPriorities?: Maybe<GetOrderedPrioritiesResponse>;
  requestsvc_GetPriorities?: Maybe<GetPrioritiesResponse>;
  requestsvc_GetRequest?: Maybe<GetRequestResponse>;
  requestsvc_GetRequests?: Maybe<GetRequestsResponse>;
  roomsvc_CheckAvailability?: Maybe<CheckAvailabilityResponse>;
  roomsvc_GetBooking?: Maybe<GetBookingResponse>;
  roomsvc_GetBookings?: Maybe<GetBookingsResponse>;
  roomsvc_GetMyBookings?: Maybe<GetBookingsResponse>;
  roomsvc_GetMyBookingsPaginated?: Maybe<BookingsConnection>;
  roomsvc_GetMyRooms?: Maybe<GetRoomsResponse>;
  roomsvc_GetRoom?: Maybe<Room>;
  roomsvc_GetRoomAvailabilitySlots?: Maybe<GetRoomAvailabilityResponse>;
  roomsvc_GetRooms?: Maybe<GetRoomsResponse>;
  roomsvc_GetRoomsPaginated?: Maybe<RoomsConnection>;
  schedulersvc_GetSchedules?: Maybe<GetSchedulesResponse>;
  searchsvc_GetBookingsTimeline?: Maybe<BookingTimelineConnection>;
  searchsvc_GetCompanies?: Maybe<SearchGetCompaniesResponse>;
  searchsvc_GetDealTimeline?: Maybe<SearchGetDealTimelineResponse>;
  searchsvc_GetDeals?: Maybe<SearchGetDealsResponse>;
  searchsvc_GetIndexKey?: Maybe<GetIndexKeyResponse>;
  searchsvc_GetIssues?: Maybe<SearchGetIssuesResponse>;
  searchsvc_GetLocations?: Maybe<SearchGetLocationsResponse>;
  searchsvc_GetLocationsInbox?: Maybe<SearchGetLocationsInboxResponse>;
  searchsvc_GetRequests?: Maybe<SearchGetRequestsResponse>;
  searchsvc_GetServiceActivities?: Maybe<GetServiceActivitiesResponse>;
  searchsvc_GetUnits?: Maybe<SearchGetUnitsResponse>;
  searchsvc_GetUsers?: Maybe<SearchGetUsersResponse>;
  searchsvc_SearchAccesses?: Maybe<Records>;
  searchsvc_SearchProfiles?: Maybe<Records>;
  tenancysvc_GetAllMoveInTenancies?: Maybe<GetTenanciesList>;
  tenancysvc_GetFloorplanZonesForTenancy?: Maybe<GetFloorplanZonesForTenancyResponse>;
  tenancysvc_GetTenancies?: Maybe<GetTenanciesResponse>;
  tenancysvc_GetTenanciesList?: Maybe<GetTenanciesList>;
  tenancysvc_GetTenancy?: Maybe<GetTenancyResponse>;
  tenancysvc_GetTenancyFinancialModel?: Maybe<GetTenancyFinancialModelResponse>;
  tenancysvc_GetTenancyTodosPaginated?: Maybe<TenancyTodosConnection>;
  tenancysvc_GetTimelineStageCounts?: Maybe<GetTimelineStageCountsResponse>;
  tenancysvc_GetUnitTenancies?: Maybe<GetUnitTenanciesResponse>;
  tenancysvc_PreviewTenancyTimeline?: Maybe<TimelineStages>;
  threadsvc_GetArchivedMessages?: Maybe<GetArchivedMessagesResponse>;
  threadsvc_GetMessages?: Maybe<ThreadGetMessagesResponse>;
  threadsvc_GetThread?: Maybe<ThreadsGetThreadResponse>;
  threadsvc_GetThreads?: Maybe<GetThreadsResponse>;
  unitsvc_GetBusinessRatesForUnit?: Maybe<GetBusinessRatesForUnitResponse>;
  unitsvc_GetDetailsForUnits?: Maybe<GetDetailsForUnitsResponse>;
  unitsvc_GetUnit?: Maybe<GetUnitResponse>;
  unitsvc_GetUnitFinancialModel?: Maybe<GetUnitFinancialModelResponse>;
  unitsvc_GetUnits?: Maybe<GetUnitsResponse>;
  uploadsvc_GeneratePdf?: Maybe<GeneratePdfRequestSubmitted>;
  uploadsvc_GetUpload?: Maybe<GetUploadResponse>;
  uploadsvc_GetUploads?: Maybe<GetUploadsResponse>;
  uploadsvc_Upload?: Maybe<UploadMessage>;
  usersvc_ExchangeToken?: Maybe<LoginResponse>;
  usersvc_GetCompanyUsers?: Maybe<GetCompanyUsersResponse>;
  usersvc_GetOrderedUsers?: Maybe<GetOrderedUsersResponse>;
  usersvc_GetUser?: Maybe<User>;
  usersvc_GetUsers?: Maybe<GetUsersResponse>;
  usersvc_GoogleAuthToken?: Maybe<GetGoogleAccessTokenResponse>;
  usersvc_GoogleLogin?: Maybe<GoogleLoginResponse>;
  usersvc_Login?: Maybe<LoginResponse>;
  usersvc_VerifyPasswordResetToken?: Maybe<VerifyPasswordResetTokenResponse>;
  usersvc_VerifyPhone?: Maybe<VerifyPhoneResponse>;
  visitsvc_GetMyVisits?: Maybe<VisitsConnection>;
  visitsvc_GetVisit?: Maybe<Visit>;
  visitsvc_GetVisits?: Maybe<VisitsConnection>;
};


export type RootQueryAccesssvc_GetAccessArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryAccesssvc_GetAccessCodeArgs = {
  subjectId: Scalars['String']['input'];
};


export type RootQueryAccesssvc_GetAccessesArgs = {
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  managed?: InputMaybe<Scalars['Boolean']['input']>;
  testtestetst?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryAccesssvc_GetPhotoArgs = {
  accessId: Scalars['String']['input'];
};


export type RootQueryAccesssvc_GetVideoTokenArgs = {
  accessId: Scalars['String']['input'];
};


export type RootQueryAddonsvc_GetAddonArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryAddonsvc_GetAddonsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryAddonsvc_GetPurchaseArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryAddonsvc_GetPurchasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  scheduleIds?: InputMaybe<Array<Scalars['String']['input']>>;
  tenancyId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryAreasvc_GetBoundariesArgs = {
  coords?: InputMaybe<Array<AreaGeoPointInput>>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  level: Scalars['Int']['input'];
  placeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryAreasvc_GetBoundaryArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryAreasvc_GetBoundaryListArgs = {
  coords?: InputMaybe<Array<AreaGeoPointInput>>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  level: Scalars['Int']['input'];
  placeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryAreasvc_GetPlaceArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryAreasvc_GetPlacesArgs = {
  ids: Array<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryBankholidays_GetBankHolidaysArgs = {
  region: Scalars['String']['input'];
};


export type RootQueryBankholidays_IsTodayABankHolidayArgs = {
  date: DateInput;
  region: Scalars['String']['input'];
};


export type RootQueryBookingsvc_GetAdminRoomBookingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  end?: InputMaybe<DateTimeInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  roomIds?: InputMaybe<Array<Scalars['String']['input']>>;
  start?: InputMaybe<DateTimeInput>;
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryBookingsvc_GetAmenitiesArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  entityTypes?: InputMaybe<Array<BookableEntity>>;
};


export type RootQueryBookingsvc_GetAttendanceStateArgs = {
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryBookingsvc_GetBookableRoomsArgs = {
  amenityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  bookingEnd?: InputMaybe<DateTimeInput>;
  bookingStart?: InputMaybe<DateTimeInput>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  roomIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryBookingsvc_GetBookingArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryBookingsvc_GetCapacityArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryBookingsvc_GetDeskBookingsArgs = {
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  startUtcMax?: InputMaybe<DateTimeInput>;
  startUtcMin?: InputMaybe<DateTimeInput>;
};


export type RootQueryBookingsvc_GetFloorplanZonesArgs = {
  tenancyId: Scalars['String']['input'];
};


export type RootQueryBookingsvc_GetFloorplansForTenancyArgs = {
  tenancyIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryBookingsvc_GetMinSafeCapacityArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryBookingsvc_GetMyCompanyDesksArgs = {
  tenancyIds: Array<Scalars['String']['input']>;
};


export type RootQueryBookingsvc_GetMyDeskBookingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  end?: InputMaybe<DateTimeInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  start?: InputMaybe<DateTimeInput>;
};


export type RootQueryBookingsvc_GetMyRoomBookingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  end?: InputMaybe<DateTimeInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  roomIds?: InputMaybe<Array<Scalars['String']['input']>>;
  start?: InputMaybe<DateTimeInput>;
};


export type RootQueryBookingsvc_GetRoomArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryBookingsvc_GetRoomBookingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  end?: InputMaybe<DateTimeInput>;
  filterToMyCompany?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  roomIds?: InputMaybe<Array<Scalars['String']['input']>>;
  start?: InputMaybe<DateTimeInput>;
};


export type RootQueryBookingsvc_GetRoomsArgs = {
  ids: Array<Scalars['String']['input']>;
  locationIds: Array<Scalars['String']['input']>;
};


export type RootQueryBookingsvc_GetTodaysAttendanceArgs = {
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryBrochuresvc_GetBrochureArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryBrochuresvc_GetKittTemplateForEntityGroupArgs = {
  entityIds: Array<Scalars['String']['input']>;
};


export type RootQueryChatsvc_GetChatArgs = {
  chatId: Scalars['String']['input'];
  showArchived?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryChatsvc_GetChatHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<GetChatHistoryOrder>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryChatsvc_GetChatsArgs = {
  chatIds?: InputMaybe<Array<Scalars['String']['input']>>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: InputMaybe<Scalars['Int']['input']>;
  showArchived?: InputMaybe<Scalars['Boolean']['input']>;
  types?: InputMaybe<Array<ChatType>>;
  userId?: InputMaybe<Scalars['String']['input']>;
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryChatsvc_GetChatsForUserArgs = {
  types?: InputMaybe<Array<ChatType>>;
};


export type RootQueryChatsvc_GetChatsSinceArgs = {
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  since?: InputMaybe<DateTimeInput>;
};


export type RootQueryChatsvc_GetMessagesArgs = {
  chatId: Scalars['String']['input'];
};


export type RootQueryChatsvc_GetMessagesInThreadArgs = {
  parentMessageId: Scalars['String']['input'];
};


export type RootQueryChatsvc_GetUnreadMessagesArgs = {
  chatIds: Array<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  userIds: Array<Scalars['String']['input']>;
};


export type RootQueryChatsvc_GetUsersUnreadChatMessagesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetAgencyCompanyForUrlArgs = {
  url: Scalars['String']['input'];
};


export type RootQueryCompanysvc_GetAgencyDomainsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetCompaniesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  priorityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
  types?: InputMaybe<Array<CompanyType>>;
};


export type RootQueryCompanysvc_GetCompaniesForAccountManagerArgs = {
  accountManagerUserId: Scalars['String']['input'];
};


export type RootQueryCompanysvc_GetCompaniesForClientSupportSpecialistsArgs = {
  clientSupportSpecialistUserIds: Array<Scalars['String']['input']>;
};


export type RootQueryCompanysvc_GetCompanyArgs = {
  companyId: Scalars['String']['input'];
};


export type RootQueryCompanysvc_GetCompanySizesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetCultureValuesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetHybridWorkInformationArgs = {
  companyId: Scalars['String']['input'];
};


export type RootQueryCompanysvc_GetIndustriesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetMyAttendancePolicyArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetOfficeValuesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetTenantPrioritiesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetWhitelistedCompanyForEmailArgs = {
  email: Scalars['String']['input'];
};


export type RootQueryCompanysvc_GetWorkplaceGoalsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryCompanysvc_GetWorkspaceStatusesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryConfiguratorsvc_GetConfiguratorSessionArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetActivitiesArgs = {
  assigneeIds: Array<Scalars['String']['input']>;
  collaboratorIds: Array<Scalars['String']['input']>;
  completedAfter?: InputMaybe<TimestampInput>;
  completedBefore?: InputMaybe<TimestampInput>;
  dealIds: Array<Scalars['String']['input']>;
  dueAfter?: InputMaybe<TimestampInput>;
  dueBefore?: InputMaybe<TimestampInput>;
  googleCalendarIds: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
  includeCompleted: Scalars['Boolean']['input'];
  limit: Scalars['Int']['input'];
  order?: InputMaybe<ActivityOrder>;
  page: Scalars['Int']['input'];
  startingAfter?: InputMaybe<TimestampInput>;
  startingBefore?: InputMaybe<TimestampInput>;
  titleQuery: Scalars['String']['input'];
  types: Array<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetActivityArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetActivityIdsForSelectionArgs = {
  unitGroupId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetActivityTypesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetAllSalesTeamsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetBrokerSearchArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetDealArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetDealFromBrokerSearchArgs = {
  brokerSearchId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetDealNotesArgs = {
  dealId: Scalars['String']['input'];
  ids: Array<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetDealShortlistsArgs = {
  dealId?: InputMaybe<Scalars['String']['input']>;
  primaryBrokerContactId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetDealSpaceMatchArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetDealSpaceMatchesArgs = {
  dealId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetDealsArgs = {
  filters?: InputMaybe<DealFiltersInput>;
  ids: Array<Scalars['String']['input']>;
  limit: Scalars['Int']['input'];
  order?: InputMaybe<DealOrder>;
  page: Scalars['Int']['input'];
  stageId: Scalars['String']['input'];
  stageIds: Array<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetDealsListArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryDealsvc_GetLeadSourcesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetLostReasonsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetMatchedSpacesArgs = {
  dealId: Scalars['String']['input'];
  includeDeleted: Scalars['Boolean']['input'];
  requirementsId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetNoteArgs = {
  noteId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetPipelineStagesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetSalesTeamArgs = {
  brokerCompanyId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetSearchRequirementsArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetSelectionFromUnitGroupIdArgs = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  unitGroupId: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetShortlistArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetShortlistSummaryArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetTemplateArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDealsvc_GetTemplatesArgs = {
  createdBy: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
  query: Scalars['String']['input'];
  tags: Array<Scalars['String']['input']>;
  types?: InputMaybe<Array<TemplateType>>;
};


export type RootQueryDealsvc_GetThreadDealsArgs = {
  threadIds: Array<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetUserBrokerSearchesArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetUserShortlistsArgs = {
  containingUnitGroupIds?: InputMaybe<Array<Scalars['String']['input']>>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  excludeUnitGroupIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeShortlistsByProfileId?: InputMaybe<Scalars['String']['input']>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  onlyShared?: InputMaybe<Scalars['Boolean']['input']>;
  onlyUserMade?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetUserViewingRequestsArgs = {
  onlyUpcoming?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDealsvc_GetUserViewingsArgs = {
  includeViewingsByProfileId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDealsvc_GetViewingRequestsForShortlistArgs = {
  shortlistId: Scalars['String']['input'];
};


export type RootQueryDeploymentsvc_GetReadinessStateArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDeploymentsvc_GetStatusArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryDevsvc_GetDeploymentsArgs = {
  service?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryDocumentsvc_GetDocumentArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryDocumentsvc_GetDocumentTypesArgs = {
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  metadata?: InputMaybe<Array<MetadataInput>>;
};


export type RootQueryDocumentsvc_GetDocumentsArgs = {
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  metadata?: InputMaybe<Array<MetadataInput>>;
  typeIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryDocumentsvc_GetVersionedDocumentsArgs = {
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  metadata?: InputMaybe<Array<MetadataInput>>;
  typeIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryEnquirysvc_GetAllEnquiriesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryEnquirysvc_GetAllEnquiryStatusesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryEnquirysvc_GetAllQuoteStatusesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryEnquirysvc_GetEnquiriesPaginatedArgs = {
  filters?: InputMaybe<EnquiryFiltersInput>;
  limit: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
};


export type RootQueryEnquirysvc_GetEnquiryArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryEnquirysvc_GetMyCompanyEnquiriesArgs = {
  after: Scalars['String']['input'];
  first: Scalars['Int']['input'];
  status?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryFavouritesvc_GetFavouritesArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryFeedbacksvc_CanShowFeaturesToUserArgs = {
  features?: InputMaybe<Array<TenantAppFeature>>;
};


export type RootQueryGmailsvc_GetEmailArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryGmailsvc_GetEmailContentArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type RootQueryGmailsvc_GetEmailsArgs = {
  emailAddress: Array<Scalars['String']['input']>;
  gmailThreadId: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
};


export type RootQueryGmailsvc_GetSharedInboxesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryGuestsvc_GetAccessesArgs = {
  token: Scalars['String']['input'];
};


export type RootQueryGuestsvc_GetCompanyGuestsArgs = {
  companyId: Scalars['String']['input'];
  locationIds: Array<Scalars['String']['input']>;
  registeredBetween?: InputMaybe<GuestDateRangeInput>;
};


export type RootQueryGuestsvc_GetGuestArgs = {
  guestId?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryGuestsvc_GetGuestsArgs = {
  locationIds: Array<Scalars['String']['input']>;
  registeredBetween?: InputMaybe<GuestDateRangeInput>;
};


export type RootQueryGuestsvc_GetMyGuestsPaginatedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  visitAfter?: InputMaybe<TimestampInput>;
  visitBefore?: InputMaybe<TimestampInput>;
};


export type RootQueryIamsvc_GetModelArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryIamsvc_GetPermissionsArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryIamsvc_GetPoliciesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryIamsvc_MyPermissionsArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryInsightsvc_GetAccessLogsArgs = {
  accessIds?: InputMaybe<Array<Scalars['String']['input']>>;
  after?: InputMaybe<Scalars['String']['input']>;
  afterTime?: InputMaybe<TimestampInput>;
  beforeTime?: InputMaybe<TimestampInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryInsightsvc_GetAverageAccessesByCompanyArgs = {
  companyId: Scalars['String']['input'];
};


export type RootQueryInsightsvc_GetAverageAttendancePerWeekArgs = {
  companyId: Scalars['String']['input'];
  end?: InputMaybe<DateInput>;
  start?: InputMaybe<DateInput>;
};


export type RootQueryInsightsvc_GetBusiestDayOfTheWeekArgs = {
  companyId: Scalars['String']['input'];
  end?: InputMaybe<DateInput>;
  start?: InputMaybe<DateInput>;
};


export type RootQueryInsightsvc_GetCompanyOfficeAttendanceArgs = {
  companyId: Scalars['String']['input'];
  end?: InputMaybe<DateInput>;
  granularity?: InputMaybe<PeriodDataGranularity>;
  start?: InputMaybe<DateInput>;
};


export type RootQueryInsightsvc_GetCompanyWeeklyOfficeAttendanceArgs = {
  companyId: Scalars['String']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryInsightsvc_GetDealInsightsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryInsightsvc_GetIndustryInsightsArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  companySizeId: Scalars['String']['input'];
  dayPositions?: InputMaybe<Array<Scalars['Int']['input']>>;
  industryId: Scalars['String']['input'];
};


export type RootQueryInsightsvc_GetMeanAgeForCompanyArgs = {
  companyId: Scalars['String']['input'];
};


export type RootQueryInsightsvc_GetMyOfficeAttendanceArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryInsightsvc_GetOfficeAttendanceArgs = {
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  startUtcMax?: InputMaybe<DateTimeInput>;
  startUtcMin?: InputMaybe<DateTimeInput>;
};


export type RootQueryInsightsvc_GetOfficeInsightsArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  dateRange?: InputMaybe<DateRangeInput>;
  dayPositions?: InputMaybe<Array<Scalars['Int']['input']>>;
};


export type RootQueryInsightsvc_GetQuietestDayOfTheWeekArgs = {
  companyId: Scalars['String']['input'];
  end?: InputMaybe<DateInput>;
  start?: InputMaybe<DateInput>;
};


export type RootQueryIssuesvc_GetCategoriesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryIssuesvc_GetIssueArgs = {
  filters?: InputMaybe<IssueFiltersInput>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryIssuesvc_GetIssueUpdateWorkflowsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryIssuesvc_GetIssueUpdatesArgs = {
  IssueId: Scalars['String']['input'];
};


export type RootQueryIssuesvc_GetIssuesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<IssueFiltersInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<IssuesSortBy>;
};


export type RootQueryIssuesvc_GetMyCompanyIssuesArgs = {
  after: Scalars['String']['input'];
  companyId?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  group?: InputMaybe<CompanyIssueGroup>;
};


export type RootQueryIssuesvc_GetMyIssuesArgs = {
  after: Scalars['String']['input'];
  first: Scalars['Int']['input'];
  statusIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryIssuesvc_GetPrioritiesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryIssuesvc_GetStatusesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryLocationsvc_GetAreasArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryLocationsvc_GetBuildingArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryLocationsvc_GetBuildingTraitsArgs = {
  types?: InputMaybe<Array<BuildingTraitType>>;
};


export type RootQueryLocationsvc_GetCombinationDetailsArgs = {
  unitIds: Array<Scalars['String']['input']>;
};


export type RootQueryLocationsvc_GetCommercialModelArgs = {
  inputs?: InputMaybe<CommercialModelInputsInput>;
};


export type RootQueryLocationsvc_GetEnhancedLocationsArgs = {
  address?: InputMaybe<AddressInput>;
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  boundaryId?: InputMaybe<Scalars['String']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hideExistingOffer?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyVisibleOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
  potentialProductFilters?: InputMaybe<PotentialProductFiltersInput>;
  productFilters?: InputMaybe<LocationProductFiltersInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  qualifiedBetween?: InputMaybe<DateRangeInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<LocationSortBy>;
  sortByCoordinates?: InputMaybe<CoordinateInput>;
  statuses?: InputMaybe<Array<LocationStatus>>;
  unitFilters?: InputMaybe<UnitFiltersInput>;
  unqualified?: InputMaybe<Scalars['Boolean']['input']>;
  unverified?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedBetween?: InputMaybe<DateRangeInput>;
};


export type RootQueryLocationsvc_GetFacilitiesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryLocationsvc_GetFieldsRequiredForNextStatusArgs = {
  locationId: Scalars['String']['input'];
  status?: InputMaybe<StatusOptionalInput>;
};


export type RootQueryLocationsvc_GetLocationArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryLocationsvc_GetLocationForVerificationArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryLocationsvc_GetLocationsPaginatedArgs = {
  address?: InputMaybe<AddressInput>;
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hideExistingOffer?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyVisibleOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
  potentialProductFilters?: InputMaybe<PotentialProductFiltersInput>;
  productFilters?: InputMaybe<LocationProductFiltersInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  qualifiedBetween?: InputMaybe<DateRangeInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<LocationSortBy>;
  sortByCoordinates?: InputMaybe<CoordinateInput>;
  statuses?: InputMaybe<Array<LocationStatus>>;
  unitFilters?: InputMaybe<UnitFiltersInput>;
  unqualified?: InputMaybe<Scalars['Boolean']['input']>;
  unverified?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedBetween?: InputMaybe<DateRangeInput>;
};


export type RootQueryLocationsvc_GetPaginatedLocationsArgs = {
  address?: InputMaybe<AddressInput>;
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hideExistingOffer?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyVisibleOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
  potentialProductFilters?: InputMaybe<PotentialProductFiltersInput>;
  productFilters?: InputMaybe<LocationProductFiltersInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  qualifiedBetween?: InputMaybe<DateRangeInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<LocationSortBy>;
  sortByCoordinates?: InputMaybe<CoordinateInput>;
  statuses?: InputMaybe<Array<LocationStatus>>;
  unitFilters?: InputMaybe<UnitFiltersInput>;
  unqualified?: InputMaybe<Scalars['Boolean']['input']>;
  unverified?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedBetween?: InputMaybe<DateRangeInput>;
};


export type RootQueryLocationsvc_GetPricingArgs = {
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
  tierInputs?: InputMaybe<TierInputsInput>;
  unitIds: Array<Scalars['String']['input']>;
};


export type RootQueryLocationsvc_GetSellingPointsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryLocationsvc_GetSpaceMatchLocationsArgs = {
  address?: InputMaybe<AddressInput>;
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hideExistingOffer?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyVisibleOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
  potentialProductFilters?: InputMaybe<PotentialProductFiltersInput>;
  productFilters?: InputMaybe<LocationProductFiltersInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  qualifiedBetween?: InputMaybe<DateRangeInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<LocationSortBy>;
  sortByCoordinates?: InputMaybe<CoordinateInput>;
  statuses?: InputMaybe<Array<LocationStatus>>;
  unitFilters?: InputMaybe<UnitFiltersInput>;
  unqualified?: InputMaybe<Scalars['Boolean']['input']>;
  unverified?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedBetween?: InputMaybe<DateRangeInput>;
};


export type RootQueryLocationsvc_GetSpaceMatchLocationsV2Args = {
  address?: InputMaybe<AddressInput>;
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hideExistingOffer?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isKittChoice?: InputMaybe<Scalars['Boolean']['input']>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyVisibleOnWebsite?: InputMaybe<Scalars['Boolean']['input']>;
  polygonArray?: InputMaybe<Array<CoordinateInput>>;
  potentialProductFilters?: InputMaybe<PotentialProductFiltersInput>;
  productFilters?: InputMaybe<LocationProductFiltersInput>;
  publishedState?: InputMaybe<Scalars['Boolean']['input']>;
  qualifiedBetween?: InputMaybe<DateRangeInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<LocationSortBy>;
  sortByCoordinates?: InputMaybe<CoordinateInput>;
  statuses?: InputMaybe<Array<LocationStatus>>;
  unitFilters?: InputMaybe<UnitFiltersInput>;
  unqualified?: InputMaybe<Scalars['Boolean']['input']>;
  unverified?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedBetween?: InputMaybe<DateRangeInput>;
};


export type RootQueryLocationsvc_GetTrainStationsForLocationArgs = {
  locationId: Scalars['String']['input'];
};


export type RootQueryMarketing_Contentsvc_GetMarketingContentArgs = {
  id: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  unitId: Scalars['String']['input'];
};


export type RootQueryMarketing_Contentsvc_GetMarketingContentsArgs = {
  area: Scalars['String']['input'];
  locationIds: Array<Scalars['String']['input']>;
  marketingContentIds: Array<Scalars['String']['input']>;
  marketingStatus?: InputMaybe<MarketingStatusInput>;
};


export type RootQueryMetasvc_GetPermissionsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryNotificationsvc_GetMyNotificationPreferencesArgs = {
  metadata?: InputMaybe<Array<NotificationPreferenceMetadataInput>>;
};


export type RootQueryNotificationsvc_GetNotificationsArgs = {
  limit: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
  onlyUnread?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryNotificationsvc_GetNotificationsPaginatedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  orderByUnread?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryOrdersvc_DoesOrderMeetMsaBaselineArgs = {
  orders?: InputMaybe<Array<OrderInputInput>>;
  tenancyId: Scalars['String']['input'];
};


export type RootQueryOrdersvc_GetCategoriesArgs = {
  groupId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryOrdersvc_GetOrderHistoryArgs = {
  categoryId: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
};


export type RootQueryOrdersvc_GetSubscribedCategoryGroupsForTenancyArgs = {
  tenancyId: Scalars['String']['input'];
};


export type RootQueryProductsvc_GetEnhancedProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  boundaryId?: InputMaybe<Scalars['String']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  favourites?: InputMaybe<Scalars['Boolean']['input']>;
  filters?: InputMaybe<ProductFiltersInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  rankAllProducts?: InputMaybe<Scalars['Boolean']['input']>;
  sortBy?: InputMaybe<ProductSortBy>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryProductsvc_GetProductArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryProductsvc_GetProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  filters?: InputMaybe<ProductFiltersInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  onMarket?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  rankAllProducts?: InputMaybe<Scalars['Boolean']['input']>;
  sortBy?: InputMaybe<ProductSortBy>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryProfilesvc_GetProfileArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryProfilesvc_GetProfileForEmailArgs = {
  email: Scalars['String']['input'];
};


export type RootQueryProfilesvc_GetProfilesArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryProfilesvc_GetProfilesListArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryProfilesvc_GetUserIdsWithNoTeamArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryRequestsvc_GetAssigneeArgs = {
  categoryId: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
};


export type RootQueryRequestsvc_GetAssignmentsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryRequestsvc_GetCategoriesArgs = {
  categoryIds: Array<Scalars['String']['input']>;
};


export type RootQueryRequestsvc_GetEventArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryRequestsvc_GetEventsArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryRequestsvc_GetOrderedPrioritiesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryRequestsvc_GetPrioritiesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryRequestsvc_GetRequestArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryRequestsvc_GetRequestsArgs = {
  assigneeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  ignoreStatuses?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  priorities?: InputMaybe<Array<Scalars['String']['input']>>;
  query?: InputMaybe<Scalars['String']['input']>;
  reporters?: InputMaybe<Array<Scalars['String']['input']>>;
  scheduledForDay?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  statuses?: InputMaybe<Array<Scalars['String']['input']>>;
  techRequest?: InputMaybe<Scalars['Boolean']['input']>;
  unassigned?: InputMaybe<Scalars['Boolean']['input']>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryRoomsvc_CheckAvailabilityArgs = {
  minutes: Scalars['Int']['input'];
  roomId: Scalars['String']['input'];
  start?: InputMaybe<TimestampInput>;
};


export type RootQueryRoomsvc_GetBookingArgs = {
  bookingId: Scalars['String']['input'];
};


export type RootQueryRoomsvc_GetBookingsArgs = {
  bookingIds: Array<Scalars['String']['input']>;
  descending: Scalars['Boolean']['input'];
  endDate?: InputMaybe<TimestampInput>;
  locationIds: Array<Scalars['String']['input']>;
  page: Scalars['Int']['input'];
  roomIds: Array<Scalars['String']['input']>;
  scopeByUser: Scalars['Boolean']['input'];
  sortBy?: InputMaybe<SortBy>;
  startDate?: InputMaybe<TimestampInput>;
  userIds: Array<Scalars['String']['input']>;
};


export type RootQueryRoomsvc_GetMyBookingsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryRoomsvc_GetMyBookingsPaginatedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  afterDate?: InputMaybe<TimestampInput>;
  ascending?: InputMaybe<Scalars['Boolean']['input']>;
  beforeDate?: InputMaybe<TimestampInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeOngoing?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<BookingSortBy>;
};


export type RootQueryRoomsvc_GetMyRoomsArgs = {
  roomIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryRoomsvc_GetRoomArgs = {
  roomId: Scalars['String']['input'];
};


export type RootQueryRoomsvc_GetRoomAvailabilitySlotsArgs = {
  date?: InputMaybe<TimestampInput>;
  duration: Scalars['Int']['input'];
  roomId: Scalars['String']['input'];
};


export type RootQueryRoomsvc_GetRoomsArgs = {
  companyId: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type RootQueryRoomsvc_GetRoomsPaginatedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type RootQuerySchedulersvc_GetSchedulesArgs = {
  modelIds: Array<Scalars['String']['input']>;
};


export type RootQuerySearchsvc_GetBookingsTimelineArgs = {
  after: Scalars['String']['input'];
  filter?: InputMaybe<Array<BookingTimelineEventType>>;
  first: Scalars['Int']['input'];
};


export type RootQuerySearchsvc_GetCompaniesArgs = {
  companyTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  onlyActive?: InputMaybe<Scalars['Boolean']['input']>;
  onlyActiveOrApproved?: InputMaybe<Scalars['Boolean']['input']>;
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetDealTimelineArgs = {
  dealId: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetDealsArgs = {
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetIndexKeyArgs = {
  index?: InputMaybe<Scalars['String']['input']>;
  indices?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQuerySearchsvc_GetIssuesArgs = {
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetLocationsArgs = {
  allowOccupied?: InputMaybe<Scalars['Boolean']['input']>;
  allowUnoccupied?: InputMaybe<Scalars['Boolean']['input']>;
  allowUnverified?: InputMaybe<Scalars['Boolean']['input']>;
  allowVerified?: InputMaybe<Scalars['Boolean']['input']>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  filterOperand?: InputMaybe<GetLocationsFilterOperand>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  omitQualified?: InputMaybe<Scalars['Boolean']['input']>;
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetLocationsInboxArgs = {
  agencyCompanyId?: InputMaybe<Scalars['String']['input']>;
  agentProfileId?: InputMaybe<Scalars['String']['input']>;
  entityTypes?: InputMaybe<Array<LocationsInboxEntityType>>;
  onlyArchived?: InputMaybe<Scalars['Boolean']['input']>;
  onlyKittSpace?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLive?: InputMaybe<Scalars['Boolean']['input']>;
  onlyLiveOnSearch?: InputMaybe<Scalars['Boolean']['input']>;
  onlyPending?: InputMaybe<Scalars['Boolean']['input']>;
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  polygon?: InputMaybe<Array<CoordinateInput>>;
  price?: InputMaybe<MoneyRangeInput>;
  priceModePsf?: InputMaybe<Scalars['Boolean']['input']>;
  query: Scalars['String']['input'];
  sortBy?: InputMaybe<Array<LocationsInboxSortByInput>>;
  sqft?: InputMaybe<Int32OptionalRangeInput>;
};


export type RootQuerySearchsvc_GetRequestsArgs = {
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetServiceActivitiesArgs = {
  activityTypes?: InputMaybe<Array<ServiceActivityType>>;
  after: Scalars['String']['input'];
  first: Scalars['Int']['input'];
  orderCategoryIds?: InputMaybe<Array<Scalars['String']['input']>>;
  subjectCompanyIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQuerySearchsvc_GetUnitsArgs = {
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_GetUsersArgs = {
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  companyTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  orIsLeadTenant?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  scopeToMyCompany?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQuerySearchsvc_SearchAccessesArgs = {
  query: Scalars['String']['input'];
};


export type RootQuerySearchsvc_SearchProfilesArgs = {
  query: Scalars['String']['input'];
  tag: Array<Scalars['String']['input']>;
};


export type RootQueryTenancysvc_GetAllMoveInTenanciesArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTenancysvc_GetFloorplanZonesForTenancyArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryTenancysvc_GetTenanciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  current?: InputMaybe<Scalars['Boolean']['input']>;
  currentTimelineStage?: InputMaybe<Scalars['String']['input']>;
  cwpUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  dealIds?: InputMaybe<Array<Scalars['String']['input']>>;
  excludeMovedIn?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  future?: InputMaybe<Scalars['Boolean']['input']>;
  hasBeenSetupForTenancy?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includedDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  restrictToMyTenancies?: InputMaybe<Scalars['Boolean']['input']>;
  restrictToMyWatchedTenancies?: InputMaybe<Scalars['Boolean']['input']>;
  statusValue?: InputMaybe<TenancyStatusValueInput>;
  statusValues?: InputMaybe<Array<TenancyStatusValueInput>>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryTenancysvc_GetTenanciesListArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  current?: InputMaybe<Scalars['Boolean']['input']>;
  currentTimelineStage?: InputMaybe<Scalars['String']['input']>;
  cwpUserIds?: InputMaybe<Array<Scalars['String']['input']>>;
  dealIds?: InputMaybe<Array<Scalars['String']['input']>>;
  excludeMovedIn?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  future?: InputMaybe<Scalars['Boolean']['input']>;
  hasBeenSetupForTenancy?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includedDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  restrictToMyTenancies?: InputMaybe<Scalars['Boolean']['input']>;
  restrictToMyWatchedTenancies?: InputMaybe<Scalars['Boolean']['input']>;
  statusValue?: InputMaybe<TenancyStatusValueInput>;
  statusValues?: InputMaybe<Array<TenancyStatusValueInput>>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryTenancysvc_GetTenancyArgs = {
  category?: InputMaybe<TaskCategory>;
  id: Scalars['String']['input'];
};


export type RootQueryTenancysvc_GetTenancyFinancialModelArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryTenancysvc_GetTenancyTodosPaginatedArgs = {
  after: Scalars['String']['input'];
  categories?: InputMaybe<Array<TaskCategory>>;
  first: Scalars['Int']['input'];
  showCompleted: Scalars['Boolean']['input'];
  tenancyId: Scalars['String']['input'];
};


export type RootQueryTenancysvc_GetTimelineStageCountsArgs = {
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTenancysvc_GetUnitTenanciesArgs = {
  locationIds: Array<Scalars['String']['input']>;
  unitIds: Array<Scalars['String']['input']>;
};


export type RootQueryTenancysvc_PreviewTenancyTimelineArgs = {
  tasks?: InputMaybe<Array<TaskStateInput>>;
  tenancyId: Scalars['String']['input'];
};


export type RootQueryThreadsvc_GetArchivedMessagesArgs = {
  emailAddress: Scalars['String']['input'];
};


export type RootQueryThreadsvc_GetMessagesArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  attachedToThread?: InputMaybe<Scalars['Boolean']['input']>;
  emailAddresses: Array<Scalars['String']['input']>;
  excludeTags: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  tags: Array<Scalars['String']['input']>;
};


export type RootQueryThreadsvc_GetThreadArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryThreadsvc_GetThreadsArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type RootQueryUnitsvc_GetBusinessRatesForUnitArgs = {
  rateableValue?: InputMaybe<MoneyInput>;
  sqft: Scalars['Int']['input'];
  withinBidlevy: Scalars['Boolean']['input'];
  withinCityOfLondon: Scalars['Boolean']['input'];
};


export type RootQueryUnitsvc_GetDetailsForUnitsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
  unitIds: Array<Scalars['String']['input']>;
};


export type RootQueryUnitsvc_GetUnitArgs = {
  unitId: Scalars['String']['input'];
};


export type RootQueryUnitsvc_GetUnitFinancialModelArgs = {
  unitId: Scalars['String']['input'];
};


export type RootQueryUnitsvc_GetUnitsArgs = {
  descending?: InputMaybe<Scalars['Boolean']['input']>;
  filters?: InputMaybe<FiltersInput>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  pagination?: InputMaybe<UnitPaginationInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<UnitSortBy>;
};


export type RootQueryUploadsvc_GeneratePdfArgs = {
  dimensions?: InputMaybe<DimensionsInput>;
  fileName: Scalars['String']['input'];
  url: Scalars['String']['input'];
  waitForSelectors?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryUploadsvc_GetUploadArgs = {
  height?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  quality?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryUploadsvc_GetUploadsArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type RootQueryUploadsvc_UploadArgs = {
  data: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  ttl?: InputMaybe<TimestampInput>;
};


export type RootQueryUsersvc_ExchangeTokenArgs = {
  cookie: Scalars['String']['input'];
};


export type RootQueryUsersvc_GetCompanyUsersArgs = {
  userIds: Array<Scalars['String']['input']>;
};


export type RootQueryUsersvc_GetOrderedUsersArgs = {
  companyIds: Array<Scalars['String']['input']>;
  cookie: Scalars['String']['input'];
  emails: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryUsersvc_GetUserArgs = {
  cookie: Scalars['String']['input'];
  id: Scalars['String']['input'];
  verificationToken: Scalars['String']['input'];
};


export type RootQueryUsersvc_GetUsersArgs = {
  companyIds: Array<Scalars['String']['input']>;
  cookie: Scalars['String']['input'];
  emails: Array<Scalars['String']['input']>;
  ids: Array<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryUsersvc_GoogleAuthTokenArgs = {
  userId: Scalars['String']['input'];
};


export type RootQueryUsersvc_GoogleLoginArgs = {
  code: Scalars['String']['input'];
  redirectUrl: Scalars['String']['input'];
};


export type RootQueryUsersvc_LoginArgs = {
  authCode?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  rememberMe?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<AuthenticationFactorType>;
};


export type RootQueryUsersvc_VerifyPasswordResetTokenArgs = {
  token: Scalars['String']['input'];
};


export type RootQueryUsersvc_VerifyPhoneArgs = {
  code: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type RootQueryVisitsvc_GetMyVisitsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  afterDate?: InputMaybe<TimestampInput>;
  beforeDate?: InputMaybe<TimestampInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootQueryVisitsvc_GetVisitArgs = {
  id: Scalars['String']['input'];
  unscoped?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryVisitsvc_GetVisitsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  afterDate?: InputMaybe<TimestampInput>;
  beforeDate?: InputMaybe<TimestampInput>;
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type RotateCodeCommand = {
  __typename?: 'RotateCodeCommand';
  subjectId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SalesTeam = {
  __typename?: 'SalesTeam';
  defaultPrimaryAssignee?: Maybe<Profile>;
  defaultPrimaryAssigneeId: Scalars['String']['output'];
  defaultSecondaryAssignee?: Maybe<Profile>;
  defaultSecondaryAssigneeId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slackChannel: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SalesTeamAssignedToBrokerCompany = {
  __typename?: 'SalesTeamAssignedToBrokerCompany';
  brokerCompanyId: Scalars['String']['output'];
  salesTeamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SaveAmenity = {
  __typename?: 'SaveAmenity';
  companyId?: Maybe<Scalars['String']['output']>;
  entityIds: Array<Scalars['String']['output']>;
  entityType?: Maybe<BookableEntity>;
  id?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SaveBuildingCommand = {
  __typename?: 'SaveBuildingCommand';
  building?: Maybe<BuildingInput>;
  units?: Maybe<Array<BuildingUnitInput>>;
  user?: Maybe<User>;
};

export type SaveCompanyCultureCommand = {
  __typename?: 'SaveCompanyCultureCommand';
  companyId: Scalars['String']['output'];
  data?: Maybe<CompanyCultureDataInput>;
  user?: Maybe<User>;
};

export type SaveHybridWorkInformationCommand = {
  __typename?: 'SaveHybridWorkInformationCommand';
  inputs?: Maybe<Array<PolicyInput>>;
  user?: Maybe<User>;
};

export type SaveSearchRequirementsCommand = {
  __typename?: 'SaveSearchRequirementsCommand';
  requirements?: Maybe<SearchRequirements>;
  user?: Maybe<User>;
};

export type SaveUserPushTokenCommand = {
  __typename?: 'SaveUserPushTokenCommand';
  deviceId: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type Schedule = {
  __typename?: 'Schedule';
  active: Scalars['Boolean']['output'];
  cron: Scalars['String']['output'];
  id: Scalars['String']['output'];
  key: Scalars['String']['output'];
  modelId: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
  type?: Maybe<ScheduleType>;
};

export type ScheduleActivated = {
  __typename?: 'ScheduleActivated';
  schedule?: Maybe<Schedule>;
};

export type ScheduleCreated = {
  __typename?: 'ScheduleCreated';
  schedule?: Maybe<Schedule>;
};

export type ScheduleDeactivated = {
  __typename?: 'ScheduleDeactivated';
  schedule?: Maybe<Schedule>;
};

export type ScheduleDeleted = {
  __typename?: 'ScheduleDeleted';
  schedule?: Maybe<Schedule>;
};

export enum ScheduleType {
  SetAlarm = 'SET_ALARM',
  SetDoorToClose = 'SET_DOOR_TO_CLOSE',
  SetDoorToOpen = 'SET_DOOR_TO_OPEN',
  UnsetAlarm = 'UNSET_ALARM'
}

export type ScrapedLocation = {
  __typename?: 'ScrapedLocation';
  id?: Maybe<Scalars['String']['output']>;
  scrapedFromCompanyId?: Maybe<Scalars['String']['output']>;
  scrapedFromUrl: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ScrapedLocationInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  scrapedFromCompanyId?: InputMaybe<Scalars['String']['input']>;
  scrapedFromUrl: Scalars['String']['input'];
};

export type ScrapedLocationsCreated = {
  __typename?: 'ScrapedLocationsCreated';
  alreadyKnown: Scalars['Int']['output'];
  createdCount: Scalars['Int']['output'];
  missingCount: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type ScrapedStatus = {
  __typename?: 'ScrapedStatus';
  user?: Maybe<User>;
  wasFoundInScrape: Scalars['Boolean']['output'];
  wasMissingInLastScrape: Scalars['Boolean']['output'];
};

export type SearchCompany = {
  __typename?: 'SearchCompany';
  company?: Maybe<Company>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type SearchDeal = {
  __typename?: 'SearchDeal';
  deal?: Maybe<Deal>;
  id: Scalars['String']['output'];
};

export type SearchGetCompaniesResponse = {
  __typename?: 'SearchGetCompaniesResponse';
  companies?: Maybe<Array<SearchCompany>>;
};

export type SearchGetDealTimelineResponse = {
  __typename?: 'SearchGetDealTimelineResponse';
  event?: Maybe<Array<SearchTimelineEvent>>;
};

export type SearchGetDealsResponse = {
  __typename?: 'SearchGetDealsResponse';
  deals?: Maybe<Array<SearchDeal>>;
};

export type SearchGetIssuesResponse = {
  __typename?: 'SearchGetIssuesResponse';
  issues?: Maybe<Array<SearchIssue>>;
};

export type SearchGetLocationsInboxResponse = {
  __typename?: 'SearchGetLocationsInboxResponse';
  entities?: Maybe<Array<LocationsInboxEntity>>;
  tabCounts?: Maybe<LocationsInboxTabCounts>;
  totalCount: Scalars['Int']['output'];
};

export type SearchGetLocationsResponse = {
  __typename?: 'SearchGetLocationsResponse';
  locations?: Maybe<Array<SearchLocation>>;
};

export type SearchGetRequestsResponse = {
  __typename?: 'SearchGetRequestsResponse';
  requests?: Maybe<Array<SearchRequest>>;
};

export type SearchGetUnitsResponse = {
  __typename?: 'SearchGetUnitsResponse';
  units?: Maybe<Array<SearchUnit>>;
};

export type SearchGetUsersResponse = {
  __typename?: 'SearchGetUsersResponse';
  users?: Maybe<Array<SearchUser>>;
};

export type SearchHistory = {
  __typename?: 'SearchHistory';
  createdAt?: Maybe<DateTime>;
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  searchRequirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type SearchIssue = {
  __typename?: 'SearchIssue';
  detail: Scalars['String']['output'];
  id: Scalars['String']['output'];
  issue?: Maybe<Issue>;
  summary: Scalars['String']['output'];
};

export type SearchLocation = {
  __typename?: 'SearchLocation';
  id: Scalars['String']['output'];
  location?: Maybe<Location>;
  name: Scalars['String']['output'];
};

export type SearchRequest = {
  __typename?: 'SearchRequest';
  assignee: Scalars['String']['output'];
  contractor: Scalars['String']['output'];
  creator: Scalars['String']['output'];
  details: Scalars['String']['output'];
  id: Scalars['String']['output'];
  location: Scalars['String']['output'];
  summary: Scalars['String']['output'];
};

export type SearchRequirements = {
  __typename?: 'SearchRequirements';
  areaId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  priceRange?: Maybe<MoneyRange>;
  secondarySearchRequirements?: Maybe<SecondarySearchRequirements>;
  sqFtRange?: Maybe<Int32OptionalRange>;
  termLengthRange?: Maybe<Int32OptionalRange>;
  user?: Maybe<User>;
};

export type SearchRequirementsInput = {
  areaId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  priceRange?: InputMaybe<MoneyRangeInput>;
  secondarySearchRequirements?: InputMaybe<SecondarySearchRequirementsInput>;
  sqFtRange?: InputMaybe<Int32OptionalRangeInput>;
  termLengthRange?: InputMaybe<Int32OptionalRangeInput>;
};

export type SearchRequirementsSaved = {
  __typename?: 'SearchRequirementsSaved';
  requirements?: Maybe<SearchRequirements>;
  user?: Maybe<User>;
};

export type SearchTimelineEvent = {
  __typename?: 'SearchTimelineEvent';
  createdById: Scalars['String']['output'];
  createdByName: Scalars['String']['output'];
  createdByProfile?: Maybe<Profile>;
  entity?: Maybe<DealTimelineEventUnion>;
  eventTimestamp: Scalars['String']['output'];
  eventType?: Maybe<DealTimelineEventType>;
  id: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type SearchUnit = {
  __typename?: 'SearchUnit';
  company: Scalars['String']['output'];
  id: Scalars['String']['output'];
  location: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type SearchUser = {
  __typename?: 'SearchUser';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SecondarySearchRequirements = {
  __typename?: 'SecondarySearchRequirements';
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  fitoutStates?: Maybe<Array<Scalars['String']['output']>>;
  hideMultiFloorSelections?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  includeCombinations?: Maybe<Scalars['Boolean']['output']>;
  includeGround?: Maybe<Scalars['Boolean']['output']>;
  includeUnderground?: Maybe<Scalars['Boolean']['output']>;
  kittChoicesOnly?: Maybe<Scalars['Boolean']['output']>;
  onlyCombinations?: Maybe<Scalars['Boolean']['output']>;
  polygon?: Maybe<Scalars['String']['output']>;
  priceModePsf?: Maybe<Scalars['Boolean']['output']>;
  searchCentre?: Maybe<Coordinate>;
  unitCombinationLimit?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type SecondarySearchRequirementsInput = {
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  fitoutStates?: InputMaybe<Array<Scalars['String']['input']>>;
  hideMultiFloorSelections?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  includeCombinations?: InputMaybe<Scalars['Boolean']['input']>;
  includeGround?: InputMaybe<Scalars['Boolean']['input']>;
  includeUnderground?: InputMaybe<Scalars['Boolean']['input']>;
  kittChoicesOnly?: InputMaybe<Scalars['Boolean']['input']>;
  onlyCombinations?: InputMaybe<Scalars['Boolean']['input']>;
  polygon?: InputMaybe<Scalars['String']['input']>;
  priceModePsf?: InputMaybe<Scalars['Boolean']['input']>;
  searchCentre?: InputMaybe<CoordinateInput>;
  unitCombinationLimit?: InputMaybe<Scalars['Int']['input']>;
};

export type Selection = {
  __typename?: 'Selection';
  combinationDetails?: Maybe<CombinationDetails>;
  createdAt?: Maybe<Timestamp>;
  createdBy?: Maybe<Scalars['String']['output']>;
  createdByUser?: Maybe<User>;
  emailedBrokers?: Maybe<Array<Scalars['String']['output']>>;
  location?: Maybe<Location>;
  overrideTermMonths?: Maybe<Scalars['Int']['output']>;
  pricing?: Maybe<GetPricingResponse>;
  templateBrochure?: Maybe<Brochure>;
  templateBrochureId?: Maybe<Scalars['String']['output']>;
  /** If an override term month is given (and the override is not provided in args) it will calculate pricing based on that */
  unitGroupDetails?: Maybe<GetDetailsForUnitsResponse>;
  unitGroupId?: Maybe<Scalars['String']['output']>;
  unitIds?: Maybe<Array<Scalars['String']['output']>>;
  units?: Maybe<Array<Maybe<Unit>>>;
  user?: Maybe<User>;
};


export type SelectionPricingArgs = {
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};


export type SelectionUnitGroupDetailsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type SelectionFeedback = {
  __typename?: 'SelectionFeedback';
  createdBy?: Maybe<Scalars['String']['output']>;
  dealId: Scalars['String']['output'];
  feedbackText: Scalars['String']['output'];
  id?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  unitGroupId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SelectionFeedbackInput = {
  createdBy?: InputMaybe<Scalars['String']['input']>;
  dealId: Scalars['String']['input'];
  feedbackText: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  unitGroupId: Scalars['String']['input'];
};

export type SelectionFeedbacksCreated = {
  __typename?: 'SelectionFeedbacksCreated';
  unitGroupIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type SelectionInput = {
  createdAt?: InputMaybe<TimestampInput>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  emailedBrokers?: InputMaybe<Array<Scalars['String']['input']>>;
  overrideTermMonths?: InputMaybe<Scalars['Int']['input']>;
  unitGroupId?: InputMaybe<Scalars['String']['input']>;
  unitIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SelectionsAdded = {
  __typename?: 'SelectionsAdded';
  createdBy: Scalars['String']['output'];
  selections?: Maybe<Array<Selection>>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SelectionsRemoved = {
  __typename?: 'SelectionsRemoved';
  selections?: Maybe<Array<Selection>>;
  user?: Maybe<User>;
};

export type SelectionsUpdated = {
  __typename?: 'SelectionsUpdated';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SendChatPulse = {
  __typename?: 'SendChatPulse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type SendEmailAction = {
  __typename?: 'SendEmailAction';
  body?: Maybe<EmailBody>;
  emails: Array<Scalars['String']['output']>;
  from: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type SendEmailCommand = {
  __typename?: 'SendEmailCommand';
  bccAddresses?: Maybe<Array<Scalars['String']['output']>>;
  ccAddresses?: Maybe<Array<Scalars['String']['output']>>;
  fromAddress: Scalars['String']['output'];
  fromName: Scalars['String']['output'];
  gmailThreadId?: Maybe<Scalars['String']['output']>;
  htmlMessage: Scalars['String']['output'];
  metadata?: Maybe<Array<EmailMetadata>>;
  replyToEmailId?: Maybe<Scalars['String']['output']>;
  subject: Scalars['String']['output'];
  threadId?: Maybe<Scalars['String']['output']>;
  toAddresses: Array<Scalars['String']['output']>;
  uploadIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
};

export type SendKitchenSinkCommand = {
  __typename?: 'SendKitchenSinkCommand';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type SendNewEnquiryNotificationCommand = {
  __typename?: 'SendNewEnquiryNotificationCommand';
  email: Scalars['String']['output'];
  message: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SendNotificationToAllUsersCommand = {
  __typename?: 'SendNotificationToAllUsersCommand';
  message: Scalars['String']['output'];
  title: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SendNotificationToAllUsersDegraded = {
  __typename?: 'SendNotificationToAllUsersDegraded';
  message: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SendPhoneVerification = {
  __typename?: 'SendPhoneVerification';
  phoneNumber: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SendTenancyPulse = {
  __typename?: 'SendTenancyPulse';
  _null?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type SendWelcomeMessageCommand = {
  __typename?: 'SendWelcomeMessageCommand';
  category?: Maybe<TaskCategory>;
  message?: Maybe<Scalars['String']['output']>;
  receiverIds?: Maybe<Array<Scalars['String']['output']>>;
  tenancyId: Scalars['String']['output'];
};

export type ServiceActivity = {
  __typename?: 'ServiceActivity';
  entity?: Maybe<ServiceActivityUnion>;
  id: Scalars['String']['output'];
  type?: Maybe<ServiceActivityType>;
};

export type ServiceActivityEdge = {
  __typename?: 'ServiceActivityEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<ServiceActivity>;
};

export enum ServiceActivityType {
  ServiceActivityTypeIssue = 'ServiceActivityType_Issue',
  ServiceActivityTypeNone = 'ServiceActivityType_None',
  ServiceActivityTypeVisit = 'ServiceActivityType_Visit'
}

export type ServiceActivityUnion = Issue | Visit;

export type Session = {
  __typename?: 'Session';
  accessId: Scalars['String']['output'];
  answeredAt?: Maybe<Timestamp>;
  answeredBy: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  endTime?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  numberOfPresses: Scalars['Int']['output'];
  sipUri: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SessionAnswered = {
  __typename?: 'SessionAnswered';
  session?: Maybe<Session>;
  user?: Maybe<User>;
};

export type SessionCreated = {
  __typename?: 'SessionCreated';
  session?: Maybe<Session>;
  user?: Maybe<User>;
};

export type SessionRecorded = {
  __typename?: 'SessionRecorded';
  sessionId: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SessionUpdated = {
  __typename?: 'SessionUpdated';
  session?: Maybe<Session>;
  user?: Maybe<User>;
};

export type SetCapacityCommand = {
  __typename?: 'SetCapacityCommand';
  capacity: Scalars['Int']['output'];
  companyId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type SetCommunicationPreference = {
  __typename?: 'SetCommunicationPreference';
  communicationClass: Scalars['String']['output'];
  frequency?: Maybe<CommunicationFrequency>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type SetCommunicationPreferenceForAllEmployeesOfCompany = {
  __typename?: 'SetCommunicationPreferenceForAllEmployeesOfCompany';
  communicationClass: Scalars['String']['output'];
  companyId?: Maybe<Scalars['String']['output']>;
  frequency?: Maybe<CommunicationFrequency>;
  user?: Maybe<User>;
};

export type SetCompanyIndustriesCommand = {
  __typename?: 'SetCompanyIndustriesCommand';
  companyId: Scalars['String']['output'];
  industryIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type SetCompanyIngressesCommand = {
  __typename?: 'SetCompanyIngressesCommand';
  companyIngresses?: Maybe<Array<CompanyIngress>>;
  user?: Maybe<User>;
};

export type SetDesksOnTeamCommand = {
  __typename?: 'SetDesksOnTeamCommand';
  deskIds: Array<Scalars['String']['output']>;
  teamId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type SetTeamsOnDeskCommand = {
  __typename?: 'SetTeamsOnDeskCommand';
  deskId: Scalars['String']['output'];
  teamIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type ShareShortlistWithCurrentUserCommand = {
  __typename?: 'ShareShortlistWithCurrentUserCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Shortlist = {
  __typename?: 'Shortlist';
  approvedAt?: Maybe<DateTime>;
  approvedByUserId: Scalars['String']['output'];
  archivedAt?: Maybe<DateTime>;
  clientName: Scalars['String']['output'];
  createdAt?: Maybe<DateTime>;
  createdByCompanyId: Scalars['String']['output'];
  createdByUser?: Maybe<User>;
  createdByUserId: Scalars['String']['output'];
  description: Scalars['String']['output'];
  dismissedRecommendations?: Maybe<Array<DismissedRecommendation>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  selections?: Maybe<Array<Selection>>;
  updatedAt?: Maybe<DateTime>;
  updatedByUser?: Maybe<User>;
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ShortlistViewingRequest>>;
};

export type ShortlistAddToValveRequested = {
  __typename?: 'ShortlistAddToValveRequested';
  search?: Maybe<BrokerSearch>;
  user?: Maybe<User>;
};

export type ShortlistApproved = {
  __typename?: 'ShortlistApproved';
  approvedByUserId: Scalars['String']['output'];
  brokerSearchId: Scalars['String']['output'];
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type ShortlistConnection = {
  __typename?: 'ShortlistConnection';
  edges?: Maybe<Array<ShortlistEdge>>;
  pageInfo?: Maybe<PageInfo>;
  totalArchived: Scalars['Int']['output'];
  totalShared: Scalars['Int']['output'];
  totalUserMade: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type ShortlistCreated = {
  __typename?: 'ShortlistCreated';
  shortlist?: Maybe<Shortlist>;
  user?: Maybe<User>;
};

export type ShortlistDeleted = {
  __typename?: 'ShortlistDeleted';
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ShortlistEdge = {
  __typename?: 'ShortlistEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Shortlist>;
  user?: Maybe<User>;
};

export type ShortlistRestored = {
  __typename?: 'ShortlistRestored';
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ShortlistSharedCurrentUser = {
  __typename?: 'ShortlistSharedCurrentUser';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ShortlistSummary = {
  __typename?: 'ShortlistSummary';
  brokerCompany?: Maybe<Company>;
  brokerCompanyId: Scalars['String']['output'];
  clientName: Scalars['String']['output'];
  createdByCompany?: Maybe<Company>;
  createdByCompanyId: Scalars['String']['output'];
  createdByUser?: Maybe<User>;
  createdByUserId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type ShortlistUpdated = {
  __typename?: 'ShortlistUpdated';
  shortlist?: Maybe<Shortlist>;
  user?: Maybe<User>;
};

export type ShortlistViewingRequest = {
  __typename?: 'ShortlistViewingRequest';
  budgetInfo?: Maybe<Scalars['String']['output']>;
  clientInfo?: Maybe<Scalars['String']['output']>;
  companyId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  moveDateInfo?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  requestedByUserId?: Maybe<Scalars['String']['output']>;
  selections?: Maybe<Array<Selection>>;
  shortlistId: Scalars['String']['output'];
  slots?: Maybe<Array<DateTime>>;
  user?: Maybe<User>;
};

export type ShortlistViewingRequestInput = {
  budgetInfo?: InputMaybe<Scalars['String']['input']>;
  clientInfo?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  moveDateInfo?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  requestedByUserId?: InputMaybe<Scalars['String']['input']>;
  selections?: InputMaybe<Array<SelectionInput>>;
  shortlistId: Scalars['String']['input'];
  slots?: InputMaybe<Array<DateTimeInput>>;
};

export type ShortlistViewingRequestsCreated = {
  __typename?: 'ShortlistViewingRequestsCreated';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  company: Scalars['String']['output'];
  dealId: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  requestedByUserId: Scalars['String']['output'];
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  viewingRequests?: Maybe<Array<ViewingRequest>>;
};

export type ShortlistsAddedToDeal = {
  __typename?: 'ShortlistsAddedToDeal';
  dealId: Scalars['String']['output'];
  shortlistIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type ShortlistsRemovedFromDeal = {
  __typename?: 'ShortlistsRemovedFromDeal';
  dealId: Scalars['String']['output'];
  shortlistIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type SignUpCommand = {
  __typename?: 'SignUpCommand';
  email: Scalars['String']['output'];
  password: Scalars['String']['output'];
  rememberMe: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export enum SlaType {
  Closure = 'Closure',
  FirstNextStep = 'FirstNextStep'
}

export enum SortBy {
  End = 'END',
  Start = 'START'
}

export type SourcedLocationDiscarded = {
  __typename?: 'SourcedLocationDiscarded';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type SourcedLocationUpdated = {
  __typename?: 'SourcedLocationUpdated';
  location?: Maybe<Location>;
  user?: Maybe<User>;
};

export type SourcedUnitUpdated = {
  __typename?: 'SourcedUnitUpdated';
  unitId: Scalars['String']['output'];
};

export type SpacesMatched = {
  __typename?: 'SpacesMatched';
  matches?: Maybe<Array<MatchedSpace>>;
  requirementsId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type StartAccountRecoveryCommand = {
  __typename?: 'StartAccountRecoveryCommand';
  email: Scalars['String']['output'];
  inAppRecovery?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type StatusChange = {
  __typename?: 'StatusChange';
  from?: Maybe<TenancyStatus>;
  to?: Maybe<TenancyStatus>;
};

export type StatusOptional = {
  __typename?: 'StatusOptional';
  status?: Maybe<LocationStatus>;
  user?: Maybe<User>;
};

export type StatusOptionalInput = {
  status?: InputMaybe<LocationStatus>;
};

export enum Subject {
  Company = 'COMPANY',
  Group = 'GROUP',
  Location = 'LOCATION',
  User = 'User'
}

export type SubjectAddedToGroup = {
  __typename?: 'SubjectAddedToGroup';
  companyId: Scalars['String']['output'];
  groupId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type SubjectRemovedFromGroup = {
  __typename?: 'SubjectRemovedFromGroup';
  companyId: Scalars['String']['output'];
  groupId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type SubmitBuildingCommand = {
  __typename?: 'SubmitBuildingCommand';
  url: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Subscription = {
  __typename?: 'Subscription';
  accesssvc_Access?: Maybe<Access>;
  accesssvc_AccessBeingConfigured?: Maybe<AccessBeingConfigured>;
  accesssvc_AccessConfigured?: Maybe<AccessConfigured>;
  accesssvc_AccessCreated?: Maybe<AccessCreated>;
  accesssvc_AccessDeleted?: Maybe<AccessDeleted>;
  accesssvc_AccessUpdated?: Maybe<AccessUpdated>;
  accesssvc_CodeRotated?: Maybe<CodeRotated>;
  accesssvc_ConfigureAccessCommand?: Maybe<ConfigureAccessCommand>;
  accesssvc_Coords?: Maybe<Coords>;
  accesssvc_CreateAccessCommand?: Maybe<CreateAccessCommand>;
  accesssvc_CreateTemporaryPinCommand?: Maybe<CreateTemporaryPinCommand>;
  accesssvc_DeleteAccessCommand?: Maybe<DeleteAccessCommand>;
  accesssvc_DoorOpened?: Maybe<DoorOpened>;
  accesssvc_DoorRestarted?: Maybe<DoorRestarted>;
  accesssvc_GetAccessCodeBatchResponse?: Maybe<GetAccessCodeBatchResponse>;
  accesssvc_GetAccessCodeRequest?: Maybe<GetAccessCodeRequest>;
  accesssvc_GetAccessCodeResponse?: Maybe<GetAccessCodeResponse>;
  accesssvc_GetAccessRequest?: Maybe<GetAccessRequest>;
  accesssvc_GetAccessResponse?: Maybe<GetAccessResponse>;
  accesssvc_GetAccessesBatchResponse?: Maybe<GetAccessesBatchResponse>;
  accesssvc_GetAccessesRequest?: Maybe<GetAccessesRequest>;
  accesssvc_GetAccessesResponse?: Maybe<GetAccessesResponse>;
  accesssvc_GetPhotoRequest?: Maybe<GetPhotoRequest>;
  accesssvc_GetPhotoResponse?: Maybe<GetPhotoResponse>;
  accesssvc_GetVideoTokenRequest?: Maybe<GetVideoTokenRequest>;
  accesssvc_GetVideoTokenResponse?: Maybe<GetVideoTokenResponse>;
  accesssvc_NetworkConfig?: Maybe<NetworkConfig>;
  accesssvc_OpenDoorCommand?: Maybe<OpenDoorCommand>;
  accesssvc_OpenDoorResponse?: Maybe<OpenDoorResponse>;
  accesssvc_PhotoTakenAtAccess?: Maybe<PhotoTakenAtAccess>;
  accesssvc_ReconfigureDevices?: Maybe<ReconfigureDevices>;
  accesssvc_RestartDoorCommand?: Maybe<RestartDoorCommand>;
  accesssvc_RotateCodeCommand?: Maybe<RotateCodeCommand>;
  accesssvc_TemporaryPinCreated?: Maybe<TemporaryPinCreated>;
  accesssvc_UpdateAccessCommand?: Maybe<UpdateAccessCommand>;
  accesssvc_UpdateAccessNameCommand?: Maybe<UpdateAccessNameCommand>;
  accesssvc_UpdateNetworkConfigCommand?: Maybe<UpdateNetworkConfigCommand>;
  alarmsvc_Alarm?: Maybe<Alarm>;
  alarmsvc_GetAlarmsRequest?: Maybe<GetAlarmsRequest>;
  alarmsvc_GetAlarmsResponse?: Maybe<GetAlarmsResponse>;
  alarmsvc_GetStatusRequest?: Maybe<GetStatusRequest>;
  alarmsvc_GetStatusResponse?: Maybe<GetStatusResponse>;
  alarmsvc_GetStatusesRequest?: Maybe<GetStatusesRequest>;
  alarmsvc_GetStatusesResponse?: Maybe<GetStatusesResponse>;
  bookingsvc_Amenity?: Maybe<Amenity>;
  bookingsvc_AmenityDeleted?: Maybe<AmenityDeleted>;
  bookingsvc_AmenityList?: Maybe<AmenityList>;
  bookingsvc_AmenitySaved?: Maybe<AmenitySaved>;
  bookingsvc_ApproveFloorplan?: Maybe<ApproveFloorplan>;
  bookingsvc_AssignUserToDeskCommand?: Maybe<AssignUserToDeskCommand>;
  bookingsvc_Attendance?: Maybe<Attendance>;
  bookingsvc_AttendanceBatchSet?: Maybe<AttendanceBatchSet>;
  bookingsvc_AttendanceCreated?: Maybe<AttendanceCreated>;
  bookingsvc_AttendanceDeleted?: Maybe<AttendanceDeleted>;
  bookingsvc_AttendanceStateForDate?: Maybe<AttendanceStateForDate>;
  bookingsvc_BatchAmenityResponse?: Maybe<BatchAmenityResponse>;
  bookingsvc_BatchBookingsResponse?: Maybe<BatchBookingsResponse>;
  bookingsvc_BatchDeskPermanentlyAssignedUserIdResponse?: Maybe<BatchDeskPermanentlyAssignedUserIdResponse>;
  bookingsvc_BatchDeskResponse?: Maybe<BatchDeskResponse>;
  bookingsvc_BatchEntitiesForAmenityResponse?: Maybe<BatchEntitiesForAmenityResponse>;
  bookingsvc_BatchFloorplanResponse?: Maybe<BatchFloorplanResponse>;
  bookingsvc_BatchFloorplanZoneResponse?: Maybe<BatchFloorplanZoneResponse>;
  bookingsvc_BatchGeometryResponse?: Maybe<BatchGeometryResponse>;
  bookingsvc_BatchRoomResponse?: Maybe<BatchRoomResponse>;
  bookingsvc_BatchSetAttendanceCommand?: Maybe<BatchSetAttendanceCommand>;
  bookingsvc_BatchTotalDesksForTeamResponse?: Maybe<BatchTotalDesksForTeamResponse>;
  bookingsvc_BookingCreated?: Maybe<BookingCreated>;
  bookingsvc_BookingDeleted?: Maybe<BookingDeleted>;
  bookingsvc_BookingList?: Maybe<BookingList>;
  bookingsvc_BookingRoomCreatedEffect?: Maybe<BookingRoomCreatedEffect>;
  bookingsvc_BookingRoomDeletedEffect?: Maybe<BookingRoomDeletedEffect>;
  bookingsvc_BookingRoomUpdatedEffect?: Maybe<BookingRoomUpdatedEffect>;
  bookingsvc_BookingsCancelledByPermanentDeskAssignment?: Maybe<BookingsCancelledByPermanentDeskAssignment>;
  bookingsvc_Bookingsvc_GetBookingRequest?: Maybe<Bookingsvc_GetBookingRequest>;
  bookingsvc_Bookingsvc_GetBookingResponse?: Maybe<Bookingsvc_GetBookingResponse>;
  bookingsvc_Bookingsvc_GetRoomsRequest?: Maybe<Bookingsvc_GetRoomsRequest>;
  bookingsvc_Bookingsvc_GetRoomsResponse?: Maybe<Bookingsvc_GetRoomsResponse>;
  bookingsvc_CapacitySet?: Maybe<CapacitySet>;
  bookingsvc_CreateAttendanceCommand?: Maybe<CreateAttendanceCommand>;
  bookingsvc_CreateBooking?: Maybe<CreateBooking>;
  bookingsvc_CreateDesk?: Maybe<CreateDesk>;
  bookingsvc_CreateRoom?: Maybe<CreateRoom>;
  bookingsvc_DeleteAmenity?: Maybe<DeleteAmenity>;
  bookingsvc_DeleteAttendanceCommand?: Maybe<DeleteAttendanceCommand>;
  bookingsvc_DeleteBooking?: Maybe<DeleteBooking>;
  bookingsvc_DeleteDesk?: Maybe<DeleteDesk>;
  bookingsvc_DeleteFloorplan?: Maybe<DeleteFloorplan>;
  bookingsvc_DeleteRoom?: Maybe<DeleteRoom>;
  bookingsvc_Desk?: Maybe<Desk>;
  bookingsvc_DeskBookingFeatureEnquired?: Maybe<DeskBookingFeatureEnquired>;
  bookingsvc_DeskCreated?: Maybe<DeskCreated>;
  bookingsvc_DeskDeleted?: Maybe<DeskDeleted>;
  bookingsvc_DeskUpdated?: Maybe<DeskUpdated>;
  bookingsvc_DesksOnTeamSet?: Maybe<DesksOnTeamSet>;
  bookingsvc_EnquireAboutDeskBooking?: Maybe<EnquireAboutDeskBooking>;
  bookingsvc_EntityIdsList?: Maybe<EntityIdsList>;
  bookingsvc_Floorplan?: Maybe<Floorplan>;
  bookingsvc_FloorplanApproved?: Maybe<FloorplanApproved>;
  bookingsvc_FloorplanDeleted?: Maybe<FloorplanDeleted>;
  bookingsvc_FloorplanGenerated?: Maybe<FloorplanGenerated>;
  bookingsvc_FloorplanIngested?: Maybe<FloorplanIngested>;
  bookingsvc_FloorplanUpdated?: Maybe<FloorplanUpdated>;
  bookingsvc_FloorplanZone?: Maybe<FloorplanZone>;
  bookingsvc_FloorplanZoneUpdated?: Maybe<FloorplanZoneUpdated>;
  bookingsvc_FloorplansGenerationStarted?: Maybe<FloorplansGenerationStarted>;
  bookingsvc_GenerateFloorplans?: Maybe<GenerateFloorplans>;
  bookingsvc_GeometricPoint?: Maybe<GeometricPoint>;
  bookingsvc_Geometry?: Maybe<Geometry>;
  bookingsvc_GetAdminRoomBookingsRequest?: Maybe<GetAdminRoomBookingsRequest>;
  bookingsvc_GetAmenitiesRequest?: Maybe<GetAmenitiesRequest>;
  bookingsvc_GetAmenitiesResponse?: Maybe<GetAmenitiesResponse>;
  bookingsvc_GetAttendanceStateRequest?: Maybe<GetAttendanceStateRequest>;
  bookingsvc_GetAttendanceStateResponse?: Maybe<GetAttendanceStateResponse>;
  bookingsvc_GetAttendancesBatchResponse?: Maybe<GetAttendancesBatchResponse>;
  bookingsvc_GetBookableRoomsRequest?: Maybe<GetBookableRoomsRequest>;
  bookingsvc_GetBookableRoomsResponse?: Maybe<GetBookableRoomsResponse>;
  bookingsvc_GetBookingsForEntity?: Maybe<GetBookingsForEntity>;
  bookingsvc_GetBookingsForEntityBatchRequest?: Maybe<GetBookingsForEntityBatchRequest>;
  bookingsvc_GetCapacityRequest?: Maybe<GetCapacityRequest>;
  bookingsvc_GetCapacityResponse?: Maybe<GetCapacityResponse>;
  bookingsvc_GetDeskBookingsRequest?: Maybe<GetDeskBookingsRequest>;
  bookingsvc_GetDeskBookingsResponse?: Maybe<GetDeskBookingsResponse>;
  bookingsvc_GetEntitiesForAmenityBatchRequest?: Maybe<GetEntitiesForAmenityBatchRequest>;
  bookingsvc_GetEntitiesForAmenityRequest?: Maybe<GetEntitiesForAmenityRequest>;
  bookingsvc_GetFloorplanZonesRequest?: Maybe<GetFloorplanZonesRequest>;
  bookingsvc_GetFloorplanZonesResponse?: Maybe<GetFloorplanZonesResponse>;
  bookingsvc_GetFloorplansForTenancyRequest?: Maybe<GetFloorplansForTenancyRequest>;
  bookingsvc_GetFloorplansForTenancyResponse?: Maybe<GetFloorplansForTenancyResponse>;
  bookingsvc_GetMinSafeCapacityRequest?: Maybe<GetMinSafeCapacityRequest>;
  bookingsvc_GetMinSafeCapacityResponse?: Maybe<GetMinSafeCapacityResponse>;
  bookingsvc_GetMyCompanyDesksRequest?: Maybe<GetMyCompanyDesksRequest>;
  bookingsvc_GetMyCompanyDesksResponse?: Maybe<GetMyCompanyDesksResponse>;
  bookingsvc_GetMyDeskBookingsRequest?: Maybe<GetMyDeskBookingsRequest>;
  bookingsvc_GetMyRoomBookingsRequest?: Maybe<GetMyRoomBookingsRequest>;
  bookingsvc_GetRoomBookingsRequest?: Maybe<GetRoomBookingsRequest>;
  bookingsvc_GetRoomByIdRequest?: Maybe<GetRoomByIdRequest>;
  bookingsvc_GetTotalDesksForTeamBatchRequest?: Maybe<GetTotalDesksForTeamBatchRequest>;
  bookingsvc_GetTotalDesksForTeamRequest?: Maybe<GetTotalDesksForTeamRequest>;
  bookingsvc_IngestFloorplan?: Maybe<IngestFloorplan>;
  bookingsvc_MeetingRoom?: Maybe<MeetingRoom>;
  bookingsvc_PaginatedBookingsConnection?: Maybe<PaginatedBookingsConnection>;
  bookingsvc_Rectangle?: Maybe<Rectangle>;
  bookingsvc_RoomOrDeskBooking?: Maybe<RoomOrDeskBooking>;
  bookingsvc_RoomOrDeskBookingEdge?: Maybe<RoomOrDeskBookingEdge>;
  bookingsvc_SaveAmenity?: Maybe<SaveAmenity>;
  bookingsvc_SetCapacityCommand?: Maybe<SetCapacityCommand>;
  bookingsvc_SetDesksOnTeamCommand?: Maybe<SetDesksOnTeamCommand>;
  bookingsvc_SetTeamsOnDeskCommand?: Maybe<SetTeamsOnDeskCommand>;
  bookingsvc_TeamsOnDeskSet?: Maybe<TeamsOnDeskSet>;
  bookingsvc_UpdateDesk?: Maybe<UpdateDesk>;
  bookingsvc_UpdateFloorplan?: Maybe<UpdateFloorplan>;
  bookingsvc_UpdateFloorplanZone?: Maybe<UpdateFloorplanZone>;
  bookingsvc_UpdateRoom?: Maybe<UpdateRoom>;
  bookingsvc_UserAssignedToDesk?: Maybe<UserAssignedToDesk>;
  brochuresvc_Brochure?: Maybe<Brochure>;
  brochuresvc_BrochureCreated?: Maybe<BrochureCreated>;
  brochuresvc_BrochureDeleted?: Maybe<BrochureDeleted>;
  brochuresvc_BrochureEntity?: Maybe<BrochureEntity>;
  brochuresvc_BrochureTemplateCloned?: Maybe<BrochureTemplateCloned>;
  brochuresvc_BrochureUpdated?: Maybe<BrochureUpdated>;
  brochuresvc_CloneTemplateCommand?: Maybe<CloneTemplateCommand>;
  brochuresvc_CreateBrochureCommand?: Maybe<CreateBrochureCommand>;
  brochuresvc_DeleteBrochureCommand?: Maybe<DeleteBrochureCommand>;
  brochuresvc_GetBrochureBatchResponse?: Maybe<GetBrochureBatchResponse>;
  brochuresvc_GetBrochureRequest?: Maybe<GetBrochureRequest>;
  brochuresvc_GetBrochureResponse?: Maybe<GetBrochureResponse>;
  brochuresvc_GetKittTemplateForEntityGroupRequest?: Maybe<GetKittTemplateForEntityGroupRequest>;
  brochuresvc_GetKittTemplateForEntityGroupResponse?: Maybe<GetKittTemplateForEntityGroupResponse>;
  brochuresvc_GetTemplateBrochureBatchResponse?: Maybe<GetTemplateBrochureBatchResponse>;
  brochuresvc_UpdateBrochureCommand?: Maybe<UpdateBrochureCommand>;
  chatsvc_Chat?: Maybe<Chat>;
  chatsvc_ChatBatchLoaderResponse?: Maybe<ChatBatchLoaderResponse>;
  chatsvc_ChatCreated?: Maybe<ChatCreated>;
  chatsvc_ChatDeleted?: Maybe<ChatDeleted>;
  chatsvc_ChatMarkedAsReadEffect?: Maybe<ChatMarkedAsReadEffect>;
  chatsvc_ChatMemberCreated?: Maybe<ChatMemberCreated>;
  chatsvc_ChatMemberDeleted?: Maybe<ChatMemberDeleted>;
  chatsvc_ChatMemberIds?: Maybe<ChatMemberIds>;
  chatsvc_ChatMessage?: Maybe<ChatMessage>;
  chatsvc_ChatMessageConnection?: Maybe<ChatMessageConnection>;
  chatsvc_ChatMessageCreated?: Maybe<ChatMessageCreated>;
  chatsvc_ChatMessageDeletedEffect?: Maybe<ChatMessageDeletedEffect>;
  chatsvc_ChatMessageEdge?: Maybe<ChatMessageEdge>;
  chatsvc_ChatMessageUpdated?: Maybe<ChatMessageUpdated>;
  chatsvc_CompletedTaskMessageCreated?: Maybe<CompletedTaskMessageCreated>;
  chatsvc_CreateChatCommand?: Maybe<CreateChatCommand>;
  chatsvc_CreateChatMemberCommand?: Maybe<CreateChatMemberCommand>;
  chatsvc_CreateChatMessageCommand?: Maybe<CreateChatMessageCommand>;
  chatsvc_CreateCompletedTaskMessageCommand?: Maybe<CreateCompletedTaskMessageCommand>;
  chatsvc_DeleteChatCommand?: Maybe<DeleteChatCommand>;
  chatsvc_DeleteChatMemberCommand?: Maybe<DeleteChatMemberCommand>;
  chatsvc_DeleteChatMessageAction?: Maybe<DeleteChatMessageAction>;
  chatsvc_GetChatHistoryRequest?: Maybe<GetChatHistoryRequest>;
  chatsvc_GetChatMembersResponse?: Maybe<GetChatMembersResponse>;
  chatsvc_GetChatRequest?: Maybe<GetChatRequest>;
  chatsvc_GetChatResponse?: Maybe<GetChatResponse>;
  chatsvc_GetChatsForUserRequest?: Maybe<GetChatsForUserRequest>;
  chatsvc_GetChatsForUserResponse?: Maybe<GetChatsForUserResponse>;
  chatsvc_GetChatsRequest?: Maybe<GetChatsRequest>;
  chatsvc_GetChatsResponse?: Maybe<GetChatsResponse>;
  chatsvc_GetClientChatsSinceRequest?: Maybe<GetClientChatsSinceRequest>;
  chatsvc_GetClientChatsSinceResponse?: Maybe<GetClientChatsSinceResponse>;
  chatsvc_GetMessagesByChatIdResponse?: Maybe<GetMessagesByChatIdResponse>;
  chatsvc_GetMessagesInThread?: Maybe<GetMessagesInThread>;
  chatsvc_GetMessagesInThreadResponse?: Maybe<GetMessagesInThreadResponse>;
  chatsvc_GetMessagesRequest?: Maybe<GetMessagesRequest>;
  chatsvc_GetMessagesResponse?: Maybe<GetMessagesResponse>;
  chatsvc_GetReadMessageUsersResponse?: Maybe<GetReadMessageUsersResponse>;
  chatsvc_GetThreadResponse?: Maybe<GetThreadResponse>;
  chatsvc_GetUnreadMessageCountResponse?: Maybe<GetUnreadMessageCountResponse>;
  chatsvc_GetUnreadMessagesRequest?: Maybe<GetUnreadMessagesRequest>;
  chatsvc_GetUsersUnreadChatMessagesRequest?: Maybe<GetUsersUnreadChatMessagesRequest>;
  chatsvc_GetUsersUnreadChatMessagesResponse?: Maybe<GetUsersUnreadChatMessagesResponse>;
  chatsvc_MarkChatAsReadAction?: Maybe<MarkChatAsReadAction>;
  chatsvc_MarkMessagesAsReadCommand?: Maybe<MarkMessagesAsReadCommand>;
  chatsvc_MessageList?: Maybe<MessageList>;
  chatsvc_MessagesMarkedAsRead?: Maybe<MessagesMarkedAsRead>;
  chatsvc_NotifyAboutUnactionedChatsCommand?: Maybe<NotifyAboutUnactionedChatsCommand>;
  chatsvc_UpdateChatMessage?: Maybe<UpdateChatMessage>;
  chatsvc_UserIdList?: Maybe<UserIdList>;
  companysvc_AgencyDomain?: Maybe<AgencyDomain>;
  companysvc_AgencyDomainAndCompanyCreated?: Maybe<AgencyDomainAndCompanyCreated>;
  companysvc_AttendancePoliciesList?: Maybe<AttendancePoliciesList>;
  companysvc_AttendancePolicy?: Maybe<AttendancePolicy>;
  companysvc_AttendancePolicyBreakdown?: Maybe<AttendancePolicyBreakdown>;
  companysvc_CompaniesConnection?: Maybe<CompaniesConnection>;
  companysvc_CompaniesMerged?: Maybe<CompaniesMerged>;
  companysvc_Company?: Maybe<Company>;
  companysvc_CompanyCreated?: Maybe<CompanyCreated>;
  companysvc_CompanyCultureData?: Maybe<CompanyCultureData>;
  companysvc_CompanyCultureDataInput?: Maybe<CompanyCultureDataInput>;
  companysvc_CompanyCultureSaved?: Maybe<CompanyCultureSaved>;
  companysvc_CompanyDeleted?: Maybe<CompanyDeleted>;
  companysvc_CompanyIndustriesUpdated?: Maybe<CompanyIndustriesUpdated>;
  companysvc_CompanyIngress?: Maybe<CompanyIngress>;
  companysvc_CompanyIngresses?: Maybe<CompanyIngresses>;
  companysvc_CompanyRestored?: Maybe<CompanyRestored>;
  companysvc_CompanySize?: Maybe<CompanySize>;
  companysvc_CompanyTeam?: Maybe<CompanyTeam>;
  companysvc_CompanyTeamDeleted?: Maybe<CompanyTeamDeleted>;
  companysvc_CompanyTeamUpdated?: Maybe<CompanyTeamUpdated>;
  companysvc_CompanyTeamsCreated?: Maybe<CompanyTeamsCreated>;
  companysvc_CompanyTeamsList?: Maybe<CompanyTeamsList>;
  companysvc_CompanyUpdated?: Maybe<CompanyUpdated>;
  companysvc_ContractorCompany?: Maybe<ContractorCompany>;
  companysvc_CreateAgencyDomainAndCompanyCommand?: Maybe<CreateAgencyDomainAndCompanyCommand>;
  companysvc_CreateCompanyCommand?: Maybe<CreateCompanyCommand>;
  companysvc_CreateCompanyTeamsCommand?: Maybe<CreateCompanyTeamsCommand>;
  companysvc_CreateIndustryCommand?: Maybe<CreateIndustryCommand>;
  companysvc_CultureValue?: Maybe<CultureValue>;
  companysvc_DeleteCompanyCommand?: Maybe<DeleteCompanyCommand>;
  companysvc_DeleteCompanyTeamCommand?: Maybe<DeleteCompanyTeamCommand>;
  companysvc_DeleteIndustryCommand?: Maybe<DeleteIndustryCommand>;
  companysvc_Edge?: Maybe<Edge>;
  companysvc_GetAgencyCompanyForUrlRequest?: Maybe<GetAgencyCompanyForUrlRequest>;
  companysvc_GetAgencyCompanyForUrlResponse?: Maybe<GetAgencyCompanyForUrlResponse>;
  companysvc_GetAgencyDomainsRequest?: Maybe<GetAgencyDomainsRequest>;
  companysvc_GetAgencyDomainsResponse?: Maybe<GetAgencyDomainsResponse>;
  companysvc_GetAttendancePoliciesByEntityIdResponse?: Maybe<GetAttendancePoliciesByEntityIdResponse>;
  companysvc_GetCompaniesByIdResponse?: Maybe<GetCompaniesByIdResponse>;
  companysvc_GetCompaniesForAccountManagerRequest?: Maybe<GetCompaniesForAccountManagerRequest>;
  companysvc_GetCompaniesForAccountManagerResponse?: Maybe<GetCompaniesForAccountManagerResponse>;
  companysvc_GetCompaniesForClientSupportSpecialistsRequest?: Maybe<GetCompaniesForClientSupportSpecialistsRequest>;
  companysvc_GetCompaniesForClientSupportSpecialistsResponse?: Maybe<GetCompaniesForClientSupportSpecialistsResponse>;
  companysvc_GetCompaniesRequest?: Maybe<GetCompaniesRequest>;
  companysvc_GetCompaniesResponse?: Maybe<GetCompaniesResponse>;
  companysvc_GetCompanyIngressesBatchResponse?: Maybe<GetCompanyIngressesBatchResponse>;
  companysvc_GetCompanyRequest?: Maybe<GetCompanyRequest>;
  companysvc_GetCompanySizesRequest?: Maybe<GetCompanySizesRequest>;
  companysvc_GetCompanySizesResponse?: Maybe<GetCompanySizesResponse>;
  companysvc_GetCompanyTeamBatchResponse?: Maybe<GetCompanyTeamBatchResponse>;
  companysvc_GetCompanyTeamsByCompanyIdRequest?: Maybe<GetCompanyTeamsByCompanyIdRequest>;
  companysvc_GetCompanyTeamsByCompanyIdResponse?: Maybe<GetCompanyTeamsByCompanyIdResponse>;
  companysvc_GetCultureValuesRequest?: Maybe<GetCultureValuesRequest>;
  companysvc_GetCultureValuesResponse?: Maybe<GetCultureValuesResponse>;
  companysvc_GetHybridWorkInformationRequest?: Maybe<GetHybridWorkInformationRequest>;
  companysvc_GetHybridWorkInformationResponse?: Maybe<GetHybridWorkInformationResponse>;
  companysvc_GetIndustriesRequest?: Maybe<GetIndustriesRequest>;
  companysvc_GetIndustriesResponse?: Maybe<GetIndustriesResponse>;
  companysvc_GetMyAttendancePolicyRequest?: Maybe<GetMyAttendancePolicyRequest>;
  companysvc_GetMyAttendancePolicyResponse?: Maybe<GetMyAttendancePolicyResponse>;
  companysvc_GetOfficeValuesRequest?: Maybe<GetOfficeValuesRequest>;
  companysvc_GetOfficeValuesResponse?: Maybe<GetOfficeValuesResponse>;
  companysvc_GetTenantPrioritiesRequest?: Maybe<GetTenantPrioritiesRequest>;
  companysvc_GetTenantPrioritiesResponse?: Maybe<GetTenantPrioritiesResponse>;
  companysvc_GetWhitelistedCompanyForEmailRequest?: Maybe<GetWhitelistedCompanyForEmailRequest>;
  companysvc_GetWhitelistedCompanyForEmailResponse?: Maybe<GetWhitelistedCompanyForEmailResponse>;
  companysvc_GetWorkplaceGoalsRequest?: Maybe<GetWorkplaceGoalsRequest>;
  companysvc_GetWorkplaceGoalsResponse?: Maybe<GetWorkplaceGoalsResponse>;
  companysvc_GetWorkspaceStatusesRequest?: Maybe<GetWorkspaceStatusesRequest>;
  companysvc_GetWorkspaceStatusesResponse?: Maybe<GetWorkspaceStatusesResponse>;
  companysvc_HybridWorkInformationSaved?: Maybe<HybridWorkInformationSaved>;
  companysvc_Industry?: Maybe<Industry>;
  companysvc_IndustryCreated?: Maybe<IndustryCreated>;
  companysvc_IndustryDeleted?: Maybe<IndustryDeleted>;
  companysvc_LandlordFinancials?: Maybe<LandlordFinancials>;
  companysvc_MergeCompanies?: Maybe<MergeCompanies>;
  companysvc_OfficeValue?: Maybe<OfficeValue>;
  companysvc_OptionalCompanyType?: Maybe<OptionalCompanyType>;
  companysvc_PaginationOptions?: Maybe<PaginationOptions>;
  companysvc_PolicyDetails?: Maybe<PolicyDetails>;
  companysvc_PolicyInput?: Maybe<PolicyInput>;
  companysvc_ProcessWorkplaceStrategyTypeformResponseCommand?: Maybe<ProcessWorkplaceStrategyTypeformResponseCommand>;
  companysvc_RestoreCompanyCommand?: Maybe<RestoreCompanyCommand>;
  companysvc_SaveCompanyCultureCommand?: Maybe<SaveCompanyCultureCommand>;
  companysvc_SaveHybridWorkInformationCommand?: Maybe<SaveHybridWorkInformationCommand>;
  companysvc_SetCompanyIndustriesCommand?: Maybe<SetCompanyIndustriesCommand>;
  companysvc_SetCompanyIngressesCommand?: Maybe<SetCompanyIngressesCommand>;
  companysvc_TeamPayload?: Maybe<TeamPayload>;
  companysvc_TenantCompany?: Maybe<TenantCompany>;
  companysvc_TenantPriority?: Maybe<TenantPriority>;
  companysvc_UpdateCompanyCommand?: Maybe<UpdateCompanyCommand>;
  companysvc_UpdateCompanyTeamCommand?: Maybe<UpdateCompanyTeamCommand>;
  companysvc_UpdateOwnCompany?: Maybe<UpdateOwnCompany>;
  companysvc_WorkplaceGoal?: Maybe<WorkplaceGoal>;
  companysvc_WorkspaceStatus?: Maybe<WorkspaceStatus>;
  dealsvc_Activity?: Maybe<Activity>;
  dealsvc_ActivityCompleted?: Maybe<ActivityCompleted>;
  dealsvc_ActivityConnection?: Maybe<ActivityConnection>;
  dealsvc_ActivityCreated?: Maybe<ActivityCreated>;
  dealsvc_ActivityDeleted?: Maybe<ActivityDeleted>;
  dealsvc_ActivityEdge?: Maybe<ActivityEdge>;
  dealsvc_ActivityPageInfo?: Maybe<ActivityPageInfo>;
  dealsvc_ActivityType?: Maybe<ActivityType>;
  dealsvc_ActivityUpdated?: Maybe<ActivityUpdated>;
  dealsvc_AddSelectionsCommand?: Maybe<AddSelectionsCommand>;
  dealsvc_AddShortlistsToDealCommand?: Maybe<AddShortlistsToDealCommand>;
  dealsvc_ApproveShortlistCommand?: Maybe<ApproveShortlistCommand>;
  dealsvc_ArchiveTemplateCommand?: Maybe<ArchiveTemplateCommand>;
  dealsvc_AssignSalesTeamToBrokerCompanyCommand?: Maybe<AssignSalesTeamToBrokerCompanyCommand>;
  dealsvc_BrokerCommunication?: Maybe<BrokerCommunication>;
  dealsvc_BrokerEnquiriesFulfilled?: Maybe<BrokerEnquiriesFulfilled>;
  dealsvc_BrokerEnquiry?: Maybe<BrokerEnquiry>;
  dealsvc_BrokerEnquiryCreated?: Maybe<BrokerEnquiryCreated>;
  dealsvc_BrokerSearch?: Maybe<BrokerSearch>;
  dealsvc_BrokerSearchCreated?: Maybe<BrokerSearchCreated>;
  dealsvc_BrokerSearchDeleted?: Maybe<BrokerSearchDeleted>;
  dealsvc_BrokerSearchPolygonUpdated?: Maybe<BrokerSearchPolygonUpdated>;
  dealsvc_BrokerSearchUpdated?: Maybe<BrokerSearchUpdated>;
  dealsvc_BrokerSearchesBatchResponse?: Maybe<BrokerSearchesBatchResponse>;
  dealsvc_CreateActivityCommand?: Maybe<CreateActivityCommand>;
  dealsvc_CreateBrokerEnquiryCommand?: Maybe<CreateBrokerEnquiryCommand>;
  dealsvc_CreateBrokerSearchCommand?: Maybe<CreateBrokerSearchCommand>;
  dealsvc_CreateDealCommand?: Maybe<CreateDealCommand>;
  dealsvc_CreateDealSpaceMatchCommand?: Maybe<CreateDealSpaceMatchCommand>;
  dealsvc_CreateDismissedRecommendationsCommand?: Maybe<CreateDismissedRecommendationsCommand>;
  dealsvc_CreateNoteOnDealCommand?: Maybe<CreateNoteOnDealCommand>;
  dealsvc_CreateSelectionFeedbacksCommand?: Maybe<CreateSelectionFeedbacksCommand>;
  dealsvc_CreateShortlistCommand?: Maybe<CreateShortlistCommand>;
  dealsvc_CreateShortlistViewingRequestsCommand?: Maybe<CreateShortlistViewingRequestsCommand>;
  dealsvc_CreateTemplateCommand?: Maybe<CreateTemplateCommand>;
  dealsvc_CreateViewingRequestCommand?: Maybe<CreateViewingRequestCommand>;
  dealsvc_Deal?: Maybe<Deal>;
  dealsvc_DealConnection?: Maybe<DealConnection>;
  dealsvc_DealCreated?: Maybe<DealCreated>;
  dealsvc_DealDeleted?: Maybe<DealDeleted>;
  dealsvc_DealEdge?: Maybe<DealEdge>;
  dealsvc_DealFilters?: Maybe<DealFilters>;
  dealsvc_DealList?: Maybe<DealList>;
  dealsvc_DealMoney?: Maybe<DealMoney>;
  dealsvc_DealMoneyRange?: Maybe<DealMoneyRange>;
  dealsvc_DealNumericRange?: Maybe<DealNumericRange>;
  dealsvc_DealPageInfo?: Maybe<DealPageInfo>;
  dealsvc_DealPaginationData?: Maybe<DealPaginationData>;
  dealsvc_DealPipelineStage?: Maybe<DealPipelineStage>;
  dealsvc_DealRequirements?: Maybe<DealRequirements>;
  dealsvc_DealShortlist?: Maybe<DealShortlist>;
  dealsvc_DealSpaceMatch?: Maybe<DealSpaceMatch>;
  dealsvc_DealSpaceMatchDeleted?: Maybe<DealSpaceMatchDeleted>;
  dealsvc_DealSpaceMatchUpdated?: Maybe<DealSpaceMatchUpdated>;
  dealsvc_DealSpaceMatched?: Maybe<DealSpaceMatched>;
  dealsvc_DealStageEvent?: Maybe<DealStageEvent>;
  dealsvc_DealTimestampRange?: Maybe<DealTimestampRange>;
  dealsvc_DealTypeOptional?: Maybe<DealTypeOptional>;
  dealsvc_DealUpdated?: Maybe<DealUpdated>;
  dealsvc_DealsBatchResponse?: Maybe<DealsBatchResponse>;
  dealsvc_DealsConnection?: Maybe<DealsConnection>;
  dealsvc_DealsManyBatchResponse?: Maybe<DealsManyBatchResponse>;
  dealsvc_DealsMerged?: Maybe<DealsMerged>;
  dealsvc_DeleteActivityCommand?: Maybe<DeleteActivityCommand>;
  dealsvc_DeleteBrokerSearchCommand?: Maybe<DeleteBrokerSearchCommand>;
  dealsvc_DeleteDealCommand?: Maybe<DeleteDealCommand>;
  dealsvc_DeleteDealSpaceMatchCommand?: Maybe<DeleteDealSpaceMatchCommand>;
  dealsvc_DeleteMatchedSpace?: Maybe<DeleteMatchedSpace>;
  dealsvc_DeleteNoteOnDealCommand?: Maybe<DeleteNoteOnDealCommand>;
  dealsvc_DeleteShortlistCommand?: Maybe<DeleteShortlistCommand>;
  dealsvc_DismissedRecommendation?: Maybe<DismissedRecommendation>;
  dealsvc_DismissedRecommendationsCreated?: Maybe<DismissedRecommendationsCreated>;
  dealsvc_FloorFilters?: Maybe<FloorFilters>;
  dealsvc_GetActivitiesBatchResponse?: Maybe<GetActivitiesBatchResponse>;
  dealsvc_GetActivitiesRequest?: Maybe<GetActivitiesRequest>;
  dealsvc_GetActivitiesResponse?: Maybe<GetActivitiesResponse>;
  dealsvc_GetActivityIdsForSelectionRequest?: Maybe<GetActivityIdsForSelectionRequest>;
  dealsvc_GetActivityIdsForSelectionResponse?: Maybe<GetActivityIdsForSelectionResponse>;
  dealsvc_GetActivityRequest?: Maybe<GetActivityRequest>;
  dealsvc_GetActivityResponse?: Maybe<GetActivityResponse>;
  dealsvc_GetActivityTypesRequest?: Maybe<GetActivityTypesRequest>;
  dealsvc_GetActivityTypesResponse?: Maybe<GetActivityTypesResponse>;
  dealsvc_GetAllSalesTeamsRequest?: Maybe<GetAllSalesTeamsRequest>;
  dealsvc_GetAllSalesTeamsResponse?: Maybe<GetAllSalesTeamsResponse>;
  dealsvc_GetBrokerCommunicationsBatchResponse?: Maybe<GetBrokerCommunicationsBatchResponse>;
  dealsvc_GetBrokerSearchRequest?: Maybe<GetBrokerSearchRequest>;
  dealsvc_GetBrokerSearchResponse?: Maybe<GetBrokerSearchResponse>;
  dealsvc_GetDealByClientCompanyIdResponse?: Maybe<GetDealByClientCompanyIdResponse>;
  dealsvc_GetDealFromBrokerSearchRequest?: Maybe<GetDealFromBrokerSearchRequest>;
  dealsvc_GetDealFromBrokerSearchResponse?: Maybe<GetDealFromBrokerSearchResponse>;
  dealsvc_GetDealNotesRequest?: Maybe<GetDealNotesRequest>;
  dealsvc_GetDealNotesResponse?: Maybe<GetDealNotesResponse>;
  dealsvc_GetDealPipelineStagesBatchResponse?: Maybe<GetDealPipelineStagesBatchResponse>;
  dealsvc_GetDealRequest?: Maybe<GetDealRequest>;
  dealsvc_GetDealResponse?: Maybe<GetDealResponse>;
  dealsvc_GetDealShortlistsBatchResponse?: Maybe<GetDealShortlistsBatchResponse>;
  dealsvc_GetDealShortlistsRequest?: Maybe<GetDealShortlistsRequest>;
  dealsvc_GetDealShortlistsResponse?: Maybe<GetDealShortlistsResponse>;
  dealsvc_GetDealSpaceMatchRequest?: Maybe<GetDealSpaceMatchRequest>;
  dealsvc_GetDealSpaceMatchResponse?: Maybe<GetDealSpaceMatchResponse>;
  dealsvc_GetDealSpaceMatchesRequest?: Maybe<GetDealSpaceMatchesRequest>;
  dealsvc_GetDealSpaceMatchesResponse?: Maybe<GetDealSpaceMatchesResponse>;
  dealsvc_GetDealsListRequest?: Maybe<GetDealsListRequest>;
  dealsvc_GetDealsRequest?: Maybe<GetDealsRequest>;
  dealsvc_GetDealsResponse?: Maybe<GetDealsResponse>;
  dealsvc_GetFirstViewingActivitiesByUnitIdsBatchResponse?: Maybe<GetFirstViewingActivitiesByUnitIdsBatchResponse>;
  dealsvc_GetLeadSourcesRequest?: Maybe<GetLeadSourcesRequest>;
  dealsvc_GetLeadSourcesResponse?: Maybe<GetLeadSourcesResponse>;
  dealsvc_GetLostReasonsRequest?: Maybe<GetLostReasonsRequest>;
  dealsvc_GetLostReasonsResponse?: Maybe<GetLostReasonsResponse>;
  dealsvc_GetMatchedSpacesRequest?: Maybe<GetMatchedSpacesRequest>;
  dealsvc_GetMatchedSpacesResponse?: Maybe<GetMatchedSpacesResponse>;
  dealsvc_GetNoteRequest?: Maybe<GetNoteRequest>;
  dealsvc_GetNoteResponse?: Maybe<GetNoteResponse>;
  dealsvc_GetNotesBatchResponse?: Maybe<GetNotesBatchResponse>;
  dealsvc_GetPipelineStagesBatchResponse?: Maybe<GetPipelineStagesBatchResponse>;
  dealsvc_GetSalesTeamRequest?: Maybe<GetSalesTeamRequest>;
  dealsvc_GetSalesTeamResponse?: Maybe<GetSalesTeamResponse>;
  dealsvc_GetSalesTeamsBatchResponse?: Maybe<GetSalesTeamsBatchResponse>;
  dealsvc_GetSearchRequirementsRequest?: Maybe<GetSearchRequirementsRequest>;
  dealsvc_GetSearchRequirementsResponse?: Maybe<GetSearchRequirementsResponse>;
  dealsvc_GetSelectionFromUnitGroupIdRequest?: Maybe<GetSelectionFromUnitGroupIdRequest>;
  dealsvc_GetSelectionsBatchResponse?: Maybe<GetSelectionsBatchResponse>;
  dealsvc_GetSelectionsFromUnitGroupIdsBatchResponse?: Maybe<GetSelectionsFromUnitGroupIdsBatchResponse>;
  dealsvc_GetShortlistRequest?: Maybe<GetShortlistRequest>;
  dealsvc_GetShortlistResponse?: Maybe<GetShortlistResponse>;
  dealsvc_GetShortlistSummaryRequest?: Maybe<GetShortlistSummaryRequest>;
  dealsvc_GetShortlistSummaryResponse?: Maybe<GetShortlistSummaryResponse>;
  dealsvc_GetStagesRequest?: Maybe<GetStagesRequest>;
  dealsvc_GetStagesResponse?: Maybe<GetStagesResponse>;
  dealsvc_GetTemplateRequest?: Maybe<GetTemplateRequest>;
  dealsvc_GetTemplateResponse?: Maybe<GetTemplateResponse>;
  dealsvc_GetTemplatesRequest?: Maybe<GetTemplatesRequest>;
  dealsvc_GetTemplatesResponse?: Maybe<GetTemplatesResponse>;
  dealsvc_GetThreadDealsRequest?: Maybe<GetThreadDealsRequest>;
  dealsvc_GetThreadDealsResponse?: Maybe<GetThreadDealsResponse>;
  dealsvc_GetUserBrokerSearchesRequest?: Maybe<GetUserBrokerSearchesRequest>;
  dealsvc_GetUserBrokerSearchesResponse?: Maybe<GetUserBrokerSearchesResponse>;
  dealsvc_GetUserShortlistsRequest?: Maybe<GetUserShortlistsRequest>;
  dealsvc_GetUserShortlistsResponse?: Maybe<GetUserShortlistsResponse>;
  dealsvc_GetUserViewingRequestsRequest?: Maybe<GetUserViewingRequestsRequest>;
  dealsvc_GetUserViewingRequestsResponse?: Maybe<GetUserViewingRequestsResponse>;
  dealsvc_GetUserViewingsRequest?: Maybe<GetUserViewingsRequest>;
  dealsvc_GetUserViewingsResponse?: Maybe<GetUserViewingsResponse>;
  dealsvc_GetViewingRequestsForShortlistRequest?: Maybe<GetViewingRequestsForShortlistRequest>;
  dealsvc_GetViewingRequestsForShortlistResponse?: Maybe<GetViewingRequestsForShortlistResponse>;
  dealsvc_GetViewingsForShortlistBatchResponse?: Maybe<GetViewingsForShortlistBatchResponse>;
  dealsvc_LeadSource?: Maybe<LeadSource>;
  dealsvc_LostReason?: Maybe<LostReason>;
  dealsvc_MatchSpacesCommand?: Maybe<MatchSpacesCommand>;
  dealsvc_MatchedSpace?: Maybe<MatchedSpace>;
  dealsvc_MatchedSpaceDeleted?: Maybe<MatchedSpaceDeleted>;
  dealsvc_MatchedSpaceRestored?: Maybe<MatchedSpaceRestored>;
  dealsvc_MatchedSpacesReordered?: Maybe<MatchedSpacesReordered>;
  dealsvc_MergeDealsCommand?: Maybe<MergeDealsCommand>;
  dealsvc_Note?: Maybe<Note>;
  dealsvc_NoteCreated?: Maybe<NoteCreated>;
  dealsvc_NoteDeleted?: Maybe<NoteDeleted>;
  dealsvc_NoteUpdated?: Maybe<NoteUpdated>;
  dealsvc_PipelineStage?: Maybe<PipelineStage>;
  dealsvc_RemoveSelectionsCommand?: Maybe<RemoveSelectionsCommand>;
  dealsvc_RemoveShortlistsFromDealCommand?: Maybe<RemoveShortlistsFromDealCommand>;
  dealsvc_ReorderMatchedSpacesCommand?: Maybe<ReorderMatchedSpacesCommand>;
  dealsvc_RequestAddShortlistToValveCommand?: Maybe<RequestAddShortlistToValveCommand>;
  dealsvc_RestoreDeal?: Maybe<RestoreDeal>;
  dealsvc_RestoreMatchedSpace?: Maybe<RestoreMatchedSpace>;
  dealsvc_RestoreShortlistCommand?: Maybe<RestoreShortlistCommand>;
  dealsvc_SalesTeam?: Maybe<SalesTeam>;
  dealsvc_SalesTeamAssignedToBrokerCompany?: Maybe<SalesTeamAssignedToBrokerCompany>;
  dealsvc_SaveSearchRequirementsCommand?: Maybe<SaveSearchRequirementsCommand>;
  dealsvc_SearchHistory?: Maybe<SearchHistory>;
  dealsvc_SearchRequirements?: Maybe<SearchRequirements>;
  dealsvc_SearchRequirementsSaved?: Maybe<SearchRequirementsSaved>;
  dealsvc_SecondarySearchRequirements?: Maybe<SecondarySearchRequirements>;
  dealsvc_Selection?: Maybe<Selection>;
  dealsvc_SelectionFeedback?: Maybe<SelectionFeedback>;
  dealsvc_SelectionFeedbacksCreated?: Maybe<SelectionFeedbacksCreated>;
  dealsvc_SelectionsAdded?: Maybe<SelectionsAdded>;
  dealsvc_SelectionsRemoved?: Maybe<SelectionsRemoved>;
  dealsvc_SelectionsUpdated?: Maybe<SelectionsUpdated>;
  dealsvc_ShareShortlistWithCurrentUserCommand?: Maybe<ShareShortlistWithCurrentUserCommand>;
  dealsvc_Shortlist?: Maybe<Shortlist>;
  dealsvc_ShortlistAddToValveRequested?: Maybe<ShortlistAddToValveRequested>;
  dealsvc_ShortlistApproved?: Maybe<ShortlistApproved>;
  dealsvc_ShortlistConnection?: Maybe<ShortlistConnection>;
  dealsvc_ShortlistCreated?: Maybe<ShortlistCreated>;
  dealsvc_ShortlistDeleted?: Maybe<ShortlistDeleted>;
  dealsvc_ShortlistEdge?: Maybe<ShortlistEdge>;
  dealsvc_ShortlistRestored?: Maybe<ShortlistRestored>;
  dealsvc_ShortlistSharedCurrentUser?: Maybe<ShortlistSharedCurrentUser>;
  dealsvc_ShortlistSummary?: Maybe<ShortlistSummary>;
  dealsvc_ShortlistUpdated?: Maybe<ShortlistUpdated>;
  dealsvc_ShortlistViewingRequest?: Maybe<ShortlistViewingRequest>;
  dealsvc_ShortlistViewingRequestsCreated?: Maybe<ShortlistViewingRequestsCreated>;
  dealsvc_ShortlistsAddedToDeal?: Maybe<ShortlistsAddedToDeal>;
  dealsvc_ShortlistsRemovedFromDeal?: Maybe<ShortlistsRemovedFromDeal>;
  dealsvc_SpacesMatched?: Maybe<SpacesMatched>;
  dealsvc_Template?: Maybe<Template>;
  dealsvc_TemplateArchived?: Maybe<TemplateArchived>;
  dealsvc_TemplateCreated?: Maybe<TemplateCreated>;
  dealsvc_TemplateUpdated?: Maybe<TemplateUpdated>;
  dealsvc_UpdateActivityCommand?: Maybe<UpdateActivityCommand>;
  dealsvc_UpdateBrokerSearchCommand?: Maybe<UpdateBrokerSearchCommand>;
  dealsvc_UpdateBrokerSearchPolygonCommand?: Maybe<UpdateBrokerSearchPolygonCommand>;
  dealsvc_UpdateDealCommand?: Maybe<UpdateDealCommand>;
  dealsvc_UpdateDealSpaceMatchCommand?: Maybe<UpdateDealSpaceMatchCommand>;
  dealsvc_UpdateNoteOnDealCommand?: Maybe<UpdateNoteOnDealCommand>;
  dealsvc_UpdateSelectionsCommand?: Maybe<UpdateSelectionsCommand>;
  dealsvc_UpdateShortlistCommand?: Maybe<UpdateShortlistCommand>;
  dealsvc_UpdateTemplateCommand?: Maybe<UpdateTemplateCommand>;
  dealsvc_Viewing?: Maybe<Viewing>;
  dealsvc_ViewingRequest?: Maybe<ViewingRequest>;
  dealsvc_ViewingRequestCreated?: Maybe<ViewingRequestCreated>;
  dealsvc_Viewings?: Maybe<Viewings>;
  deploymentsvc_DeployFinished?: Maybe<DeployFinished>;
  deploymentsvc_DeployPreviewCommand?: Maybe<DeployPreviewCommand>;
  deploymentsvc_DeployStarted?: Maybe<DeployStarted>;
  deploymentsvc_GetDeploymentStatusRequest?: Maybe<GetDeploymentStatusRequest>;
  deploymentsvc_GetDeploymentStatusResponse?: Maybe<GetDeploymentStatusResponse>;
  deploymentsvc_GetReadinessStateRequest?: Maybe<GetReadinessStateRequest>;
  deploymentsvc_GetReadinessStateResponse?: Maybe<GetReadinessStateResponse>;
  gmailsvc_Email?: Maybe<Email>;
  gmailsvc_EmailContact?: Maybe<EmailContact>;
  gmailsvc_EmailContent?: Maybe<EmailContent>;
  gmailsvc_EmailCreated?: Maybe<EmailCreated>;
  gmailsvc_EmailMetadata?: Maybe<EmailMetadata>;
  gmailsvc_EmailSent?: Maybe<EmailSent>;
  gmailsvc_EmailUpdated?: Maybe<EmailUpdated>;
  gmailsvc_GetEmailContentRequest?: Maybe<GetEmailContentRequest>;
  gmailsvc_GetEmailContentResponse?: Maybe<GetEmailContentResponse>;
  gmailsvc_GetEmailRequest?: Maybe<GetEmailRequest>;
  gmailsvc_GetEmailResponse?: Maybe<GetEmailResponse>;
  gmailsvc_GetEmailsRequest?: Maybe<GetEmailsRequest>;
  gmailsvc_GetEmailsResponse?: Maybe<GetEmailsResponse>;
  gmailsvc_GetSharedInboxesRequest?: Maybe<GetSharedInboxesRequest>;
  gmailsvc_GetSharedInboxesResponse?: Maybe<GetSharedInboxesResponse>;
  gmailsvc_ListenForEmailsCommand?: Maybe<ListenForEmailsCommand>;
  gmailsvc_ListeningForEmails?: Maybe<ListeningForEmails>;
  gmailsvc_SendEmailCommand?: Maybe<SendEmailCommand>;
  guestsvc_DeleteGuestCommand?: Maybe<DeleteGuestCommand>;
  guestsvc_DoorOpenedForGuest?: Maybe<DoorOpenedForGuest>;
  guestsvc_GetCompanyGuestsRequest?: Maybe<GetCompanyGuestsRequest>;
  guestsvc_GetCompanyGuestsResponse?: Maybe<GetCompanyGuestsResponse>;
  guestsvc_GetGuestAccessesRequest?: Maybe<GetGuestAccessesRequest>;
  guestsvc_GetGuestAccessesResponse?: Maybe<GetGuestAccessesResponse>;
  guestsvc_GetGuestRequest?: Maybe<GetGuestRequest>;
  guestsvc_GetGuestResponse?: Maybe<GetGuestResponse>;
  guestsvc_GetGuestsBatchResponse?: Maybe<GetGuestsBatchResponse>;
  guestsvc_GetGuestsRequest?: Maybe<GetGuestsRequest>;
  guestsvc_GetGuestsResponse?: Maybe<GetGuestsResponse>;
  guestsvc_GetMyGuestsPaginated?: Maybe<GetMyGuestsPaginated>;
  guestsvc_Guest?: Maybe<Guest>;
  guestsvc_GuestArrived?: Maybe<GuestArrived>;
  guestsvc_GuestArrivedCommand?: Maybe<GuestArrivedCommand>;
  guestsvc_GuestConnection?: Maybe<GuestConnection>;
  guestsvc_GuestDateRange?: Maybe<GuestDateRange>;
  guestsvc_GuestDayPassResent?: Maybe<GuestDayPassResent>;
  guestsvc_GuestDeleted?: Maybe<GuestDeleted>;
  guestsvc_GuestEdge?: Maybe<GuestEdge>;
  guestsvc_GuestRegistered?: Maybe<GuestRegistered>;
  guestsvc_OpenDoorForGuestCommand?: Maybe<OpenDoorForGuestCommand>;
  guestsvc_RegisterGuestCommand?: Maybe<RegisterGuestCommand>;
  guestsvc_ResendGuestDayPass?: Maybe<ResendGuestDayPass>;
  guestsvc_TodaysGuestsNotification?: Maybe<TodaysGuestsNotification>;
  intercomsvc_AnswerSession?: Maybe<AnswerSession>;
  intercomsvc_CallMade?: Maybe<CallMade>;
  intercomsvc_EndSession?: Maybe<EndSession>;
  intercomsvc_GetActiveSessionsResponse?: Maybe<GetActiveSessionsResponse>;
  intercomsvc_GetPhoneNumbersRequest?: Maybe<GetPhoneNumbersRequest>;
  intercomsvc_GetPhoneNumbersResponse?: Maybe<GetPhoneNumbersResponse>;
  intercomsvc_GetSessionRequest?: Maybe<GetSessionRequest>;
  intercomsvc_GetSessionResponse?: Maybe<GetSessionResponse>;
  intercomsvc_GetSessionsRequest?: Maybe<GetSessionsRequest>;
  intercomsvc_GetSessionsResponse?: Maybe<GetSessionsResponse>;
  intercomsvc_GetWebhookRequest?: Maybe<GetWebhookRequest>;
  intercomsvc_GetWebhookResponse?: Maybe<GetWebhookResponse>;
  intercomsvc_IntercomPressed?: Maybe<IntercomPressed>;
  intercomsvc_PhoneNumber?: Maybe<PhoneNumber>;
  intercomsvc_PhoneNumberCreated?: Maybe<PhoneNumberCreated>;
  intercomsvc_ProvisionPhoneNumberCommand?: Maybe<ProvisionPhoneNumberCommand>;
  intercomsvc_ReconfigureProviders?: Maybe<ReconfigureProviders>;
  intercomsvc_Session?: Maybe<Session>;
  intercomsvc_SessionAnswered?: Maybe<SessionAnswered>;
  intercomsvc_SessionCreated?: Maybe<SessionCreated>;
  intercomsvc_SessionRecorded?: Maybe<SessionRecorded>;
  intercomsvc_SessionUpdated?: Maybe<SessionUpdated>;
  intercomsvc_TwilioNumberDeleted?: Maybe<TwilioNumberDeleted>;
  locationsvc_AccessMethodOptional?: Maybe<AccessMethodOptional>;
  locationsvc_AgenciesForLocationUpdated?: Maybe<AgenciesForLocationUpdated>;
  locationsvc_AgentSetUpOptional?: Maybe<AgentSetUpOptional>;
  locationsvc_ArchiveLocationCommand?: Maybe<ArchiveLocationCommand>;
  locationsvc_Area?: Maybe<Area>;
  locationsvc_Breakdown?: Maybe<Breakdown>;
  locationsvc_Building?: Maybe<Building>;
  locationsvc_BuildingDetails?: Maybe<BuildingDetails>;
  locationsvc_BuildingInput?: Maybe<BuildingInput>;
  locationsvc_BuildingSaved?: Maybe<BuildingSaved>;
  locationsvc_BuildingSourceUrl?: Maybe<BuildingSourceUrl>;
  locationsvc_BuildingSubmitted?: Maybe<BuildingSubmitted>;
  locationsvc_BuildingTrait?: Maybe<BuildingTrait>;
  locationsvc_BuildingTraitCreated?: Maybe<BuildingTraitCreated>;
  locationsvc_BuildingTraitInput?: Maybe<BuildingTraitInput>;
  locationsvc_BuildingUnit?: Maybe<BuildingUnit>;
  locationsvc_BuildingUnitDetails?: Maybe<BuildingUnitDetails>;
  locationsvc_BuildingUnitInput?: Maybe<BuildingUnitInput>;
  locationsvc_BuildingUnitRestored?: Maybe<BuildingUnitRestored>;
  locationsvc_BuildingUnits?: Maybe<BuildingUnits>;
  locationsvc_BuildingsMerged?: Maybe<BuildingsMerged>;
  locationsvc_CheckAndUpdateListedLocationsCommand?: Maybe<CheckAndUpdateListedLocationsCommand>;
  locationsvc_CombinationDetails?: Maybe<CombinationDetails>;
  locationsvc_CommercialModelBreakdown?: Maybe<CommercialModelBreakdown>;
  locationsvc_CommercialModelInputs?: Maybe<CommercialModelInputs>;
  locationsvc_CreateBuildingTraitCommand?: Maybe<CreateBuildingTraitCommand>;
  locationsvc_CreateListedBuildingsDatasetCommand?: Maybe<CreateListedBuildingsDatasetCommand>;
  locationsvc_CreateLocationCommand?: Maybe<CreateLocationCommand>;
  locationsvc_CreateLocationFacilityCommand?: Maybe<CreateLocationFacilityCommand>;
  locationsvc_CreateLocationSellingPoint?: Maybe<CreateLocationSellingPoint>;
  locationsvc_CreateScrapedLocationsCommand?: Maybe<CreateScrapedLocationsCommand>;
  locationsvc_DeleteLocationCommand?: Maybe<DeleteLocationCommand>;
  locationsvc_DeleteLocationSellingPoint?: Maybe<DeleteLocationSellingPoint>;
  locationsvc_DiscardSourcedLocationCommand?: Maybe<DiscardSourcedLocationCommand>;
  locationsvc_DisqualifyLocation?: Maybe<DisqualifyLocation>;
  locationsvc_EditLocation?: Maybe<EditLocation>;
  locationsvc_EditLocationCommand?: Maybe<EditLocationCommand>;
  locationsvc_EditUnit?: Maybe<EditUnit>;
  locationsvc_FacilityIcon?: Maybe<FacilityIcon>;
  locationsvc_GetAreasRequest?: Maybe<GetAreasRequest>;
  locationsvc_GetAreasResponse?: Maybe<GetAreasResponse>;
  locationsvc_GetBuildingRequest?: Maybe<GetBuildingRequest>;
  locationsvc_GetBuildingResponse?: Maybe<GetBuildingResponse>;
  locationsvc_GetBuildingTimeZoneBatchRequest?: Maybe<GetBuildingTimeZoneBatchRequest>;
  locationsvc_GetBuildingTimeZoneBatchResponse?: Maybe<GetBuildingTimeZoneBatchResponse>;
  locationsvc_GetBuildingTimeZoneRequest?: Maybe<GetBuildingTimeZoneRequest>;
  locationsvc_GetBuildingTraitsRequest?: Maybe<GetBuildingTraitsRequest>;
  locationsvc_GetBuildingTraitsResponse?: Maybe<GetBuildingTraitsResponse>;
  locationsvc_GetBuildingUnitsBatchResponse?: Maybe<GetBuildingUnitsBatchResponse>;
  locationsvc_GetBuildingsBatchResponse?: Maybe<GetBuildingsBatchResponse>;
  locationsvc_GetCombinationDetailsBatchRequest?: Maybe<GetCombinationDetailsBatchRequest>;
  locationsvc_GetCombinationDetailsBatchResponse?: Maybe<GetCombinationDetailsBatchResponse>;
  locationsvc_GetCombinationDetailsRequest?: Maybe<GetCombinationDetailsRequest>;
  locationsvc_GetCombinationDetailsResponse?: Maybe<GetCombinationDetailsResponse>;
  locationsvc_GetCommercialModelRequest?: Maybe<GetCommercialModelRequest>;
  locationsvc_GetCommercialModelResponse?: Maybe<GetCommercialModelResponse>;
  locationsvc_GetFacilityIconsRequest?: Maybe<GetFacilityIconsRequest>;
  locationsvc_GetFacilityIconsResponse?: Maybe<GetFacilityIconsResponse>;
  locationsvc_GetFieldsRequiredForNextStatusRequest?: Maybe<GetFieldsRequiredForNextStatusRequest>;
  locationsvc_GetFieldsRequiredForNextStatusResponse?: Maybe<GetFieldsRequiredForNextStatusResponse>;
  locationsvc_GetLocationFacilitiesRequest?: Maybe<GetLocationFacilitiesRequest>;
  locationsvc_GetLocationFacilitiesResponse?: Maybe<GetLocationFacilitiesResponse>;
  locationsvc_GetLocationFinancialModelBatchResponse?: Maybe<GetLocationFinancialModelBatchResponse>;
  locationsvc_GetLocationFinancialModelResponse?: Maybe<GetLocationFinancialModelResponse>;
  locationsvc_GetLocationRequest?: Maybe<GetLocationRequest>;
  locationsvc_GetLocationResponse?: Maybe<GetLocationResponse>;
  locationsvc_GetLocationScrapedStatusResponse?: Maybe<GetLocationScrapedStatusResponse>;
  locationsvc_GetLocationSellingPointsRequest?: Maybe<GetLocationSellingPointsRequest>;
  locationsvc_GetLocationSellingPointsResponse?: Maybe<GetLocationSellingPointsResponse>;
  locationsvc_GetLocationsPaginatedResponse?: Maybe<GetLocationsPaginatedResponse>;
  locationsvc_GetLocationsRequest?: Maybe<GetLocationsRequest>;
  locationsvc_GetPricingRequest?: Maybe<GetPricingRequest>;
  locationsvc_GetPricingResponse?: Maybe<GetPricingResponse>;
  locationsvc_GetPricingsBatchRequest?: Maybe<GetPricingsBatchRequest>;
  locationsvc_GetPricingsBatchResponse?: Maybe<GetPricingsBatchResponse>;
  locationsvc_GetSpaceMatchLocationsResponse?: Maybe<GetSpaceMatchLocationsResponse>;
  locationsvc_GetTrainStationsForLocationRequest?: Maybe<GetTrainStationsForLocationRequest>;
  locationsvc_GetTrainStationsForLocationResponse?: Maybe<GetTrainStationsForLocationResponse>;
  locationsvc_GetUnitsForBuildingsBatchResponse?: Maybe<GetUnitsForBuildingsBatchResponse>;
  locationsvc_ListedBuildingsDatasetCreated?: Maybe<ListedBuildingsDatasetCreated>;
  locationsvc_ListedLocationsCheckedAndUpdated?: Maybe<ListedLocationsCheckedAndUpdated>;
  locationsvc_Location?: Maybe<Location>;
  locationsvc_LocationAgency?: Maybe<LocationAgency>;
  locationsvc_LocationArchived?: Maybe<LocationArchived>;
  locationsvc_LocationCreated?: Maybe<LocationCreated>;
  locationsvc_LocationDateRange?: Maybe<LocationDateRange>;
  locationsvc_LocationDeleted?: Maybe<LocationDeleted>;
  locationsvc_LocationDisqualified?: Maybe<LocationDisqualified>;
  locationsvc_LocationEdge?: Maybe<LocationEdge>;
  locationsvc_LocationEdited?: Maybe<LocationEdited>;
  locationsvc_LocationFacility?: Maybe<LocationFacility>;
  locationsvc_LocationFacilityCreated?: Maybe<LocationFacilityCreated>;
  locationsvc_LocationFinancialModel?: Maybe<LocationFinancialModel>;
  locationsvc_LocationFinancialModelMutation?: Maybe<LocationFinancialModelMutation>;
  locationsvc_LocationMoney?: Maybe<LocationMoney>;
  locationsvc_LocationMutableData?: Maybe<LocationMutableData>;
  locationsvc_LocationMutableFinancialModel?: Maybe<LocationMutableFinancialModel>;
  locationsvc_LocationNameUpdated?: Maybe<LocationNameUpdated>;
  locationsvc_LocationProductFilters?: Maybe<LocationProductFilters>;
  locationsvc_LocationQualified?: Maybe<LocationQualified>;
  locationsvc_LocationRange?: Maybe<LocationRange>;
  locationsvc_LocationRangeFilter?: Maybe<LocationRangeFilter>;
  locationsvc_LocationRequiredFields?: Maybe<LocationRequiredFields>;
  locationsvc_LocationSellingPoint?: Maybe<LocationSellingPoint>;
  locationsvc_LocationSellingPointCreated?: Maybe<LocationSellingPointCreated>;
  locationsvc_LocationSellingPointDeleted?: Maybe<LocationSellingPointDeleted>;
  locationsvc_LocationSourceUrl?: Maybe<LocationSourceUrl>;
  locationsvc_LocationSpaceMatchEdge?: Maybe<LocationSpaceMatchEdge>;
  locationsvc_LocationSpaceMatchResult?: Maybe<LocationSpaceMatchResult>;
  locationsvc_LocationStation?: Maybe<LocationStation>;
  locationsvc_LocationUnarchived?: Maybe<LocationUnarchived>;
  locationsvc_LocationUpdated?: Maybe<LocationUpdated>;
  locationsvc_LocationVerified?: Maybe<LocationVerified>;
  locationsvc_LocationViewport?: Maybe<LocationViewport>;
  locationsvc_LocationsBatchResponse?: Maybe<LocationsBatchResponse>;
  locationsvc_LocationsConnection?: Maybe<LocationsConnection>;
  locationsvc_LocationsMerged?: Maybe<LocationsMerged>;
  locationsvc_LocationsUpdated?: Maybe<LocationsUpdated>;
  locationsvc_LockAcquiredForLocationVerification?: Maybe<LockAcquiredForLocationVerification>;
  locationsvc_LockLocationForVerificationCommand?: Maybe<LockLocationForVerificationCommand>;
  locationsvc_LockReleasedForLocationVerification?: Maybe<LockReleasedForLocationVerification>;
  locationsvc_LumpSums?: Maybe<LumpSums>;
  locationsvc_MergeBuildingsCommand?: Maybe<MergeBuildingsCommand>;
  locationsvc_MergeLocation?: Maybe<MergeLocation>;
  locationsvc_MergeLocationsCommand?: Maybe<MergeLocationsCommand>;
  locationsvc_MergeVerifyLocationsCommand?: Maybe<MergeVerifyLocationsCommand>;
  locationsvc_MinMax?: Maybe<MinMax>;
  locationsvc_PotentialProductFilters?: Maybe<PotentialProductFilters>;
  locationsvc_Pricing?: Maybe<Pricing>;
  locationsvc_QualifyLocationCommand?: Maybe<QualifyLocationCommand>;
  locationsvc_RequiredFields?: Maybe<RequiredFields>;
  locationsvc_RestoreBuildingUnitCommand?: Maybe<RestoreBuildingUnitCommand>;
  locationsvc_SaveBuildingCommand?: Maybe<SaveBuildingCommand>;
  locationsvc_ScrapedLocation?: Maybe<ScrapedLocation>;
  locationsvc_ScrapedLocationsCreated?: Maybe<ScrapedLocationsCreated>;
  locationsvc_ScrapedStatus?: Maybe<ScrapedStatus>;
  locationsvc_SourcedLocationDiscarded?: Maybe<SourcedLocationDiscarded>;
  locationsvc_SourcedLocationUpdated?: Maybe<SourcedLocationUpdated>;
  locationsvc_StatusOptional?: Maybe<StatusOptional>;
  locationsvc_SubmitBuildingCommand?: Maybe<SubmitBuildingCommand>;
  locationsvc_TierInputs?: Maybe<TierInputs>;
  locationsvc_TrainLine?: Maybe<TrainLine>;
  locationsvc_UnarchiveLocationCommand?: Maybe<UnarchiveLocationCommand>;
  locationsvc_UnitAvailabilityStatusOptional?: Maybe<UnitAvailabilityStatusOptional>;
  locationsvc_UnitCombinationResult?: Maybe<UnitCombinationResult>;
  locationsvc_UnitFilters?: Maybe<UnitFilters>;
  locationsvc_UnitFitoutStateOptional?: Maybe<UnitFitoutStateOptional>;
  locationsvc_UnlockLocationForVerificationCommand?: Maybe<UnlockLocationForVerificationCommand>;
  locationsvc_UpdateAgenciesForLocationCommand?: Maybe<UpdateAgenciesForLocationCommand>;
  locationsvc_UpdateLocationNameCommand?: Maybe<UpdateLocationNameCommand>;
  locationsvc_UpdateLocationStatusesCommand?: Maybe<UpdateLocationStatusesCommand>;
  locationsvc_UpdateSourcedLocationCommand?: Maybe<UpdateSourcedLocationCommand>;
  locationsvc_VerifyLocation?: Maybe<VerifyLocation>;
  locationsvc_VerifyLocationCommand?: Maybe<VerifyLocationCommand>;
  locationsvc_VerifyLocationsMerged?: Maybe<VerifyLocationsMerged>;
  locationsvc_VerifyUnit?: Maybe<VerifyUnit>;
  notificationsvc_Communication?: Maybe<Communication>;
  notificationsvc_CommunicationPreferenceSet?: Maybe<CommunicationPreferenceSet>;
  notificationsvc_CreateWebPushSubscription?: Maybe<CreateWebPushSubscription>;
  notificationsvc_DeleteUserPushTokenCommand?: Maybe<DeleteUserPushTokenCommand>;
  notificationsvc_DeleteWebPushSubscription?: Maybe<DeleteWebPushSubscription>;
  notificationsvc_EmailAction?: Maybe<EmailAction>;
  notificationsvc_EmailBody?: Maybe<EmailBody>;
  notificationsvc_EmailButton?: Maybe<EmailButton>;
  notificationsvc_EmailEntry?: Maybe<EmailEntry>;
  notificationsvc_EmailSentEvent?: Maybe<EmailSentEvent>;
  notificationsvc_EmailTable?: Maybe<EmailTable>;
  notificationsvc_EmailTableData?: Maybe<EmailTableData>;
  notificationsvc_GetCommunicationsBatchResponse?: Maybe<GetCommunicationsBatchResponse>;
  notificationsvc_GetHasUserReadNotificationResponse?: Maybe<GetHasUserReadNotificationResponse>;
  notificationsvc_GetMyNotificationPreferencesRequest?: Maybe<GetMyNotificationPreferencesRequest>;
  notificationsvc_GetMyNotificationPreferencesResponse?: Maybe<GetMyNotificationPreferencesResponse>;
  notificationsvc_GetNotificationsPaginatedRequest?: Maybe<GetNotificationsPaginatedRequest>;
  notificationsvc_GetNotificationsRequest?: Maybe<GetNotificationsRequest>;
  notificationsvc_GetNotificationsResponse?: Maybe<GetNotificationsResponse>;
  notificationsvc_KitchenSinkSent?: Maybe<KitchenSinkSent>;
  notificationsvc_MarkNotificationAsRead?: Maybe<MarkNotificationAsRead>;
  notificationsvc_NewEnquiryNotificationSent?: Maybe<NewEnquiryNotificationSent>;
  notificationsvc_Notification?: Maybe<Notification>;
  notificationsvc_NotificationEdge?: Maybe<NotificationEdge>;
  notificationsvc_NotificationMarkedAsRead?: Maybe<NotificationMarkedAsRead>;
  notificationsvc_NotificationPreferenceMetadata?: Maybe<NotificationPreferenceMetadata>;
  notificationsvc_NotificationSentToAllUsers?: Maybe<NotificationSentToAllUsers>;
  notificationsvc_NotificationsConnection?: Maybe<NotificationsConnection>;
  notificationsvc_NotifyAboutTenancyCommand?: Maybe<NotifyAboutTenancyCommand>;
  notificationsvc_Preference?: Maybe<Preference>;
  notificationsvc_RecoveryEmailSent?: Maybe<RecoveryEmailSent>;
  notificationsvc_SaveUserPushTokenCommand?: Maybe<SaveUserPushTokenCommand>;
  notificationsvc_SendChatPulse?: Maybe<SendChatPulse>;
  notificationsvc_SendEmailAction?: Maybe<SendEmailAction>;
  notificationsvc_SendKitchenSinkCommand?: Maybe<SendKitchenSinkCommand>;
  notificationsvc_SendNewEnquiryNotificationCommand?: Maybe<SendNewEnquiryNotificationCommand>;
  notificationsvc_SendNotificationToAllUsersCommand?: Maybe<SendNotificationToAllUsersCommand>;
  notificationsvc_SendNotificationToAllUsersDegraded?: Maybe<SendNotificationToAllUsersDegraded>;
  notificationsvc_SendTenancyPulse?: Maybe<SendTenancyPulse>;
  notificationsvc_SetCommunicationPreference?: Maybe<SetCommunicationPreference>;
  notificationsvc_SetCommunicationPreferenceForAllEmployeesOfCompany?: Maybe<SetCommunicationPreferenceForAllEmployeesOfCompany>;
  notificationsvc_TenantAppFeedbackSubmission?: Maybe<TenantAppFeedbackSubmission>;
  notificationsvc_UserNotifiedAboutTenancy?: Maybe<UserNotifiedAboutTenancy>;
  notificationsvc_UserPushTokenDeleted?: Maybe<UserPushTokenDeleted>;
  notificationsvc_UserPushTokenSaved?: Maybe<UserPushTokenSaved>;
  notificationsvc_WebPushSubscriptionCreated?: Maybe<WebPushSubscriptionCreated>;
  notificationsvc_WebPushSubscriptionError?: Maybe<WebPushSubscriptionError>;
  printingsvc_CreatePrinterQueue?: Maybe<CreatePrinterQueue>;
  printingsvc_GetPreviewRequest?: Maybe<GetPreviewRequest>;
  printingsvc_GetPreviewResponse?: Maybe<GetPreviewResponse>;
  printingsvc_GetPrintersRequest?: Maybe<GetPrintersRequest>;
  printingsvc_GetPrintersResponse?: Maybe<GetPrintersResponse>;
  printingsvc_GetQueueRequest?: Maybe<GetQueueRequest>;
  printingsvc_GetQueueResponse?: Maybe<GetQueueResponse>;
  printingsvc_GetSettingsRequest?: Maybe<GetSettingsRequest>;
  printingsvc_GetSettingsResponse?: Maybe<GetSettingsResponse>;
  printingsvc_GetUserIdRequest?: Maybe<GetUserIdRequest>;
  printingsvc_GetUserIdResponse?: Maybe<GetUserIdResponse>;
  printingsvc_Printer?: Maybe<Printer>;
  profilesvc_CreateProfileCommand?: Maybe<CreateProfileCommand>;
  profilesvc_DeleteProfileCommand?: Maybe<DeleteProfileCommand>;
  profilesvc_GetManyProfilesBatchResponse?: Maybe<GetManyProfilesBatchResponse>;
  profilesvc_GetProfileForEmailRequest?: Maybe<GetProfileForEmailRequest>;
  profilesvc_GetProfileRequest?: Maybe<GetProfileRequest>;
  profilesvc_GetProfileResponse?: Maybe<GetProfileResponse>;
  profilesvc_GetProfilesBatchResponse?: Maybe<GetProfilesBatchResponse>;
  profilesvc_GetProfilesListRequest?: Maybe<GetProfilesListRequest>;
  profilesvc_GetProfilesRequest?: Maybe<GetProfilesRequest>;
  profilesvc_GetProfilesResponse?: Maybe<GetProfilesResponse>;
  profilesvc_GetUserIdsWithNoTeamRequest?: Maybe<GetUserIdsWithNoTeamRequest>;
  profilesvc_GetUserIdsWithNoTeamResponse?: Maybe<GetUserIdsWithNoTeamResponse>;
  profilesvc_ManyProfiles?: Maybe<ManyProfiles>;
  profilesvc_Profile?: Maybe<Profile>;
  profilesvc_ProfileAddress?: Maybe<ProfileAddress>;
  profilesvc_ProfileCreated?: Maybe<ProfileCreated>;
  profilesvc_ProfileDeleted?: Maybe<ProfileDeleted>;
  profilesvc_ProfileEdge?: Maybe<ProfileEdge>;
  profilesvc_ProfileObfuscated?: Maybe<ProfileObfuscated>;
  profilesvc_ProfileUpdated?: Maybe<ProfileUpdated>;
  profilesvc_ProfilesConnection?: Maybe<ProfilesConnection>;
  profilesvc_UpdateProfileCommand?: Maybe<UpdateProfileCommand>;
  requestsvc_ArchiveRequestCommand?: Maybe<ArchiveRequestCommand>;
  requestsvc_Assignment?: Maybe<Assignment>;
  requestsvc_AttachTaskToRequestCommand?: Maybe<AttachTaskToRequestCommand>;
  requestsvc_AttachToRequestCommand?: Maybe<AttachToRequestCommand>;
  requestsvc_Category?: Maybe<Category>;
  requestsvc_Comment?: Maybe<Comment>;
  requestsvc_CreateAssignmentCommand?: Maybe<CreateAssignmentCommand>;
  requestsvc_CreateEventCommand?: Maybe<CreateEventCommand>;
  requestsvc_CreateRequestCommand?: Maybe<CreateRequestCommand>;
  requestsvc_DeleteAssignmentCommand?: Maybe<DeleteAssignmentCommand>;
  requestsvc_DeleteEventCommand?: Maybe<DeleteEventCommand>;
  requestsvc_DeleteRequestAttachmentCommand?: Maybe<DeleteRequestAttachmentCommand>;
  requestsvc_DeleteRequestCommand?: Maybe<DeleteRequestCommand>;
  requestsvc_DetachTaskFromRequestCommand?: Maybe<DetachTaskFromRequestCommand>;
  requestsvc_Event?: Maybe<Event>;
  requestsvc_EventCreated?: Maybe<EventCreated>;
  requestsvc_EventDeleted?: Maybe<EventDeleted>;
  requestsvc_GetAssigneeRequest?: Maybe<GetAssigneeRequest>;
  requestsvc_GetAssigneeResponse?: Maybe<GetAssigneeResponse>;
  requestsvc_GetAssignmentsRequest?: Maybe<GetAssignmentsRequest>;
  requestsvc_GetAssignmentsResponse?: Maybe<GetAssignmentsResponse>;
  requestsvc_GetCategoriesRequest?: Maybe<GetCategoriesRequest>;
  requestsvc_GetCategoriesResponse?: Maybe<GetCategoriesResponse>;
  requestsvc_GetEventRequest?: Maybe<GetEventRequest>;
  requestsvc_GetEventResponse?: Maybe<GetEventResponse>;
  requestsvc_GetEventsRequest?: Maybe<GetEventsRequest>;
  requestsvc_GetEventsResponse?: Maybe<GetEventsResponse>;
  requestsvc_GetOrderedPrioritiesResponse?: Maybe<GetOrderedPrioritiesResponse>;
  requestsvc_GetPrioritiesRequest?: Maybe<GetPrioritiesRequest>;
  requestsvc_GetPrioritiesResponse?: Maybe<GetPrioritiesResponse>;
  requestsvc_GetRequestRequest?: Maybe<GetRequestRequest>;
  requestsvc_GetRequestResponse?: Maybe<GetRequestResponse>;
  requestsvc_GetRequestsRequest?: Maybe<GetRequestsRequest>;
  requestsvc_GetRequestsResponse?: Maybe<GetRequestsResponse>;
  requestsvc_Priority?: Maybe<Priority>;
  requestsvc_Request?: Maybe<Request>;
  requestsvc_RequestArchived?: Maybe<RequestArchived>;
  requestsvc_RequestCreated?: Maybe<RequestCreated>;
  requestsvc_RequestDeleted?: Maybe<RequestDeleted>;
  requestsvc_RequestUpdated?: Maybe<RequestUpdated>;
  requestsvc_UpdatePriorityCommand?: Maybe<UpdatePriorityCommand>;
  requestsvc_UpdateRequestCommand?: Maybe<UpdateRequestCommand>;
  roomsvc_BookRoomResponse?: Maybe<BookRoomResponse>;
  roomsvc_Booking?: Maybe<Booking>;
  roomsvc_BookingCancelled?: Maybe<BookingCancelled>;
  roomsvc_BookingConfirmed?: Maybe<BookingConfirmed>;
  roomsvc_BookingEdge?: Maybe<BookingEdge>;
  roomsvc_BookingFailed?: Maybe<BookingFailed>;
  roomsvc_BookingTimeInput?: Maybe<BookingTimeInput>;
  roomsvc_BookingsConnection?: Maybe<BookingsConnection>;
  roomsvc_CancelBookingCommand?: Maybe<CancelBookingCommand>;
  roomsvc_CheckAvailabilityRequest?: Maybe<CheckAvailabilityRequest>;
  roomsvc_CheckAvailabilityResponse?: Maybe<CheckAvailabilityResponse>;
  roomsvc_CreateBookingCommand?: Maybe<CreateBookingCommand>;
  roomsvc_CreateRoomAction?: Maybe<CreateRoomAction>;
  roomsvc_DeleteRoomAction?: Maybe<DeleteRoomAction>;
  roomsvc_GetBookingBatchResponse?: Maybe<GetBookingBatchResponse>;
  roomsvc_GetBookingRequest?: Maybe<GetBookingRequest>;
  roomsvc_GetBookingResponse?: Maybe<GetBookingResponse>;
  roomsvc_GetBookingsBatchResponse?: Maybe<GetBookingsBatchResponse>;
  roomsvc_GetBookingsRequest?: Maybe<GetBookingsRequest>;
  roomsvc_GetBookingsResponse?: Maybe<GetBookingsResponse>;
  roomsvc_GetMyBookingsPaginatedRequest?: Maybe<GetMyBookingsPaginatedRequest>;
  roomsvc_GetMyBookingsRequest?: Maybe<GetMyBookingsRequest>;
  roomsvc_GetMyRoomsRequest?: Maybe<GetMyRoomsRequest>;
  roomsvc_GetRoomAvailabilityRequest?: Maybe<GetRoomAvailabilityRequest>;
  roomsvc_GetRoomAvailabilityResponse?: Maybe<GetRoomAvailabilityResponse>;
  roomsvc_GetRoomRequest?: Maybe<GetRoomRequest>;
  roomsvc_GetRoomsPaginatedRequest?: Maybe<GetRoomsPaginatedRequest>;
  roomsvc_GetRoomsRequest?: Maybe<GetRoomsRequest>;
  roomsvc_GetRoomsResponse?: Maybe<GetRoomsResponse>;
  roomsvc_ISOString?: Maybe<IsoString>;
  roomsvc_Interval?: Maybe<Interval>;
  roomsvc_RecoverRoomAction?: Maybe<RecoverRoomAction>;
  roomsvc_Room?: Maybe<Room>;
  roomsvc_RoomCreated?: Maybe<RoomCreated>;
  roomsvc_RoomDeletedEffect?: Maybe<RoomDeletedEffect>;
  roomsvc_RoomEdge?: Maybe<RoomEdge>;
  roomsvc_RoomMutableData?: Maybe<RoomMutableData>;
  roomsvc_RoomRecoveredEffect?: Maybe<RoomRecoveredEffect>;
  roomsvc_RoomUpdated?: Maybe<RoomUpdated>;
  roomsvc_RoomsConnection?: Maybe<RoomsConnection>;
  roomsvc_UpdateRoomAction?: Maybe<UpdateRoomAction>;
  uploadsvc_DeleteUploadCommand?: Maybe<DeleteUploadCommand>;
  uploadsvc_Dimensions?: Maybe<Dimensions>;
  uploadsvc_GeneratePdfRequest?: Maybe<GeneratePdfRequest>;
  uploadsvc_GeneratePdfRequestSubmitted?: Maybe<GeneratePdfRequestSubmitted>;
  uploadsvc_GetUploadRequest?: Maybe<GetUploadRequest>;
  uploadsvc_GetUploadResponse?: Maybe<GetUploadResponse>;
  uploadsvc_GetUploadsBatchRequest?: Maybe<GetUploadsBatchRequest>;
  uploadsvc_GetUploadsBatchResponse?: Maybe<GetUploadsBatchResponse>;
  uploadsvc_GetUploadsRequest?: Maybe<GetUploadsRequest>;
  uploadsvc_GetUploadsResponse?: Maybe<GetUploadsResponse>;
  uploadsvc_PdfGenerated?: Maybe<PdfGenerated>;
  uploadsvc_UploadDeleted?: Maybe<UploadDeleted>;
  uploadsvc_UploadMessage?: Maybe<UploadMessage>;
  uploadsvc_UploadRequest?: Maybe<UploadRequest>;
  usersvc_AccountRecoveryStarted?: Maybe<AccountRecoveryStarted>;
  usersvc_AddUserToLeadTenantsGroupCommand?: Maybe<AddUserToLeadTenantsGroupCommand>;
  usersvc_AuthenticationFactorSelected?: Maybe<AuthenticationFactorSelected>;
  usersvc_ChangePassword?: Maybe<ChangePassword>;
  usersvc_ChangeUserEmailCommand?: Maybe<ChangeUserEmailCommand>;
  usersvc_ChangeUserPasswordCommand?: Maybe<ChangeUserPasswordCommand>;
  usersvc_CompleteOnboardingCommand?: Maybe<CompleteOnboardingCommand>;
  usersvc_CreateUserCommand?: Maybe<CreateUserCommand>;
  usersvc_DeleteUserCommand?: Maybe<DeleteUserCommand>;
  usersvc_DeleteUsersInCompanies?: Maybe<DeleteUsersInCompanies>;
  usersvc_DeleteUsersInCompany?: Maybe<DeleteUsersInCompany>;
  usersvc_ExchangeTokenRequest?: Maybe<ExchangeTokenRequest>;
  usersvc_GetCompanyUsersRequest?: Maybe<GetCompanyUsersRequest>;
  usersvc_GetCompanyUsersResponse?: Maybe<GetCompanyUsersResponse>;
  usersvc_GetGoogleAccessTokenRequest?: Maybe<GetGoogleAccessTokenRequest>;
  usersvc_GetGoogleAccessTokenResponse?: Maybe<GetGoogleAccessTokenResponse>;
  usersvc_GetNumberOfUsersInCompanyResponse?: Maybe<GetNumberOfUsersInCompanyResponse>;
  usersvc_GetOrderedUsersResponse?: Maybe<GetOrderedUsersResponse>;
  usersvc_GetUserRequest?: Maybe<GetUserRequest>;
  usersvc_GetUsersByCompanyIdResponse?: Maybe<GetUsersByCompanyIdResponse>;
  usersvc_GetUsersByIdResponse?: Maybe<GetUsersByIdResponse>;
  usersvc_GetUsersRequest?: Maybe<GetUsersRequest>;
  usersvc_GetUsersResponse?: Maybe<GetUsersResponse>;
  usersvc_GoogleLoginRequest?: Maybe<GoogleLoginRequest>;
  usersvc_GoogleLoginResponse?: Maybe<GoogleLoginResponse>;
  usersvc_HuddleUsersChased?: Maybe<HuddleUsersChased>;
  usersvc_LogOutFromContextCommand?: Maybe<LogOutFromContextCommand>;
  usersvc_LoggedInAsUser?: Maybe<LoggedInAsUser>;
  usersvc_LoginAsUserCommand?: Maybe<LoginAsUserCommand>;
  usersvc_LoginCommand?: Maybe<LoginCommand>;
  usersvc_LoginRequest?: Maybe<LoginRequest>;
  usersvc_LoginResponse?: Maybe<LoginResponse>;
  usersvc_LoginRevokedForUser?: Maybe<LoginRevokedForUser>;
  usersvc_LogoutUserCommand?: Maybe<LogoutUserCommand>;
  usersvc_OnboadingCompleted?: Maybe<OnboadingCompleted>;
  usersvc_OnboardUserCommand?: Maybe<OnboardUserCommand>;
  usersvc_OnboardUsersCommand?: Maybe<OnboardUsersCommand>;
  usersvc_OnboardingEmailResent?: Maybe<OnboardingEmailResent>;
  usersvc_PasswordChanged?: Maybe<PasswordChanged>;
  usersvc_PasswordReset?: Maybe<PasswordReset>;
  usersvc_PasswordResetTriggered?: Maybe<PasswordResetTriggered>;
  usersvc_PhoneNumberVerified?: Maybe<PhoneNumberVerified>;
  usersvc_RegisterUserForBrokerPlatformCommand?: Maybe<RegisterUserForBrokerPlatformCommand>;
  usersvc_RemoveUserFromLeadTenantsGroupCommand?: Maybe<RemoveUserFromLeadTenantsGroupCommand>;
  usersvc_ResendOnboardingEmailCommand?: Maybe<ResendOnboardingEmailCommand>;
  usersvc_ResendVerificationEmailForBrokerPlatformCommand?: Maybe<ResendVerificationEmailForBrokerPlatformCommand>;
  usersvc_ResetPassword?: Maybe<ResetPassword>;
  usersvc_ResetPasswordCommand?: Maybe<ResetPasswordCommand>;
  usersvc_RevokeLoginForUser?: Maybe<RevokeLoginForUser>;
  usersvc_SendPhoneVerification?: Maybe<SendPhoneVerification>;
  usersvc_SignUpCommand?: Maybe<SignUpCommand>;
  usersvc_StartAccountRecoveryCommand?: Maybe<StartAccountRecoveryCommand>;
  usersvc_UpdateGoogleCredentialsCommand?: Maybe<UpdateGoogleCredentialsCommand>;
  usersvc_User?: Maybe<User>;
  usersvc_UserAddedToLeadTenantsGroup?: Maybe<UserAddedToLeadTenantsGroup>;
  usersvc_UserCreated?: Maybe<UserCreated>;
  usersvc_UserDeleted?: Maybe<UserDeleted>;
  usersvc_UserEmailUpdated?: Maybe<UserEmailUpdated>;
  usersvc_UserFailedToRegisterForBrokerPlatform?: Maybe<UserFailedToRegisterForBrokerPlatform>;
  usersvc_UserLoggedIn?: Maybe<UserLoggedIn>;
  usersvc_UserLoggedOut?: Maybe<UserLoggedOut>;
  usersvc_UserOnboarded?: Maybe<UserOnboarded>;
  usersvc_UserOnboardedFromProfile?: Maybe<UserOnboardedFromProfile>;
  usersvc_UserPasswordChanged?: Maybe<UserPasswordChanged>;
  usersvc_UserRegisteredForBrokerPlatform?: Maybe<UserRegisteredForBrokerPlatform>;
  usersvc_UserRemovedFromLeadTenantsGroup?: Maybe<UserRemovedFromLeadTenantsGroup>;
  usersvc_UserSignedUp?: Maybe<UserSignedUp>;
  usersvc_UserStartedRecovery?: Maybe<UserStartedRecovery>;
  usersvc_UsersDeletedInCompanies?: Maybe<UsersDeletedInCompanies>;
  usersvc_UsersDeletedInCompany?: Maybe<UsersDeletedInCompany>;
  usersvc_UsersOnboarded?: Maybe<UsersOnboarded>;
  usersvc_VerificationEmailResentForBrokerPlatform?: Maybe<VerificationEmailResentForBrokerPlatform>;
  usersvc_VerifyEmailForBrokerPlatformCommand?: Maybe<VerifyEmailForBrokerPlatformCommand>;
  usersvc_VerifyPasswordResetTokenRequest?: Maybe<VerifyPasswordResetTokenRequest>;
  usersvc_VerifyPasswordResetTokenResponse?: Maybe<VerifyPasswordResetTokenResponse>;
  usersvc_VerifyPhoneRequest?: Maybe<VerifyPhoneRequest>;
  usersvc_VerifyPhoneResponse?: Maybe<VerifyPhoneResponse>;
  usersvc_VerifyRegistrationRequest?: Maybe<VerifyRegistrationRequest>;
};


export type SubscriptionAccesssvc_DoorOpenedArgs = {
  accessId: Scalars['String']['input'];
};


export type SubscriptionChatsvc_ChatCreatedArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionChatsvc_ChatMessageCreatedArgs = {
  chatId?: InputMaybe<Scalars['String']['input']>;
  chatType?: InputMaybe<ChatType>;
  tenantOwnerUserId?: InputMaybe<Scalars['String']['input']>;
};

export type SummaryEmailSent = {
  __typename?: 'SummaryEmailSent';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export enum TaskCategory {
  Design = 'Design',
  It = 'It',
  Legal = 'Legal',
  Ops = 'Ops'
}

export type TaskStateInput = {
  hidden: Scalars['Boolean']['input'];
  status?: InputMaybe<MilestoneStatus>;
  taskId: Scalars['String']['input'];
};

export type TeamPayload = {
  __typename?: 'TeamPayload';
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type TeamPayloadInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type TeamsOnDeskSet = {
  __typename?: 'TeamsOnDeskSet';
  deskId: Scalars['String']['output'];
  teamIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type Template = {
  __typename?: 'Template';
  content: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type?: Maybe<TemplateType>;
  updatedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type TemplateArchived = {
  __typename?: 'TemplateArchived';
  template?: Maybe<Template>;
  user?: Maybe<User>;
};

export type TemplateCreated = {
  __typename?: 'TemplateCreated';
  template?: Maybe<Template>;
  user?: Maybe<User>;
};

export enum TemplateType {
  Markdown = 'MARKDOWN'
}

export type TemplateUpdated = {
  __typename?: 'TemplateUpdated';
  template?: Maybe<Template>;
  user?: Maybe<User>;
};

export type TemporaryPinCreated = {
  __typename?: 'TemporaryPinCreated';
  code: Scalars['String']['output'];
  email: Scalars['String']['output'];
  from?: Maybe<Timestamp>;
  to?: Maybe<Timestamp>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type Tenancy = {
  __typename?: 'Tenancy';
  activeOrders?: Maybe<TenancyActiveOrders>;
  appHeader?: Maybe<UploadMessage>;
  appHeaderUploadId: Scalars['String']['output'];
  breakClauses?: Maybe<Array<BreakClause>>;
  chats?: Maybe<TenancyChats>;
  commercialWorkspacePartner?: Maybe<User>;
  commercialsAgreedAt?: Maybe<Date>;
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  createdAt?: Maybe<Timestamp>;
  cwpUserId: Scalars['String']['output'];
  dealId: Scalars['String']['output'];
  declineReason: Scalars['String']['output'];
  deletedAt?: Maybe<Timestamp>;
  displayId: Scalars['String']['output'];
  documentIds: Array<Scalars['String']['output']>;
  documents?: Maybe<Array<Maybe<Document>>>;
  end?: Maybe<Date>;
  endDate?: Maybe<Timestamp>;
  excludeFromReporting: Scalars['Boolean']['output'];
  financialModel?: Maybe<TenancyFinancialModel>;
  floorplanIds: Array<Scalars['String']['output']>;
  floorplans?: Maybe<Array<TenancyFloorplan>>;
  floors?: Maybe<Array<Maybe<UnitFloor>>>;
  googleDriveId: Scalars['String']['output'];
  hasMovedIn?: Maybe<Scalars['Boolean']['output']>;
  headsOfTermsAgreedAt?: Maybe<Date>;
  id: Scalars['String']['output'];
  isKittActingAgent: Scalars['Boolean']['output'];
  leaseAgreedAt?: Maybe<Date>;
  leasingManager?: Maybe<User>;
  location?: Maybe<Location>;
  locationId: Scalars['String']['output'];
  locations: Array<Maybe<Location>>;
  moveInDate?: Maybe<Date>;
  notes: Scalars['String']['output'];
  occupancyAt?: Maybe<Date>;
  onboardingStatus?: Maybe<TenancyOnboardingStatus>;
  renewalType?: Maybe<RenewalType>;
  rollingConditions?: Maybe<Array<RollingCondition>>;
  setupForTenancyAt?: Maybe<Timestamp>;
  start?: Maybe<Date>;
  startDate?: Maybe<Timestamp>;
  status?: Maybe<TenancyStatus>;
  tasks?: Maybe<TenancyTasks>;
  term?: Maybe<Array<Payment>>;
  termsRevised: Scalars['Boolean']['output'];
  timeline?: Maybe<TimelineStages>;
  todos?: Maybe<Array<Maybe<TenancyTodo>>>;
  transactionMemberUserIds: Array<Scalars['String']['output']>;
  transactionMembers?: Maybe<Array<Maybe<User>>>;
  unitIds: Array<Scalars['String']['output']>;
  unitTenancies?: Maybe<UnitTenancies>;
  units: Array<Maybe<Unit>>;
  versionedDocuments?: Maybe<Array<Maybe<VersionedDocument>>>;
  welcomeMessageSent: Scalars['Boolean']['output'];
  welcomePackUrl: Scalars['String']['output'];
};


export type TenancyDocumentsArgs = {
  documentTypeMetaDataKey?: InputMaybe<Scalars['String']['input']>;
  documentTypeMetaDataValue?: InputMaybe<Scalars['String']['input']>;
};


export type TenancyTodosArgs = {
  category?: InputMaybe<TaskCategory>;
};


export type TenancyUnitTenanciesArgs = {
  locationIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type TenancyActiveOrders = {
  __typename?: 'TenancyActiveOrders';
  orders?: Maybe<Array<Maybe<Order>>>;
};

export type TenancyChat = {
  __typename?: 'TenancyChat';
  category?: Maybe<TaskCategory>;
  chat?: Maybe<Chat>;
  chatId: Scalars['String']['output'];
  hidden: Scalars['Boolean']['output'];
};

export type TenancyChats = {
  __typename?: 'TenancyChats';
  chats?: Maybe<Array<TenancyChat>>;
  unreadMessageCount?: Maybe<Scalars['Int']['output']>;
};

export type TenancyCreated = {
  __typename?: 'TenancyCreated';
  newOffer: Scalars['Boolean']['output'];
  tenancy?: Maybe<Tenancy>;
};

export type TenancyDeleted = {
  __typename?: 'TenancyDeleted';
  id: Scalars['String']['output'];
  tenancy?: Maybe<Tenancy>;
};

export type TenancyDocumentDeleted = {
  __typename?: 'TenancyDocumentDeleted';
  documentId: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type TenancyFinancialModel = {
  __typename?: 'TenancyFinancialModel';
  enterpriseContract: Scalars['Boolean']['output'];
  fitoutBudget?: Maybe<Money>;
  fitoutBudgetDocument?: Maybe<Document>;
  fitoutBudgetDocumentId: Scalars['String']['output'];
  managementFee?: Maybe<Money>;
};

export type TenancyFinancialModelMutationInput = {
  enterpriseContract?: InputMaybe<Scalars['Boolean']['input']>;
  fitoutBudget?: InputMaybe<MoneyInput>;
  fitoutBudgetDocumentId?: InputMaybe<Scalars['String']['input']>;
  managementFee?: InputMaybe<MoneyInput>;
};

export type TenancyFloorplan = {
  __typename?: 'TenancyFloorplan';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
  upload?: Maybe<UploadMessage>;
  uploadId: Scalars['String']['output'];
  zones?: Maybe<TenancyFloorplanZones>;
};

export type TenancyFloorplanInput = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  tenancyId: Scalars['String']['input'];
  uploadId: Scalars['String']['input'];
};

export type TenancyFloorplanZone = {
  __typename?: 'TenancyFloorplanZone';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  radius: Scalars['Int']['output'];
  tenancyFloorplanId: Scalars['String']['output'];
  x: Scalars['Int']['output'];
  y: Scalars['Int']['output'];
};

export type TenancyFloorplanZoneCreated = {
  __typename?: 'TenancyFloorplanZoneCreated';
  zone?: Maybe<TenancyFloorplanZone>;
};

export type TenancyFloorplanZoneDeleted = {
  __typename?: 'TenancyFloorplanZoneDeleted';
  id: Scalars['String']['output'];
};

export type TenancyFloorplanZoneUpdated = {
  __typename?: 'TenancyFloorplanZoneUpdated';
  zone?: Maybe<TenancyFloorplanZone>;
};

export type TenancyFloorplanZones = {
  __typename?: 'TenancyFloorplanZones';
  zones?: Maybe<Array<TenancyFloorplanZone>>;
};

export type TenancyGoogleDriveSet = {
  __typename?: 'TenancyGoogleDriveSet';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type TenancyMoveInCategoryVisibilityToggled = {
  __typename?: 'TenancyMoveInCategoryVisibilityToggled';
  categories?: Maybe<Array<TaskCategory>>;
  tenancyId: Scalars['String']['output'];
};

export type TenancyMoveInDateUpdated = {
  __typename?: 'TenancyMoveInDateUpdated';
  tenancy?: Maybe<Tenancy>;
};

export enum TenancyOnboardingStatus {
  MovedIn = 'MOVED_IN',
  OfferStage = 'OFFER_STAGE',
  Onboarding = 'ONBOARDING'
}

export enum TenancyStatus {
  Activated = 'ACTIVATED',
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED',
  Terminated = 'TERMINATED'
}

export type TenancyStatusValueInput = {
  status?: InputMaybe<TenancyStatus>;
};

export type TenancyTask = {
  __typename?: 'TenancyTask';
  category?: Maybe<TaskCategory>;
  completedAt?: Maybe<Timestamp>;
  completedTaskMessage: Scalars['String']['output'];
  hidden: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  status?: Maybe<MilestoneStatus>;
  timelineStageId: Scalars['String']['output'];
};

export type TenancyTaskStatusDataInput = {
  tasks?: InputMaybe<Array<TaskStateInput>>;
};

export type TenancyTasks = {
  __typename?: 'TenancyTasks';
  tasks?: Maybe<Array<TenancyTask>>;
};

export type TenancyTasksUpdated = {
  __typename?: 'TenancyTasksUpdated';
  activeTimelineStage?: Maybe<TimelineStage>;
  completedById: Scalars['String']['output'];
  inactiveTimelineStages: Array<Scalars['String']['output']>;
  newlyCompletedTimelineStage: Scalars['String']['output'];
  nextStepText: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type TenancyTodo = {
  __typename?: 'TenancyTodo';
  assigneeCompany?: Maybe<Company>;
  assigneeCompanyId: Scalars['String']['output'];
  category?: Maybe<TaskCategory>;
  completedAt?: Maybe<Timestamp>;
  completedBy: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description: Scalars['String']['output'];
  dueDate?: Maybe<Timestamp>;
  floorplanZoneId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  requiresApproval: Scalars['Boolean']['output'];
  startedAt?: Maybe<Timestamp>;
  startedBy: Scalars['String']['output'];
  status?: Maybe<MilestoneStatus>;
  tenancyId: Scalars['String']['output'];
  title: Scalars['String']['output'];
  uncompletedBy?: Maybe<Scalars['String']['output']>;
  uploadIds: Array<Scalars['String']['output']>;
  uploads?: Maybe<Array<Maybe<UploadMessage>>>;
};

export type TenancyTodoChangesRequested = {
  __typename?: 'TenancyTodoChangesRequested';
  id: Scalars['String']['output'];
  parentMessageId: Scalars['String']['output'];
  text: Scalars['String']['output'];
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoCompleted = {
  __typename?: 'TenancyTodoCompleted';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoCreated = {
  __typename?: 'TenancyTodoCreated';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoDeleted = {
  __typename?: 'TenancyTodoDeleted';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type TenancyTodoEdge = {
  __typename?: 'TenancyTodoEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<TenancyTodo>;
};

export type TenancyTodoStarted = {
  __typename?: 'TenancyTodoStarted';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoUncompleted = {
  __typename?: 'TenancyTodoUncompleted';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoUnstarted = {
  __typename?: 'TenancyTodoUnstarted';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodoUpdated = {
  __typename?: 'TenancyTodoUpdated';
  todo?: Maybe<TenancyTodo>;
};

export type TenancyTodosConnection = {
  __typename?: 'TenancyTodosConnection';
  edges?: Maybe<Array<TenancyTodoEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type TenancyUpdated = {
  __typename?: 'TenancyUpdated';
  statusChange?: Maybe<StatusChange>;
  tenancy?: Maybe<Tenancy>;
};

export type TenancyWelcomePackSet = {
  __typename?: 'TenancyWelcomePackSet';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export enum TenantAppFeature {
  TenantAppFeatureSplashIntro = 'TenantAppFeatureSplashIntro',
  TenantAppFeatureUnknown = 'TenantAppFeatureUnknown',
  TenantAppFeatureWelcomePack = 'TenantAppFeatureWelcomePack'
}

export type TenantAppFeedbackSubmission = {
  __typename?: 'TenantAppFeedbackSubmission';
  feedback: Scalars['String']['output'];
  score: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type TenantCompany = {
  __typename?: 'TenantCompany';
  accessCode?: Maybe<Scalars['String']['output']>;
  accountManagerUserId?: Maybe<Scalars['String']['output']>;
  clientServicesManagerUserId?: Maybe<Scalars['String']['output']>;
  clientSupportSpecialistUserId?: Maybe<Scalars['String']['output']>;
  companiesHouseBetaLink?: Maybe<Scalars['String']['output']>;
  companySize?: Maybe<Scalars['String']['output']>;
  currentWorkspaceStatusId?: Maybe<Scalars['String']['output']>;
  handbookId?: Maybe<Scalars['String']['output']>;
  industry?: Maybe<Industry>;
  international?: Maybe<Scalars['Boolean']['output']>;
  leaseExpiry?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<TenantPriority>;
  servicedOfficeProvider?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  website?: Maybe<Scalars['String']['output']>;
  whiteLabelLogoUploadId?: Maybe<Scalars['String']['output']>;
  workspaceSize?: Maybe<Scalars['String']['output']>;
  workspaceStatus?: Maybe<WorkspaceStatus>;
  yearFounded?: Maybe<Scalars['String']['output']>;
};

export type TenantCompanyInput = {
  accessCode?: InputMaybe<Scalars['String']['input']>;
  accountManagerUserId?: InputMaybe<Scalars['String']['input']>;
  clientServicesManagerUserId?: InputMaybe<Scalars['String']['input']>;
  clientSupportSpecialistUserId?: InputMaybe<Scalars['String']['input']>;
  companiesHouseBetaLink?: InputMaybe<Scalars['String']['input']>;
  companySize?: InputMaybe<Scalars['String']['input']>;
  currentWorkspaceStatusId?: InputMaybe<Scalars['String']['input']>;
  handbookId?: InputMaybe<Scalars['String']['input']>;
  industry?: InputMaybe<IndustryInput>;
  international?: InputMaybe<Scalars['Boolean']['input']>;
  leaseExpiry?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<TenantPriorityInput>;
  servicedOfficeProvider?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
  whiteLabelLogoUploadId?: InputMaybe<Scalars['String']['input']>;
  workspaceSize?: InputMaybe<Scalars['String']['input']>;
  workspaceStatus?: InputMaybe<WorkspaceStatusInput>;
  yearFounded?: InputMaybe<Scalars['String']['input']>;
};

export type TenantPriority = {
  __typename?: 'TenantPriority';
  colourHex?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  priorityName?: Maybe<Scalars['String']['output']>;
  rank?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type TenantPriorityInput = {
  colourHex?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  priorityName?: InputMaybe<Scalars['String']['input']>;
  rank?: InputMaybe<Scalars['Int']['input']>;
};

export type Thread = {
  __typename?: 'Thread';
  id: Scalars['String']['output'];
  messages?: Maybe<Array<Message>>;
};

export type ThreadGetMessagesResponse = {
  __typename?: 'ThreadGetMessagesResponse';
  messageList?: Maybe<Array<Message>>;
};

export type ThreadsGetThreadResponse = {
  __typename?: 'ThreadsGetThreadResponse';
  thread?: Maybe<Thread>;
};

export type TierInputs = {
  __typename?: 'TierInputs';
  fitoutTier?: Maybe<FitoutTier>;
  opsTier?: Maybe<OpsTier>;
  user?: Maybe<User>;
};

export type TierInputsInput = {
  fitoutTier?: InputMaybe<FitoutTier>;
  opsTier?: InputMaybe<OpsTier>;
};

export type TimelineStage = {
  __typename?: 'TimelineStage';
  completedAt?: Maybe<Timestamp>;
  estimatedCompletionDate?: Maybe<Timestamp>;
  id: Scalars['String']['output'];
  inProgressTooltip: Scalars['String']['output'];
  name: Scalars['String']['output'];
  nextStepText: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  startedAt?: Maybe<Timestamp>;
  status?: Maybe<MilestoneStatus>;
  tooltipText: Scalars['String']['output'];
};

export type TimelineStageCompletionDateInput = {
  completionDate?: InputMaybe<DateInput>;
  stageId: Scalars['String']['input'];
};

export type TimelineStageCompletionDateUpdated = {
  __typename?: 'TimelineStageCompletionDateUpdated';
  _null?: Maybe<Scalars['Boolean']['output']>;
};

export type TimelineStageCount = {
  __typename?: 'TimelineStageCount';
  count: Scalars['Int']['output'];
  stageId: Scalars['String']['output'];
};

export type TimelineStages = {
  __typename?: 'TimelineStages';
  stages?: Maybe<Array<TimelineStage>>;
};

export type TimelineStateUpdated = {
  __typename?: 'TimelineStateUpdated';
  estimatedCompletionDate?: Maybe<Date>;
  stageId: Scalars['String']['output'];
  tenancyId: Scalars['String']['output'];
};

export type Timestamp = {
  __typename?: 'Timestamp';
  ISOString?: Maybe<Scalars['String']['output']>;
  /**
   * https://golang.org/pkg/time/#Time.Format Use Format() from Go's time package
   * to format dates and times easily using the reference time "Mon Jan 2 15:04:05
   * -0700 MST 2006" (https://gotime.agardner.me/)
   */
  format?: Maybe<Scalars['String']['output']>;
  /** Milliseconds since epoch (useful in JS) as a string value. Go graphql does not support int64 */
  msSinceEpoch?: Maybe<Scalars['String']['output']>;
  unix?: Maybe<Scalars['Int']['output']>;
};


export type TimestampFormatArgs = {
  layout?: InputMaybe<Scalars['String']['input']>;
};

export type TimestampInput = {
  ISOString?: InputMaybe<Scalars['String']['input']>;
};

export type TodaysGuestsNotification = {
  __typename?: 'TodaysGuestsNotification';
  guests?: Maybe<Array<Guest>>;
  user?: Maybe<User>;
};

export type TrainLine = {
  __typename?: 'TrainLine';
  id: Scalars['String']['output'];
  mode?: Maybe<LineMode>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type TransactionMemberCreated = {
  __typename?: 'TransactionMemberCreated';
  tenancyId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type TransactionMemberDeleted = {
  __typename?: 'TransactionMemberDeleted';
  tenancyId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type TwilioNumberDeleted = {
  __typename?: 'TwilioNumberDeleted';
  accessId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export enum Type {
  Email = 'EMAIL'
}

export type UnarchiveLocationCommand = {
  __typename?: 'UnarchiveLocationCommand';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type Unit = {
  __typename?: 'Unit';
  accessContact?: Maybe<Contact>;
  accessInstructions: Scalars['String']['output'];
  accessNoticeHours: Scalars['Int']['output'];
  appUrl?: Maybe<Scalars['String']['output']>;
  archived: Scalars['Boolean']['output'];
  area?: Maybe<GetBoundaryListResponse>;
  availabilityStatus?: Maybe<OptionalUnitAvailabilityStatus>;
  availableFrom?: Maybe<Timestamp>;
  buildingUnit?: Maybe<BuildingUnit>;
  combinationDetails?: Maybe<CombinationDetails>;
  desks: Scalars['Int']['output'];
  displayId: Scalars['String']['output'];
  financialModel?: Maybe<UnitFinancialModel>;
  firstViewingActivities?: Maybe<Array<Maybe<Activity>>>;
  floor: Scalars['String']['output'];
  floorNumbers: Array<Scalars['Float']['output']>;
  /** @deprecated Use floorplans */
  floorplan?: Maybe<UploadMessage>;
  floorplanUploadId: Scalars['String']['output'];
  floorplanUploadIds: Array<Scalars['String']['output']>;
  floorplans?: Maybe<Array<Maybe<UploadMessage>>>;
  floors?: Maybe<Array<UnitFloor>>;
  id: Scalars['String']['output'];
  kittTemplateBrochure?: Maybe<GetKittTemplateForEntityGroupResponse>;
  landlordCoversFitout?: Maybe<Scalars['Boolean']['output']>;
  location: Location;
  locationId: Scalars['String']['output'];
  minAvailableFrom?: Maybe<Timestamp>;
  minimumTermMonths: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  outOfHoursAccess: Scalars['String']['output'];
  pricing?: Maybe<GetPricingResponse>;
  primaryAccessMethod: Scalars['String']['output'];
  sqFt: Scalars['Int']['output'];
  surveyPhotos?: Maybe<Array<Maybe<UploadMessage>>>;
  surveyPhotosUploadIds: Array<Scalars['String']['output']>;
  templateBrochure?: Maybe<Brochure>;
  templateBrochureId?: Maybe<Scalars['String']['output']>;
  threeDimensionalModelUrl: Scalars['String']['output'];
  timeToDeliverDays: Scalars['Int']['output'];
  totalRentFreeMonths: Scalars['Float']['output'];
  unitGroupDetails?: Maybe<GetDetailsForUnitsResponse>;
  unitGroupId?: Maybe<Scalars['String']['output']>;
};


export type UnitAreaArgs = {
  level?: InputMaybe<Scalars['Int']['input']>;
};


export type UnitFloorplansArgs = {
  height?: InputMaybe<Scalars['Int']['input']>;
  quality?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};


export type UnitPricingArgs = {
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};


export type UnitSurveyPhotosArgs = {
  height?: InputMaybe<Scalars['Int']['input']>;
  quality?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};


export type UnitUnitGroupDetailsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type UnitArchived = {
  __typename?: 'UnitArchived';
  unit?: Maybe<Unit>;
};

export enum UnitAvailabilityStatus {
  Available = 'AVAILABLE',
  ComingAvailable = 'COMING_AVAILABLE',
  LetAgreed = 'LET_AGREED',
  NotAvailable = 'NOT_AVAILABLE',
  UnderOffer = 'UNDER_OFFER',
  Unknown = 'UNKNOWN'
}

export type UnitAvailabilityStatusOptional = {
  __typename?: 'UnitAvailabilityStatusOptional';
  status?: Maybe<UnitAvailabilityStatus>;
  user?: Maybe<User>;
};

export type UnitAvailabilityStatusOptionalInput = {
  status?: InputMaybe<UnitAvailabilityStatus>;
};

export type UnitCombinationResult = {
  __typename?: 'UnitCombinationResult';
  selection?: Maybe<Selection>;
  unitIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UnitDeleted = {
  __typename?: 'UnitDeleted';
  unit?: Maybe<Unit>;
};

export type UnitFilters = {
  __typename?: 'UnitFilters';
  excludedUnitIds?: Maybe<Array<Scalars['String']['output']>>;
  includeGround?: Maybe<Scalars['Boolean']['output']>;
  includeUnderground?: Maybe<Scalars['Boolean']['output']>;
  sqft?: Maybe<Int32OptionalRange>;
  user?: Maybe<User>;
};

export type UnitFiltersInput = {
  excludedUnitIds?: InputMaybe<Array<Scalars['String']['input']>>;
  includeGround?: InputMaybe<Scalars['Boolean']['input']>;
  includeUnderground?: InputMaybe<Scalars['Boolean']['input']>;
  sqft?: InputMaybe<Int32OptionalRangeInput>;
};

export type UnitFinancialModel = {
  __typename?: 'UnitFinancialModel';
  advertisedPrice?: Maybe<Money>;
  brokerPayee?: Maybe<BrokerPayee>;
  businessRates?: Maybe<Money>;
  fitoutState?: Maybe<Unitsvc_UnitFitoutState>;
  greySpace?: Maybe<GreySpace>;
  netRent?: Maybe<Money>;
  occupierContract?: Maybe<OccupierContract>;
  rateableValue?: Maybe<Money>;
  ratesLink: Scalars['String']['output'];
  stateOfMAndE: Scalars['String']['output'];
  unitId: Scalars['String']['output'];
};

export enum UnitFitoutState {
  CategoryA = 'CATEGORY_A',
  FullyFitted = 'FULLY_FITTED',
  PartiallyFitted = 'PARTIALLY_FITTED',
  UnknownFitout = 'UNKNOWN_FITOUT'
}

export type UnitFitoutStateOptional = {
  __typename?: 'UnitFitoutStateOptional';
  state?: Maybe<UnitFitoutState>;
  user?: Maybe<User>;
};

export type UnitFitoutStateOptionalInput = {
  state?: InputMaybe<UnitFitoutState>;
};

export type UnitFloor = {
  __typename?: 'UnitFloor';
  floorNumber: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  unitId: Scalars['String']['output'];
};

export type UnitFloorNumberRowsCreated = {
  __typename?: 'UnitFloorNumberRowsCreated';
  count: Scalars['Int']['output'];
};

export type UnitOfMeasure = {
  __typename?: 'UnitOfMeasure';
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isUnary: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type UnitPaginationInput = {
  page: Scalars['Int']['input'];
  perPage: Scalars['Int']['input'];
};

export enum UnitSortBy {
  ArchivedAt = 'ARCHIVED_AT',
  AvailableFrom = 'AVAILABLE_FROM',
  CreatedAt = 'CREATED_AT',
  Desks = 'DESKS',
  Floor = 'FLOOR',
  Location = 'LOCATION',
  MinimumTerm = 'MINIMUM_TERM',
  Name = 'NAME',
  Postcode = 'POSTCODE',
  Price = 'PRICE',
  PricePerDesk = 'PRICE_PER_DESK',
  Sqft = 'SQFT'
}

export type UnitTenancies = {
  __typename?: 'UnitTenancies';
  activeTenancy?: Maybe<Tenancy>;
  nextAvailable?: Maybe<Timestamp>;
  tenancies?: Maybe<Array<Tenancy>>;
  unitId: Scalars['String']['output'];
};

export enum UnitType {
  Accepted = 'ACCEPTED',
  MoveIn = 'MOVE_IN',
  Occupied = 'OCCUPIED',
  Offer = 'OFFER',
  OffMarketType = 'OFF_MARKET_TYPE',
  OnMarketType = 'ON_MARKET_TYPE',
  Renewal = 'RENEWAL'
}

export type UnitTypeValueInput = {
  value?: InputMaybe<UnitType>;
};

export type UnitUnarchived = {
  __typename?: 'UnitUnarchived';
  unit?: Maybe<Unit>;
};

export type UnitsByLocation = {
  __typename?: 'UnitsByLocation';
  results?: Maybe<Array<Unit>>;
};

export enum Unitsvc_UnitFitoutState {
  CategoryA = 'CATEGORY_A',
  FullyFitted = 'FULLY_FITTED',
  PartiallyFitted = 'PARTIALLY_FITTED',
  UnknownFitout = 'UNKNOWN_FITOUT'
}

export type UnlockLocationForVerificationCommand = {
  __typename?: 'UnlockLocationForVerificationCommand';
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateAccessCommand = {
  __typename?: 'UpdateAccessCommand';
  access?: Maybe<Access>;
  user?: Maybe<User>;
};

export type UpdateAccessNameCommand = {
  __typename?: 'UpdateAccessNameCommand';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateActivityCommand = {
  __typename?: 'UpdateActivityCommand';
  activity?: Maybe<Activity>;
  completed?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type UpdateAgenciesForLocationCommand = {
  __typename?: 'UpdateAgenciesForLocationCommand';
  agencyCompanyIds: Array<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateBrochureCommand = {
  __typename?: 'UpdateBrochureCommand';
  entities?: Maybe<Array<BrochureEntity>>;
  id: Scalars['String']['output'];
  stateJson?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UpdateBrokerSearchCommand = {
  __typename?: 'UpdateBrokerSearchCommand';
  clientName?: Maybe<Scalars['String']['output']>;
  desiredLocation?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  kittChoicesOnly?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  requirements?: Maybe<DealRequirements>;
  user?: Maybe<User>;
};

export type UpdateBrokerSearchPolygonCommand = {
  __typename?: 'UpdateBrokerSearchPolygonCommand';
  brokerSearchId: Scalars['String']['output'];
  polygonArray?: Maybe<Array<Coordinate>>;
  user?: Maybe<User>;
};

export type UpdateChatMessage = {
  __typename?: 'UpdateChatMessage';
  newMessageId: Scalars['String']['output'];
  oldMessageId: Scalars['String']['output'];
  updatedMessage?: Maybe<CreateChatMessageCommand>;
  user?: Maybe<User>;
};

export type UpdateCompanyCommand = {
  __typename?: 'UpdateCompanyCommand';
  accountManagerUserId?: Maybe<Scalars['String']['output']>;
  address?: Maybe<Scalars['String']['output']>;
  clientServicesManagerUserId?: Maybe<Scalars['String']['output']>;
  clientSupportSpecialistUserId?: Maybe<Scalars['String']['output']>;
  companyNumber?: Maybe<Scalars['String']['output']>;
  contractorCompany?: Maybe<ContractorCompany>;
  id: Scalars['String']['output'];
  landlordFinancials?: Maybe<LandlordFinancials>;
  logoUploadId?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  primaryColorHex?: Maybe<Scalars['String']['output']>;
  researchNotes?: Maybe<Scalars['String']['output']>;
  secondaryColorHex?: Maybe<Scalars['String']['output']>;
  tenantCompany?: Maybe<TenantCompany>;
  type?: Maybe<OptionalCompanyType>;
  user?: Maybe<User>;
};

export type UpdateCompanyCommandInput = {
  accountManagerUserId?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<Scalars['String']['input']>;
  clientServicesManagerUserId?: InputMaybe<Scalars['String']['input']>;
  clientSupportSpecialistUserId?: InputMaybe<Scalars['String']['input']>;
  companyNumber?: InputMaybe<Scalars['String']['input']>;
  contractorCompany?: InputMaybe<ContractorCompanyInput>;
  id: Scalars['String']['input'];
  landlordFinancials?: InputMaybe<LandlordFinancialsInput>;
  logoUploadId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryColorHex?: InputMaybe<Scalars['String']['input']>;
  researchNotes?: InputMaybe<Scalars['String']['input']>;
  secondaryColorHex?: InputMaybe<Scalars['String']['input']>;
  tenantCompany?: InputMaybe<TenantCompanyInput>;
  type?: InputMaybe<OptionalCompanyTypeInput>;
};

export type UpdateCompanyTeamCommand = {
  __typename?: 'UpdateCompanyTeamCommand';
  companyTeam?: Maybe<CompanyTeam>;
  user?: Maybe<User>;
};

export type UpdateDealCommand = {
  __typename?: 'UpdateDealCommand';
  deal?: Maybe<Deal>;
  note?: Maybe<Note>;
  user?: Maybe<User>;
};

export type UpdateDealSpaceMatchCommand = {
  __typename?: 'UpdateDealSpaceMatchCommand';
  id: Scalars['String']['output'];
  orderIndex?: Maybe<Scalars['String']['output']>;
  salesBlurb?: Maybe<Scalars['String']['output']>;
  starred?: Maybe<Scalars['Boolean']['output']>;
  user?: Maybe<User>;
};

export type UpdateDesk = {
  __typename?: 'UpdateDesk';
  amenityIds: Array<Scalars['String']['output']>;
  floorplanId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateFloorplan = {
  __typename?: 'UpdateFloorplan';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateFloorplanZone = {
  __typename?: 'UpdateFloorplanZone';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateGoogleCredentialsCommand = {
  __typename?: 'UpdateGoogleCredentialsCommand';
  accessToken: Scalars['String']['output'];
  emailAddress: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
  tokenJson: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateLocationNameCommand = {
  __typename?: 'UpdateLocationNameCommand';
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateLocationStatusesCommand = {
  __typename?: 'UpdateLocationStatusesCommand';
  id?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UpdateNetworkConfigCommand = {
  __typename?: 'UpdateNetworkConfigCommand';
  access?: Maybe<Access>;
  user?: Maybe<User>;
};

export type UpdateNoteOnDealCommand = {
  __typename?: 'UpdateNoteOnDealCommand';
  note?: Maybe<Note>;
  user?: Maybe<User>;
};

export type UpdateOwnCompany = {
  __typename?: 'UpdateOwnCompany';
  id: Scalars['String']['output'];
  logoUploadId?: Maybe<Scalars['String']['output']>;
  primaryColorHex?: Maybe<Scalars['String']['output']>;
  secondaryColorHex?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UpdatePriorityCommand = {
  __typename?: 'UpdatePriorityCommand';
  name: Scalars['String']['output'];
  sla: Scalars['Int']['output'];
  user?: Maybe<User>;
};

export type UpdateProfileCommand = {
  __typename?: 'UpdateProfileCommand';
  addresses?: Maybe<Array<ProfileAddress>>;
  birthday?: Maybe<Date>;
  companyId?: Maybe<Scalars['String']['output']>;
  companyTeamId?: Maybe<Scalars['String']['output']>;
  emails?: Maybe<Array<Scalars['String']['output']>>;
  hideBirthday?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['String']['output'];
  img?: Maybe<Scalars['String']['output']>;
  jobTitle?: Maybe<Scalars['String']['output']>;
  linkedInUrl?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  phoneNumbers?: Maybe<Array<Scalars['String']['output']>>;
  profilePhotoUploadId?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type UpdateRequestCommand = {
  __typename?: 'UpdateRequestCommand';
  assigneeId: Scalars['String']['output'];
  categoryId: Scalars['String']['output'];
  chatIds: Array<Scalars['String']['output']>;
  contractor: Scalars['String']['output'];
  cost: Scalars['String']['output'];
  details: Scalars['String']['output'];
  dueDate: Scalars['String']['output'];
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  priority: Scalars['String']['output'];
  status: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  techRequest?: Maybe<Scalars['Boolean']['output']>;
  unitId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UpdateRoom = {
  __typename?: 'UpdateRoom';
  amenityIds: Array<Scalars['String']['output']>;
  capacity: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price: Scalars['String']['output'];
  shared: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type UpdateRoomAction = {
  __typename?: 'UpdateRoomAction';
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  imageUploadId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  numberOfPeople: Scalars['Int']['output'];
  timezone: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateSelectionsCommand = {
  __typename?: 'UpdateSelectionsCommand';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  selections?: Maybe<Array<Selection>>;
  shortlistId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UpdateShortlistCommand = {
  __typename?: 'UpdateShortlistCommand';
  clientName?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  shortlistId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UpdateSourcedLocationCommand = {
  __typename?: 'UpdateSourcedLocationCommand';
  accessNotes?: Maybe<Scalars['String']['output']>;
  agentProfileIds?: Maybe<Array<Scalars['String']['output']>>;
  agentSetUp?: Maybe<AgentSetUpOptional>;
  buildingInsuranceRenewalDate?: Maybe<Timestamp>;
  displayOnWebsite?: Maybe<Scalars['Boolean']['output']>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  googleDriveFileLink?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isKittChoice?: Maybe<Scalars['Boolean']['output']>;
  isRiskWarning?: Maybe<Scalars['Boolean']['output']>;
  landlordCoversEntireFitout?: Maybe<Scalars['Boolean']['output']>;
  landlordProfileId?: Maybe<Scalars['String']['output']>;
  locationAgencies?: Maybe<Array<LocationAgency>>;
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  primaryAccessMethod?: Maybe<Scalars['String']['output']>;
  primaryAccessMethodType?: Maybe<AccessMethodOptional>;
  sellingPointIds?: Maybe<Array<Scalars['String']['output']>>;
  serviceChargeYearEnd?: Maybe<Timestamp>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  utilitiesRechargedFromLandlord?: Maybe<Scalars['Boolean']['output']>;
  virtualTourLinks?: Maybe<Array<Scalars['String']['output']>>;
};

export type UpdateTemplateCommand = {
  __typename?: 'UpdateTemplateCommand';
  content: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type?: Maybe<TemplateType>;
  user?: Maybe<User>;
};

export type UploadAttachedToIssue = {
  __typename?: 'UploadAttachedToIssue';
  issue?: Maybe<Issue>;
  issueId: Scalars['String']['output'];
  uploadId: Scalars['String']['output'];
};

export type UploadDeleted = {
  __typename?: 'UploadDeleted';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UploadMessage = {
  __typename?: 'UploadMessage';
  fileExtension: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  src: Scalars['String']['output'];
  uploadedAt?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type UploadRequest = {
  __typename?: 'UploadRequest';
  data: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  ttl?: Maybe<Timestamp>;
  user?: Maybe<User>;
};

export type User = {
  __typename?: 'User';
  CompanyId: Scalars['String']['output'];
  Email: Scalars['String']['output'];
  GoogleAccessToken: Scalars['String']['output'];
  Id: Scalars['String']['output'];
  IsVerified: Scalars['Boolean']['output'];
  OnboardedAt?: Maybe<Timestamp>;
  VerificationToken: Scalars['String']['output'];
  canEditMatches?: Maybe<Scalars['Boolean']['output']>;
  company?: Maybe<Company>;
  createdAt?: Maybe<Timestamp>;
  createdBy: Scalars['String']['output'];
  hasAccessPermissions?: Maybe<Scalars['Boolean']['output']>;
  hasUnreadNotifications?: Maybe<Scalars['Boolean']['output']>;
  isKitt?: Maybe<Scalars['Boolean']['output']>;
  isLeadTenant?: Maybe<Scalars['Boolean']['output']>;
  loginRevokedAt?: Maybe<Timestamp>;
  myBrokerHuddles?: Maybe<Array<Maybe<Tenancy>>>;
  onboardLink?: Maybe<Scalars['String']['output']>;
  permissions?: Maybe<Array<Maybe<Permission>>>;
  profile?: Maybe<Profile>;
  user?: Maybe<User>;
};

export type UserAddedToLeadTenantsGroup = {
  __typename?: 'UserAddedToLeadTenantsGroup';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserAssignedToDesk = {
  __typename?: 'UserAssignedToDesk';
  deskId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserCreated = {
  __typename?: 'UserCreated';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserDeleted = {
  __typename?: 'UserDeleted';
  UserId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserEmailUpdated = {
  __typename?: 'UserEmailUpdated';
  email: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserFailedToRegisterForBrokerPlatform = {
  __typename?: 'UserFailedToRegisterForBrokerPlatform';
  email: Scalars['String']['output'];
  failureReason?: Maybe<BrokerPlatformRegistrationFailureReason>;
  name: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserIdList = {
  __typename?: 'UserIdList';
  id: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UserLoggedIn = {
  __typename?: 'UserLoggedIn';
  id: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserLoggedOut = {
  __typename?: 'UserLoggedOut';
  cookie: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserNotifiedAboutTenancy = {
  __typename?: 'UserNotifiedAboutTenancy';
  tenancyId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserOnboarded = {
  __typename?: 'UserOnboarded';
  companyId: Scalars['String']['output'];
  dealId: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  onboardBrokerToHuddle: Scalars['Boolean']['output'];
  onboardThroughApp: Scalars['Boolean']['output'];
  onboardToBrokerPlatform: Scalars['Boolean']['output'];
  onboardToHuddle: Scalars['Boolean']['output'];
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserOnboardedFromProfile = {
  __typename?: 'UserOnboardedFromProfile';
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserPasswordChanged = {
  __typename?: 'UserPasswordChanged';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserPushTokenDeleted = {
  __typename?: 'UserPushTokenDeleted';
  deviceId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserPushTokenSaved = {
  __typename?: 'UserPushTokenSaved';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserRegisteredForBrokerPlatform = {
  __typename?: 'UserRegisteredForBrokerPlatform';
  companyId: Scalars['String']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  profileId: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
  verificationToken: Scalars['String']['output'];
};

export type UserRemovedFromLeadTenantsGroup = {
  __typename?: 'UserRemovedFromLeadTenantsGroup';
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type UserSignedUp = {
  __typename?: 'UserSignedUp';
  id: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UserStartedRecovery = {
  __typename?: 'UserStartedRecovery';
  email: Scalars['String']['output'];
  inAppRecovery: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UsersDeletedInCompanies = {
  __typename?: 'UsersDeletedInCompanies';
  companyIds: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type UsersDeletedInCompany = {
  __typename?: 'UsersDeletedInCompany';
  companyId: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type UsersOnboarded = {
  __typename?: 'UsersOnboarded';
  user?: Maybe<User>;
  userIds: Array<Scalars['String']['output']>;
};

export type VerificationEmailResentForBrokerPlatform = {
  __typename?: 'VerificationEmailResentForBrokerPlatform';
  email: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type VerifyEmailForBrokerPlatformCommand = {
  __typename?: 'VerifyEmailForBrokerPlatformCommand';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type VerifyLocation = {
  __typename?: 'VerifyLocation';
  address?: Maybe<Address>;
  bidLevy?: Maybe<Scalars['Boolean']['output']>;
  coordinates?: Maybe<Coordinate>;
  facilityIds?: Maybe<Array<Scalars['String']['output']>>;
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  serviceCharge?: Maybe<Money>;
  serviceChargeIncludesInsurance?: Maybe<Scalars['Boolean']['output']>;
  serviceChargeIncludesMechanicalAndElectrical?: Maybe<Scalars['Boolean']['output']>;
  serviceChargeIncludesUtilities?: Maybe<Scalars['Boolean']['output']>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  user?: Maybe<User>;
  withinCityOfLondon?: Maybe<Scalars['Boolean']['output']>;
};

export type VerifyLocationCommand = {
  __typename?: 'VerifyLocationCommand';
  user?: Maybe<User>;
  verifyLocation?: Maybe<VerifyLocation>;
  verifyUnits?: Maybe<Array<VerifyUnit>>;
};

export type VerifyLocationInput = {
  address?: InputMaybe<AddressInput>;
  bidLevy?: InputMaybe<Scalars['Boolean']['input']>;
  coordinates?: InputMaybe<CoordinateInput>;
  facilityIds?: InputMaybe<Array<Scalars['String']['input']>>;
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  serviceCharge?: InputMaybe<MoneyInput>;
  serviceChargeIncludesInsurance?: InputMaybe<Scalars['Boolean']['input']>;
  serviceChargeIncludesMechanicalAndElectrical?: InputMaybe<Scalars['Boolean']['input']>;
  serviceChargeIncludesUtilities?: InputMaybe<Scalars['Boolean']['input']>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  withinCityOfLondon?: InputMaybe<Scalars['Boolean']['input']>;
};

export type VerifyLocationsMerged = {
  __typename?: 'VerifyLocationsMerged';
  locationFrom?: Maybe<Location>;
  locationTo?: Maybe<Location>;
  user?: Maybe<User>;
};

export type VerifyPasswordResetTokenRequest = {
  __typename?: 'VerifyPasswordResetTokenRequest';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type VerifyPasswordResetTokenResponse = {
  __typename?: 'VerifyPasswordResetTokenResponse';
  ok: Scalars['Boolean']['output'];
  reason: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type VerifyPhoneRequest = {
  __typename?: 'VerifyPhoneRequest';
  code: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type VerifyPhoneResponse = {
  __typename?: 'VerifyPhoneResponse';
  user?: Maybe<User>;
  valid: Scalars['Boolean']['output'];
};

export type VerifyRegistrationRequest = {
  __typename?: 'VerifyRegistrationRequest';
  token: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type VerifyUnit = {
  __typename?: 'VerifyUnit';
  availabilityStatus?: Maybe<UnitAvailabilityStatusOptional>;
  businessRatesPsf?: Maybe<Money>;
  fitoutState?: Maybe<UnitFitoutState>;
  floor?: Maybe<Scalars['String']['output']>;
  floorNumbers?: Maybe<Array<Scalars['Float']['output']>>;
  floorplanUploadId?: Maybe<Scalars['String']['output']>;
  floorplanUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  isAvailable?: Maybe<Scalars['Boolean']['output']>;
  minAvailableFrom?: Maybe<Timestamp>;
  minTermMonths?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  netRent?: Maybe<Money>;
  rateableValue?: Maybe<Money>;
  ratesLink?: Maybe<Scalars['String']['output']>;
  rentFreeMonths?: Maybe<Scalars['Int']['output']>;
  sqFt?: Maybe<Scalars['Int']['output']>;
  surveyPhotoUploadIds?: Maybe<Array<Scalars['String']['output']>>;
  threeDimensionalModelUrl?: Maybe<Scalars['String']['output']>;
  totalRentFreeMonths?: Maybe<Scalars['Float']['output']>;
  unitId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type VerifyUnitInput = {
  availabilityStatus?: InputMaybe<UnitAvailabilityStatusOptionalInput>;
  businessRatesPsf?: InputMaybe<MoneyInput>;
  fitoutState?: InputMaybe<UnitFitoutState>;
  floor?: InputMaybe<Scalars['String']['input']>;
  floorNumbers?: InputMaybe<Array<Scalars['Float']['input']>>;
  floorplanUploadId?: InputMaybe<Scalars['String']['input']>;
  floorplanUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  minAvailableFrom?: InputMaybe<TimestampInput>;
  minTermMonths?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  netRent?: InputMaybe<MoneyInput>;
  rateableValue?: InputMaybe<MoneyInput>;
  ratesLink?: InputMaybe<Scalars['String']['input']>;
  rentFreeMonths?: InputMaybe<Scalars['Int']['input']>;
  sqFt?: InputMaybe<Scalars['Int']['input']>;
  surveyPhotoUploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
  threeDimensionalModelUrl?: InputMaybe<Scalars['String']['input']>;
  totalRentFreeMonths?: InputMaybe<Scalars['Float']['input']>;
  unitId?: InputMaybe<Scalars['String']['input']>;
};

export type VersionedDocument = {
  __typename?: 'VersionedDocument';
  current?: Maybe<Document>;
  documentType?: Maybe<DocumentType>;
  history?: Maybe<Array<Document>>;
};

export type Viewing = {
  __typename?: 'Viewing';
  activityId: Scalars['String']['output'];
  assignee?: Maybe<User>;
  assigneeId: Scalars['String']['output'];
  brokerContactId: Scalars['String']['output'];
  combinationDetails?: Maybe<CombinationDetails>;
  createdBy: Scalars['String']['output'];
  dueDate: Scalars['String']['output'];
  dueTime: Scalars['String']['output'];
  locationId: Scalars['String']['output'];
  notes: Scalars['String']['output'];
  startDate: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  typeId: Scalars['String']['output'];
  unitGroupDetails?: Maybe<GetDetailsForUnitsResponse>;
  unitGroupId: Scalars['String']['output'];
  unitIds: Array<Scalars['String']['output']>;
  units: Array<Maybe<Unit>>;
  user?: Maybe<User>;
  viewingNumber: Scalars['Int']['output'];
};


export type ViewingUnitGroupDetailsArgs = {
  estimatePrice?: InputMaybe<Scalars['Boolean']['input']>;
  overrideMinTermMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type ViewingRequest = {
  __typename?: 'ViewingRequest';
  brokerSearchId?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Timestamp>;
  date: Scalars['String']['output'];
  id?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  shortlistId?: Maybe<Scalars['String']['output']>;
  time: Scalars['String']['output'];
  unitGroup?: Maybe<Selection>;
  user?: Maybe<User>;
};

export type ViewingRequestCreated = {
  __typename?: 'ViewingRequestCreated';
  user?: Maybe<User>;
  viewingRequest?: Maybe<ShortlistViewingRequest>;
};

export type ViewingRequestInput = {
  brokerSearchId?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<TimestampInput>;
  date: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  shortlistId?: InputMaybe<Scalars['String']['input']>;
  time: Scalars['String']['input'];
  unitGroup?: InputMaybe<SelectionInput>;
};

export type Viewings = {
  __typename?: 'Viewings';
  user?: Maybe<User>;
  viewings?: Maybe<Array<Viewing>>;
};

export type Visit = {
  __typename?: 'Visit';
  attachedEntity?: Maybe<VisitAssociatedEntity>;
  attachedIssue?: Maybe<Issue>;
  data?: Maybe<VisitMutableData>;
  guest?: Maybe<Guest>;
  id: Scalars['String']['output'];
  orderCategories?: Maybe<Array<Maybe<OrderCategory>>>;
  subjectCompany?: Maybe<Company>;
  subjectLocation?: Maybe<Location>;
  visitor?: Maybe<VisitVisitor>;
  visitorUser?: Maybe<User>;
};

export type VisitAssociatedEntity = Enquiry | Issue;

export type VisitAttachedEntity = Enquiry | Issue;

export type VisitCreated = {
  __typename?: 'VisitCreated';
  dontSendNotification?: Maybe<Scalars['Boolean']['output']>;
  visit?: Maybe<Visit>;
};

export type VisitDeleted = {
  __typename?: 'VisitDeleted';
  visit?: Maybe<Visit>;
};

export type VisitEdge = {
  __typename?: 'VisitEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Visit>;
};

export type VisitMutableData = {
  __typename?: 'VisitMutableData';
  arrivalEndTime: Scalars['Int']['output'];
  arrivalStartTime: Scalars['Int']['output'];
  attachedEntities?: Maybe<Array<AttachedEntityData>>;
  attachedEntityId?: Maybe<Scalars['String']['output']>;
  attachedEntityType?: Maybe<AttachedEntity>;
  description: Scalars['String']['output'];
  endTimeUtc?: Maybe<DateTime>;
  guestId?: Maybe<Scalars['String']['output']>;
  orderCategoryIds?: Maybe<Array<Scalars['String']['output']>>;
  rescheduledFromId?: Maybe<Scalars['String']['output']>;
  startTimeUtc?: Maybe<DateTime>;
  subjectCompanyId?: Maybe<Scalars['String']['output']>;
  subjectLocationId?: Maybe<Scalars['String']['output']>;
  visitDate?: Maybe<Date>;
  visitorUserId?: Maybe<Scalars['String']['output']>;
};

export type VisitMutableDataInput = {
  arrivalEndTime: Scalars['Int']['input'];
  arrivalStartTime: Scalars['Int']['input'];
  attachedEntities?: InputMaybe<Array<AttachedEntityDataInput>>;
  attachedEntityId?: InputMaybe<Scalars['String']['input']>;
  attachedEntityType?: InputMaybe<AttachedEntity>;
  description: Scalars['String']['input'];
  endTimeUtc?: InputMaybe<DateTimeInput>;
  guestId?: InputMaybe<Scalars['String']['input']>;
  orderCategoryIds?: InputMaybe<Array<Scalars['String']['input']>>;
  rescheduledFromId?: InputMaybe<Scalars['String']['input']>;
  startTimeUtc?: InputMaybe<DateTimeInput>;
  subjectCompanyId?: InputMaybe<Scalars['String']['input']>;
  subjectLocationId?: InputMaybe<Scalars['String']['input']>;
  visitDate?: InputMaybe<DateInput>;
  visitorUserId?: InputMaybe<Scalars['String']['input']>;
};

export type VisitUpdated = {
  __typename?: 'VisitUpdated';
  visit?: Maybe<Visit>;
};

export type VisitVisitor = Guest | User;

export type VisitsConnection = {
  __typename?: 'VisitsConnection';
  edges?: Maybe<Array<VisitEdge>>;
  pageInfo?: Maybe<PageInfo>;
};

export type VisitsMigrated = {
  __typename?: 'VisitsMigrated';
  migrationSuccessful: Scalars['Boolean']['output'];
};

export enum WebPushCreateErrorType {
  Duplicate = 'DUPLICATE'
}

export type WebPushSubscriptionCreated = {
  __typename?: 'WebPushSubscriptionCreated';
  authSecret: Scalars['String']['output'];
  endpoint: Scalars['String']['output'];
  p256dh: Scalars['String']['output'];
  user?: Maybe<User>;
  userAgentString: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type WebPushSubscriptionError = {
  __typename?: 'WebPushSubscriptionError';
  message: Scalars['String']['output'];
  type?: Maybe<WebPushCreateErrorType>;
  user?: Maybe<User>;
};

export type WeekdayAttendances = {
  __typename?: 'WeekdayAttendances';
  companyWide?: Maybe<AttendanceValue>;
  dayPosition: Scalars['Int']['output'];
  perTeam?: Maybe<Array<AttendanceValue>>;
};

export type WeekdayInsights = {
  __typename?: 'WeekdayInsights';
  actualMeanAttendances?: Maybe<Array<WeekdayAttendances>>;
  busiestDayPositions?: Maybe<BusynessInsights>;
  expectedAttendances?: Maybe<Array<WeekdayAttendances>>;
  quietestDayPositions?: Maybe<BusynessInsights>;
};

export type WorkplaceGoal = {
  __typename?: 'WorkplaceGoal';
  id?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type WorkspaceStatus = {
  __typename?: 'WorkspaceStatus';
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  user?: Maybe<User>;
};

export type WorkspaceStatusInput = {
  id: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

export type Details = ContractorCompany | LandlordFinancials | TenantCompany;

export type TflStation = {
  __typename?: 'tflStation';
  busRoutes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  category?: Maybe<Scalars['String']['output']>;
  distanceInMetres?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  lines?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  minutesToWalk?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type TflStopTypes = {
  __typename?: 'tflStopTypes';
  tflStations?: Maybe<Array<Maybe<TflStation>>>;
};

export type Usersvc_RegisterUserForBrokerPlatformCommandResponseUnion = UserFailedToRegisterForBrokerPlatform | UserRegisteredForBrokerPlatform;

export type LoginUserMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginUserMutation = { __typename?: 'Mutation', usersvc_LoginCommand?: { __typename?: 'UserLoggedIn', token: string } | null };

export type UserFragment = { __typename?: 'User', isLeadTenant?: boolean | null, isKitt?: boolean | null, email: string, createdAt?: { __typename?: 'Timestamp', ISOString?: string | null } | null, company?: { __typename?: 'Company', id: string, name: string, activeTenancy?: { __typename?: 'Tenancy', startDate?: { __typename?: 'Timestamp', ISOString?: string | null } | null } | null, whiteLabelLogo?: { __typename?: 'UploadMessage', src: string } | null } | null, profile?: { __typename?: 'Profile', jobTitle: string, name: string, photo?: { __typename?: 'UploadMessage', src: string } | null, birthday?: { __typename?: 'Date', day: number, month: number, year: number } | null } | null };

export type SearchUserFragment = { __typename?: 'SearchUser', id: string, user?: { __typename?: 'User', isLeadTenant?: boolean | null, isKitt?: boolean | null, email: string, createdAt?: { __typename?: 'Timestamp', ISOString?: string | null } | null, company?: { __typename?: 'Company', id: string, name: string, activeTenancy?: { __typename?: 'Tenancy', startDate?: { __typename?: 'Timestamp', ISOString?: string | null } | null } | null, whiteLabelLogo?: { __typename?: 'UploadMessage', src: string } | null } | null, profile?: { __typename?: 'Profile', jobTitle: string, name: string, photo?: { __typename?: 'UploadMessage', src: string } | null, birthday?: { __typename?: 'Date', day: number, month: number, year: number } | null } | null } | null };

export type GetUserQueryVariables = Exact<{
  id: Scalars['String']['input'];
  token: Scalars['String']['input'];
}>;


export type GetUserQuery = { __typename?: 'RootQuery', usersvc_GetUser?: { __typename?: 'User', isLeadTenant?: boolean | null, isKitt?: boolean | null, email: string, createdAt?: { __typename?: 'Timestamp', ISOString?: string | null } | null, company?: { __typename?: 'Company', id: string, name: string, activeTenancy?: { __typename?: 'Tenancy', startDate?: { __typename?: 'Timestamp', ISOString?: string | null } | null } | null, whiteLabelLogo?: { __typename?: 'UploadMessage', src: string } | null } | null, profile?: { __typename?: 'Profile', jobTitle: string, name: string, photo?: { __typename?: 'UploadMessage', src: string } | null, birthday?: { __typename?: 'Date', day: number, month: number, year: number } | null } | null } | null };

export type SearchUsersQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type SearchUsersQuery = { __typename?: 'RootQuery', searchsvc_GetUsers?: { __typename?: 'SearchGetUsersResponse', users?: Array<{ __typename?: 'SearchUser', id: string, user?: { __typename?: 'User', isLeadTenant?: boolean | null, isKitt?: boolean | null, email: string, createdAt?: { __typename?: 'Timestamp', ISOString?: string | null } | null, company?: { __typename?: 'Company', id: string, name: string, activeTenancy?: { __typename?: 'Tenancy', startDate?: { __typename?: 'Timestamp', ISOString?: string | null } | null } | null, whiteLabelLogo?: { __typename?: 'UploadMessage', src: string } | null } | null, profile?: { __typename?: 'Profile', jobTitle: string, name: string, photo?: { __typename?: 'UploadMessage', src: string } | null, birthday?: { __typename?: 'Date', day: number, month: number, year: number } | null } | null } | null }> | null } | null };

export const UserFragmentDoc = gql`
    fragment User on User {
  email: Email
  isLeadTenant
  isKitt
  createdAt {
    ISOString
  }
  company {
    id
    name
    activeTenancy {
      startDate {
        ISOString
      }
    }
    whiteLabelLogo {
      src
    }
  }
  profile {
    photo {
      src
    }
    jobTitle
    birthday {
      day
      month
      year
    }
    name
  }
}
    `;
export const SearchUserFragmentDoc = gql`
    fragment SearchUser on SearchUser {
  id
  user {
    ...User
  }
}
    ${UserFragmentDoc}`;
export const LoginUserDocument = gql`
    mutation loginUser($email: String!, $password: String!) {
  usersvc_LoginCommand(email: $email, password: $password, rememberMe: true) {
    token
  }
}
    `;
export const GetUserDocument = gql`
    query getUser($id: String!, $token: String!) {
  usersvc_GetUser(id: $id, cookie: $token, verificationToken: "") {
    ...User
  }
}
    ${UserFragmentDoc}`;
export const SearchUsersDocument = gql`
    query searchUsers($email: String!) {
  searchsvc_GetUsers(query: $email) {
    users {
      ...SearchUser
    }
  }
}
    ${SearchUserFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();
const LoginUserDocumentString = print(LoginUserDocument);
const GetUserDocumentString = print(GetUserDocument);
const SearchUsersDocumentString = print(SearchUsersDocument);
export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    loginUser(variables: LoginUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LoginUserMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LoginUserMutation>(LoginUserDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'loginUser', 'mutation');
    },
    getUser(variables: GetUserQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: GetUserQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<GetUserQuery>(GetUserDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getUser', 'query');
    },
    searchUsers(variables: SearchUsersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SearchUsersQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SearchUsersQuery>(SearchUsersDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'searchUsers', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;