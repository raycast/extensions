/* eslint-disable @typescript-eslint/no-explicit-any */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    ISO8601DateTime: any;
    JSON: any;
};

/** Specifies the input needed to find an alert source with external information. */
export type AlertSourceExternalIdentifier = {
    /** The external id of the alert. */
    readonly externalId: Scalars["String"];
    /** The type of the alert. */
    readonly type: AlertSourceTypeEnum;
};

/** Specifies the input used for attaching an alert source to a service. */
export type AlertSourceServiceCreateInput = {
    /** Specifies the input needed to find an alert source with external information. */
    readonly alertSourceExternalIdentifier: InputMaybe<AlertSourceExternalIdentifier>;
    /** Specifies the input needed to find an alert source with external information. */
    readonly alertSourceId: InputMaybe<Scalars["ID"]>;
    /** The service that the alert source will be attached to. */
    readonly service: IdentifierInput;
};

/** Specifies the input fields used in the `alertSourceServiceDelete` mutation. */
export type AlertSourceServiceDeleteInput = {
    /** The id of the alert source service to be deleted. */
    readonly id: Scalars["ID"];
};

/** Specifies the input used for attaching alert sources to a service. */
export type AlertSourceServicesCreateInput = {
    /** The ids of the alert sources. */
    readonly alertSourceIds: ReadonlyArray<Scalars["ID"]>;
    /** The service that the alert source will be attached to. */
    readonly service: IdentifierInput;
};

/** Sort possibilities for alert sources. */
export enum AlertSourceSortEnum {
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
    /** Sort by `status` ascending. */
    StatusAsc = "status_ASC",
    /** Sort by `status` descending. */
    StatusDesc = "status_DESC",
    /** Sort by `type` ascending. */
    TypeAsc = "type_ASC",
    /** Sort by `type` descending. */
    TypeDesc = "type_DESC",
}

/** The monitor status level. */
export enum AlertSourceStatusTypeEnum {
    /** Monitor is reporting an alert. */
    Alert = "alert",
    /** Monitor currently being updated. */
    FetchingData = "fetching_data",
    /** No data received yet. Ensure your monitors are configured correctly. */
    NoData = "no_data",
    /** Monitor is not reporting any warnings or alerts. */
    Ok = "ok",
    /** Monitor is reporting a warning. */
    Warn = "warn",
}

/** The type of the alert source. */
export enum AlertSourceTypeEnum {
    /** A Datadog alert source (aka monitor). */
    Datadog = "datadog",
    /** An Opsgenie alert source (aka service) */
    Opsgenie = "opsgenie",
    /** A PagerDuty alert source (aka service). */
    Pagerduty = "pagerduty",
}

/** The monitor status level. */
export enum AlertStatusTypeEnum {
    /** Monitor is reporting an alert. */
    Alert = "alert",
    /** Not received data yet. Ensure your monitors are configured correctly. */
    NoData = "no_data",
    /** There are no warnings or alerts. */
    Ok = "ok",
    /** Monitor is reporting a warning. */
    Warn = "warn",
}

/** The input for the `aliasCreate` mutation. */
export type AliasCreateInput = {
    /** The alias you wish to create. */
    readonly alias: Scalars["String"];
    /** If true, attach events recorded before this alias was created (if any). */
    readonly attachHistoricalEvents: InputMaybe<Scalars["Boolean"]>;
    /** The ID of the resource you want to create the alias on. Services and teams are supported. */
    readonly ownerId: Scalars["String"];
};

/** The input for the `aliasDelete` mutation. */
export type AliasDeleteInput = {
    /** The alias you wish to delete. */
    readonly alias: Scalars["String"];
    /** The resource the alias you wish to delete belongs to. */
    readonly ownerType: AliasOwnerTypeEnum;
};

/** The owner type an alias is assigned to. */
export enum AliasOwnerTypeEnum {
    /** Aliases that are assigned to services. */
    Service = "service",
    /** Aliases that are assigned to teams. */
    Team = "team",
}

/** The source used to determine the preferred API document. */
export enum ApiDocumentSourceEnum {
    /** Use the document that was pulled by OpsLevel via a repo. */
    Pull = "PULL",
    /** Use the document that was pushed to OpsLevel via an API Docs integration. */
    Push = "PUSH",
}

/** Specifies the input fields used in the `awsIntegrationCreate` mutation. */
export type AwsIntegrationCreateInput = {
    /** The External ID defined in the trust relationship to ensure OpsLevel is the only third party assuming this role (See https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html for more details). */
    readonly externalId: Scalars["String"];
    /** The IAM role OpsLevel uses in order to access the AWS account. */
    readonly iamRole: Scalars["String"];
    /** An Array of tag keys used to associate ownership from an integration. Max 5 */
    readonly ownershipTagKeys: InputMaybe<ReadonlyArray<Scalars["String"]>>;
};

/** Specifies the input fields used in the `awsIntegrationUpdate` mutation. */
export type AwsIntegrationUpdateInput = {
    /** Allow tags imported from AWS to override ownership set in OpsLevel directly. */
    readonly awsTagsOverrideOwnership: InputMaybe<Scalars["Boolean"]>;
    /** The External ID defined in the trust relationship to ensure OpsLevel is the only third party assuming this role (See https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html for more details). */
    readonly externalId: InputMaybe<Scalars["String"]>;
    /** The IAM role OpsLevel uses in order to access the AWS account. */
    readonly iamRole: InputMaybe<Scalars["String"]>;
    readonly integration: IdentifierInput;
    /** An Array of tag keys used to associate ownership from an integration. Max 5 */
    readonly ownershipTagKeys: InputMaybe<ReadonlyArray<Scalars["String"]>>;
};

/** Operations that can be used on filters. */
export enum BasicTypeEnum {
    /** Does not equal a specific value. */
    DoesNotEqual = "does_not_equal",
    /** Equals a specific value. */
    Equals = "equals",
}

/** Specifies the input fields used to create a campaign. */
export type CampaignCreateInput = {
    /** The IDs of the existing rubric checks to be copied. */
    readonly checkIdsToCopy: InputMaybe<ReadonlyArray<Scalars["ID"]>>;
    /** The ID of the filter applied to this campaign. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The name of the campaign. */
    readonly name: Scalars["String"];
    /** The ID of the team that owns this campaigns. */
    readonly ownerId: Scalars["ID"];
    /** The project brief of the campaign. */
    readonly projectBrief: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to end a campaign and promote checks to the rubric. */
export type CampaignEndInput = {
    /** The list of campaign checks to be promoted to the rubric. */
    readonly checksToPromote: InputMaybe<ReadonlyArray<CheckToPromoteInput>>;
    /** he ID of the campaign to be ended. */
    readonly id: Scalars["ID"];
};

/** Fields that can be used as part of filter for campaigns. */
export enum CampaignFilterEnum {
    /** Filter by `id` of campaign. */
    Id = "id",
    /** Filter by campaign owner. */
    Owner = "owner",
    /** Filter by campaign status. */
    Status = "status",
}

/** Input to be used to filter campaigns. */
export type CampaignFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** The logical operator to be used in conjunction with multiple filters (requires predicates to be supplied). */
    readonly connective: InputMaybe<ConnectiveEnum>;
    /** Field to be filtered. */
    readonly key: InputMaybe<CampaignFilterEnum>;
    /** A list of campaign filter input. */
    readonly predicates: InputMaybe<ReadonlyArray<CampaignFilterInput>>;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Type/Format of the notification. */
export enum CampaignReminderTypeEnum {
    /** Notification will be sent via email. */
    Email = "email",
    /** Notification will be sent by slack. */
    Slack = "slack",
}

/** Specifies the input fields used to update a campaign schedule. */
export type CampaignScheduleUpdateInput = {
    /** The id of the campaign to be updated. */
    readonly id: Scalars["ID"];
    /** The date the campaign will start. */
    readonly startDate: Scalars["ISO8601DateTime"];
    /** The target date the campaign should end. */
    readonly targetDate: Scalars["ISO8601DateTime"];
};

/** Specifies the input fields used to coordinate sending notifications to team members about a campaign. */
export type CampaignSendReminderInput = {
    /** A custom message to include in the notification. */
    readonly customMessage: InputMaybe<Scalars["String"]>;
    /** The ID of the campaign about which to notify team members. */
    readonly id: Scalars["ID"];
    /** The list of the types of notifications to be sent. */
    readonly reminderTypes: ReadonlyArray<CampaignReminderTypeEnum>;
    /** The list of team ids to receive the notifications. */
    readonly teamIds: InputMaybe<ReadonlyArray<Scalars["ID"]>>;
};

/** Status of whether a service is passing all checks for a campaign or not. */
export enum CampaignServiceStatusEnum {
    /** Service is failing one or more checks in the campaign. */
    Failing = "failing",
    /** Service is passing all the checks in the campaign. */
    Passing = "passing",
}

/** Sort possibilities for campaigns. */
export enum CampaignSortEnum {
    /** Sort by number of `checks passing` ascending. */
    ChecksPassingAsc = "checks_passing_ASC",
    /** Sort by number of `checks passing` descending. */
    ChecksPassingDesc = "checks_passing_DESC",
    /** Sort by `endedDate` ascending. */
    EndedDateAsc = "ended_date_ASC",
    /** Sort by `endedDate` descending. */
    EndedDateDesc = "ended_date_DESC",
    /** Sort by `filter` ascending. */
    FilterAsc = "filter_ASC",
    /** Sort by `filter` descending. */
    FilterDesc = "filter_DESC",
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
    /** Sort by `owner` ascending. */
    OwnerAsc = "owner_ASC",
    /** Sort by `owner` descending. */
    OwnerDesc = "owner_DESC",
    /** Sort by number of `services complete` ascending. */
    ServicesCompleteAsc = "services_complete_ASC",
    /** Sort by number of `services complete` descending. */
    ServicesCompleteDesc = "services_complete_DESC",
    /** Sort by `startDate` ascending. */
    StartDateAsc = "start_date_ASC",
    /** Sort by `startDate` descending. */
    StartDateDesc = "start_date_DESC",
    /** Sort by `status` ascending. */
    StatusAsc = "status_ASC",
    /** Sort by `status` descending. */
    StatusDesc = "status_DESC",
    /** Sort by `targetDate` ascending. */
    TargetDateAsc = "target_date_ASC",
    /** Sort by `targetDate` descending. */
    TargetDateDesc = "target_date_DESC",
}

/** The campaign status. */
export enum CampaignStatusEnum {
    /** Campaign is delayed. */
    Delayed = "delayed",
    /** Campaign has been created but is not yet active. */
    Draft = "draft",
    /** Campaign ended. */
    Ended = "ended",
    /** Campaign is in progress. */
    InProgress = "in_progress",
    /** Campaign has been scheduled to begin in the future. */
    Scheduled = "scheduled",
}

/** Specifices the input fields used to unschedule a campaign. */
export type CampaignUnscheduleInput = {
    /** The id of the campaign to be unscheduled. */
    readonly id: Scalars["ID"];
};

/** Specifies the input fields used to update a campaign. */
export type CampaignUpdateInput = {
    /** The ID of the filter applied to this campaign. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the campaign to be updated. */
    readonly id: Scalars["ID"];
    /** The name of the campaign. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The ID of the team that owns this campaigns. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The project brief of the campaign. */
    readonly projectBrief: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to create a category. */
export type CategoryCreateInput = {
    /** The description of the category. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The display name of the category. */
    readonly name: Scalars["String"];
};

/** Specifies the input fields used to delete a category. */
export type CategoryDeleteInput = {
    /** The id of the category to be deleted. */
    readonly id: Scalars["ID"];
};

/** Input to be used to filter services by a category and optional levels. */
export type CategoryFilterInput = {
    /** The id of the category. */
    readonly id: Scalars["ID"];
    /** The indexes of the service levels of the category. */
    readonly levelIndexes: InputMaybe<ReadonlyArray<Scalars["Int"]>>;
};

/** Specifies the input fields used to update a category. */
export type CategoryUpdateInput = {
    /** The description of the category. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The id of the category to be updated. */
    readonly id: Scalars["ID"];
    /** The display name of the category. */
    readonly name: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to create an alert source usage check. */
export type CheckAlertSourceUsageCreateInput = {
    /** The condition that the alert source name should satisfy to be evaluated. */
    readonly alertSourceNamePredicate: InputMaybe<PredicateInput>;
    /** The type of the alert source. */
    readonly alertSourceType: InputMaybe<AlertSourceTypeEnum>;
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update an alert source usage check. */
export type CheckAlertSourceUsageUpdateInput = {
    /** The condition that the alert source name should satisfy to be evaluated. */
    readonly alertSourceNamePredicate: InputMaybe<PredicateUpdateInput>;
    /** The type of the alert source. */
    readonly alertSourceType: InputMaybe<AlertSourceTypeEnum>;
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a check. */
export type CheckCreateInput = {
    /** Additional arguments required by some check types. */
    readonly args: InputMaybe<Scalars["JSON"]>;
    /** The id of the campaign the check belongs to. */
    readonly campaignId: InputMaybe<Scalars["ID"]>;
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: Scalars["Boolean"];
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The integration id this check will use. */
    readonly integrationId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The type of check. */
    readonly type: CheckType;
};

/** Specifies the input fields used to create a custom check. */
export type CheckCustomCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Creates a custom event check. */
export type CheckCustomEventCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The integration id this check will use. */
    readonly integrationId: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
    readonly passPending: InputMaybe<Scalars["Boolean"]>;
    /** The check result message template. It is compiled with Liquid and formatted in Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating). */
    readonly resultMessage: InputMaybe<Scalars["String"]>;
    /** A jq expression that will be ran against your payload. This will parse out the service identifier. [More info about jq](https://jqplay.org/). */
    readonly serviceSelector: Scalars["String"];
    /** A jq expression that will be ran against your payload. A truthy value will result in the check passing. [More info about jq](https://jqplay.org/). */
    readonly successCondition: Scalars["String"];
};

/** Specifies the input fields used to update a custom event check. */
export type CheckCustomEventUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The integration id this check will use. */
    readonly integrationId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
    readonly passPending: InputMaybe<Scalars["Boolean"]>;
    /** The check result message template. It is compiled with Liquid and formatted in Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating). */
    readonly resultMessage: InputMaybe<Scalars["String"]>;
    /** A jq expression that will be ran against your payload. This will parse out the service identifier. [More info about jq](https://jqplay.org/). */
    readonly serviceSelector: InputMaybe<Scalars["String"]>;
    /** A jq expression that will be ran against your payload. A truthy value will result in the check passing. [More info about jq](https://jqplay.org/). */
    readonly successCondition: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to update a custom check. */
export type CheckCustomUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to delete a check. */
export type CheckDeleteInput = {
    /** The id of the check to be deleted. */
    readonly id: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a branch protection check. */
export type CheckGitBranchProtectionCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a branch protection check. */
export type CheckGitBranchProtectionUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a documentation check. */
export type CheckHasDocumentationCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The subtype of the document. */
    readonly documentSubtype: HasDocumentationSubtypeEnum;
    /** The type of the document. */
    readonly documentType: HasDocumentationTypeEnum;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a documentation check. */
export type CheckHasDocumentationUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The subtype of the document. */
    readonly documentSubtype: InputMaybe<HasDocumentationSubtypeEnum>;
    /** The type of the document. */
    readonly documentType: InputMaybe<HasDocumentationTypeEnum>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a recent deploys check. */
export type CheckHasRecentDeployCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The number of days to check since the last deploy. */
    readonly days: Scalars["Int"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a has recent deploy check. */
export type CheckHasRecentDeployUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The number of days to check since the last deploy. */
    readonly days: InputMaybe<Scalars["Int"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a manual check. */
export type CheckManualCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Defines the minimum frequency of the updates. */
    readonly updateFrequency: InputMaybe<ManualCheckFrequencyInput>;
    /** Whether the check requires a comment or not. */
    readonly updateRequiresComment: Scalars["Boolean"];
};

/** Specifies the input fields used to update a manual check. */
export type CheckManualUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Defines the minimum frequency of the updates. */
    readonly updateFrequency: InputMaybe<ManualCheckFrequencyUpdateInput>;
    /** Whether the check requires a comment or not. */
    readonly updateRequiresComment: InputMaybe<Scalars["Boolean"]>;
};

/** Creates a payload check. */
export type CheckPayloadCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** A jq expression that will be ran against your payload. A truthy value will result in the check passing. [More info about jq](https://jqplay.org/). */
    readonly jqExpression: Scalars["String"];
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The check result message template. It is compiled with Liquid and formatted in Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating). */
    readonly resultMessage: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to update a payload check. */
export type CheckPayloadUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** A jq expression that will be ran against your payload. A truthy value will result in the check passing. [More info about jq](https://jqplay.org/). */
    readonly jqExpression: InputMaybe<Scalars["String"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The check result message template. It is compiled with Liquid and formatted in Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating). */
    readonly resultMessage: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to create a repo file check. */
export type CheckRepositoryFileCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** Whether the check looks for the existence of a directory instead of a file. */
    readonly directorySearch: InputMaybe<Scalars["Boolean"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the file content. */
    readonly fileContentsPredicate: InputMaybe<PredicateInput>;
    /** Restrict the search to certain file paths. */
    readonly filePaths: ReadonlyArray<Scalars["String"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Whether the checks looks at the absolute root of a repo or the relative root (the directory specified when attached a repo to a service). */
    readonly useAbsoluteRoot: InputMaybe<Scalars["Boolean"]>;
};

/** Specifies the input fields used to update a repo file check. */
export type CheckRepositoryFileUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** Whether the check looks for the existence of a directory instead of a file. */
    readonly directorySearch: InputMaybe<Scalars["Boolean"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the file content. */
    readonly fileContentsPredicate: InputMaybe<PredicateUpdateInput>;
    /** Restrict the search to certain file paths. */
    readonly filePaths: InputMaybe<ReadonlyArray<Scalars["String"]>>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Whether the checks looks at the absolute root of a repo or the relative root (the directory specified when attached a repo to a service). */
    readonly useAbsoluteRoot: InputMaybe<Scalars["Boolean"]>;
};

/** Specifies the input fields used to create a repo grep check. */
export type CheckRepositoryGrepCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** Whether the check looks for the existence of a directory instead of a file. */
    readonly directorySearch: InputMaybe<Scalars["Boolean"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the file content. */
    readonly fileContentsPredicate: PredicateInput;
    /** Restrict the search to certain file paths. */
    readonly filePaths: ReadonlyArray<Scalars["String"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a repo file check. */
export type CheckRepositoryGrepUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** Whether the check looks for the existence of a directory instead of a file. */
    readonly directorySearch: InputMaybe<Scalars["Boolean"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the file content. */
    readonly fileContentsPredicate: InputMaybe<PredicateUpdateInput>;
    /** Restrict the search to certain file paths. */
    readonly filePaths: InputMaybe<ReadonlyArray<Scalars["String"]>>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a repository integrated check. */
export type CheckRepositoryIntegratedCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a repository integrated check. */
export type CheckRepositoryIntegratedUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a repo search check. */
export type CheckRepositorySearchCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the text content. */
    readonly fileContentsPredicate: PredicateInput;
    /** Restrict the search to files of given extensions. Extensions should contain only letters and numbers. For example: `['py', 'rb']`. */
    readonly fileExtensions: InputMaybe<ReadonlyArray<Scalars["String"]>>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** The search to perform */
export type CheckRepositorySearchInput = {
    /** Condition to match the text content. */
    readonly fileContentsPredicate: PredicateInput;
    /** Restrict the search to files of given extensions. Extensions should contain only letters and numbers. For example: `['py', 'rb']`. */
    readonly fileExtensions: InputMaybe<ReadonlyArray<Scalars["String"]>>;
};

/** Specifies the input fields used to update a repo search check. */
export type CheckRepositorySearchUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** Condition to match the text content. */
    readonly fileContentsPredicate: InputMaybe<PredicateUpdateInput>;
    /** Restrict the search to files of given extensions. Extensions should contain only letters and numbers. For example: `['py', 'rb']`. */
    readonly fileExtensions: InputMaybe<ReadonlyArray<Scalars["String"]>>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a configuration check. */
export type CheckServiceConfigurationCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a configuration check. */
export type CheckServiceConfigurationUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create a service dependency check. */
export type CheckServiceDependencyCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to update a service dependency check. */
export type CheckServiceDependencyUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create an ownership check. */
export type CheckServiceOwnershipCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The type of contact method that an owner should provide */
    readonly contactMethod: InputMaybe<Scalars["String"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Whether to require a contact method for a service owner or not */
    readonly requireContactMethod: InputMaybe<Scalars["Boolean"]>;
    /** The tag key that should exist for a service owner. */
    readonly tagKey: InputMaybe<Scalars["String"]>;
    /** The condition that should be satisfied by the tag value. */
    readonly tagPredicate: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update an ownership check. */
export type CheckServiceOwnershipUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The type of contact method that an owner should provide */
    readonly contactMethod: InputMaybe<Scalars["String"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Whether to require a contact method for a service owner or not */
    readonly requireContactMethod: InputMaybe<Scalars["Boolean"]>;
    /** The tag key that should exist for a service owner. */
    readonly tagKey: InputMaybe<Scalars["String"]>;
    /** The condition that should be satisfied by the tag value. */
    readonly tagPredicate: InputMaybe<PredicateUpdateInput>;
};

/** Specifies the input fields used to create a service property check. */
export type CheckServicePropertyCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The condition that should be satisfied by the service property value. */
    readonly propertyValuePredicate: InputMaybe<PredicateInput>;
    /** The property of the service that the check will verify. */
    readonly serviceProperty: ServicePropertyTypeEnum;
};

/** Specifies the input fields used to update a service property check. */
export type CheckServicePropertyUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The condition that should be satisfied by the service property value. */
    readonly propertyValuePredicate: InputMaybe<PredicateUpdateInput>;
    /** The property of the service that the check will verify. */
    readonly serviceProperty: InputMaybe<ServicePropertyTypeEnum>;
};

/** The evaluation status of the check. */
export enum CheckStatus {
    /** The check evaluated to a falsy value based on some conditions. */
    Failed = "failed",
    /** The check evaluated to a truthy value based on some conditions. */
    Passed = "passed",
    /** The check has not been evaluated yet.. */
    Pending = "pending",
}

/** Specifies the input fields used to create a tag check. */
export type CheckTagDefinedCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The tag key where the tag predicate should be applied. */
    readonly tagKey: Scalars["String"];
    /** The condition that should be satisfied by the tag value. */
    readonly tagPredicate: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update a tag defined check. */
export type CheckTagDefinedUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The tag key where the tag predicate should be applied. */
    readonly tagKey: InputMaybe<Scalars["String"]>;
    /** The condition that should be satisfied by the tag value. */
    readonly tagPredicate: InputMaybe<PredicateUpdateInput>;
};

/** Specifies the input fields used to promote a campaign check to the rubric. */
export type CheckToPromoteInput = {
    /** The ID of the category that the promoted check will be linked to. */
    readonly categoryId: Scalars["ID"];
    /** The ID of the check to be promoted to the rubric. */
    readonly checkId: Scalars["ID"];
    /** The ID of the level that the promoted check will be linked to. */
    readonly levelId: Scalars["ID"];
};

/** Specifies the input fields used to create a tool usage check. */
export type CheckToolUsageCreateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: Scalars["ID"];
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The condition that the environment should satisfy to be evaluated. */
    readonly environmentPredicate: InputMaybe<PredicateInput>;
    /** The id of the filter of the check. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the level the check belongs to. */
    readonly levelId: Scalars["ID"];
    /** The display name of the check. */
    readonly name: Scalars["String"];
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the team that owns the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The category that the tool belongs to. */
    readonly toolCategory: ToolCategory;
    /** The condition that the tool name should satisfy to be evaluated. */
    readonly toolNamePredicate: InputMaybe<PredicateInput>;
    /** The condition that the tool url should satisfy to be evaluated. */
    readonly toolUrlPredicate: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update a tool usage check. */
export type CheckToolUsageUpdateInput = {
    /** The id of the category the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** The date when the check will be automatically enabled. */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** Whether the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The condition that the environment should satisfy to be evaluated. */
    readonly environmentPredicate: InputMaybe<PredicateUpdateInput>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The id of the level the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The category that the tool belongs to. */
    readonly toolCategory: InputMaybe<ToolCategory>;
    /** The condition that the tool name should satisfy to be evaluated. */
    readonly toolNamePredicate: InputMaybe<PredicateUpdateInput>;
    /** The condition that the tool url should satisfy to be evaluated. */
    readonly toolUrlPredicate: InputMaybe<PredicateUpdateInput>;
};

/** The type of check. */
export enum CheckType {
    /** Verifies that the service has an alert source of a particular type or name. */
    AlertSourceUsage = "alert_source_usage",
    /** Allows for the creation of programmatic checks that use an API to mark the status as passing or failing. */
    Custom = "custom",
    /** Requires a generic integration api call to complete a series of checks for multiple services. */
    Generic = "generic",
    /** Verifies that all the repositories on the service have branch protection enabled. */
    GitBranchProtection = "git_branch_protection",
    /** Verifies that the service has visible documentation of a particular type and subtype. */
    HasDocumentation = "has_documentation",
    /** Verifies that the service has an owner defined. */
    HasOwner = "has_owner",
    /** Verified that the services has received a deploy within a specified number of days. */
    HasRecentDeploy = "has_recent_deploy",
    /** Verifies that the service has a repository integrated. */
    HasRepository = "has_repository",
    /** Verifies that the service is maintained though the use of an opslevel.yml service config. */
    HasServiceConfig = "has_service_config",
    /** Requires a service owner to manually complete a check for the service. */
    Manual = "manual",
    /** Requires a payload integration api call to complete a check for the service. */
    Payload = "payload",
    /** Quickly scan the service’s repository for the existence or contents of a specific file. */
    RepoFile = "repo_file",
    /** Run a comprehensive search across the service's repository using advanced search parameters. */
    RepoGrep = "repo_grep",
    /** Quickly search the service’s repository for specific contents in any file. */
    RepoSearch = "repo_search",
    /** Verifies that the service has either a dependent or dependency. */
    ServiceDependency = "service_dependency",
    /** Verifies that a service property is set or matches a specified format. */
    ServiceProperty = "service_property",
    /** Verifies that the service has the specified tag defined. */
    TagDefined = "tag_defined",
    /** Verifies that the service is using a tool of a particular category or name. */
    ToolUsage = "tool_usage",
}

/** Specifies the input fields used to update a check. */
export type CheckUpdateInput = {
    /** Additional arguments required by some check types. */
    readonly args: InputMaybe<Scalars["JSON"]>;
    /** The campaign id that the check belongs to. */
    readonly campaignId: InputMaybe<Scalars["ID"]>;
    /** The category id that the check belongs to. */
    readonly categoryId: InputMaybe<Scalars["ID"]>;
    /** translation missing: en.graphql.types.check_update_input.enable_on */
    readonly enableOn: InputMaybe<Scalars["ISO8601DateTime"]>;
    /** If the check is enabled or not. */
    readonly enabled: InputMaybe<Scalars["Boolean"]>;
    /** The id of the filter the check belongs to. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The id of the check to be updated. */
    readonly id: Scalars["ID"];
    /** The integration id this check will use. */
    readonly integrationId: InputMaybe<Scalars["ID"]>;
    /** The level id that the check belongs to. */
    readonly levelId: InputMaybe<Scalars["ID"]>;
    /** The display name of the check. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the check. */
    readonly notes: InputMaybe<Scalars["String"]>;
    /** The id of the owner of the check. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to parse a check. */
export type CheckYamlParseInput = {
    /** The raw yaml contents for importing a check. */
    readonly checkYaml: Scalars["String"];
};

/** Specifies the input fields used to copy selected rubric checks to an existing campaign. */
export type ChecksCopyToCampaignInput = {
    /** The ID of the existing campaign. */
    readonly campaignId: Scalars["ID"];
    /** The IDs of the existing rubric checks to be copied. */
    readonly checkIds: ReadonlyArray<Scalars["ID"]>;
};

/** The possible types of a config error. */
export enum ConfigErrorClass {
    /** An alert source error. */
    AlertSourceError = "ALERT_SOURCE_ERROR",
    /** An alias error. */
    AliasError = "ALIAS_ERROR",
    /** An invalid value error. */
    InvalidValueError = "INVALID_VALUE_ERROR",
    /** A missing key error. */
    MissingKeyError = "MISSING_KEY_ERROR",
    /** A service dependency error. */
    ServiceDependencyError = "SERVICE_DEPENDENCY_ERROR",
    /** A service repository error. */
    ServiceRepositoryError = "SERVICE_REPOSITORY_ERROR",
    /** A syntax error. */
    SyntaxError = "SYNTAX_ERROR",
    /** A tag error. */
    TagError = "TAG_ERROR",
    /** A tool error. */
    ToolError = "TOOL_ERROR",
}

/** The logical operator to be used in conjunction with multiple filters (requires filters to be supplied). */
export enum ConnectiveEnum {
    /** Used to ensure **all** filters match for a given resource. */
    And = "and",
    /** Used to ensure **any** filters match for a given resource. */
    Or = "or",
}

/** Specifies the input fields used to create a contact. */
export type ContactCreateInput = {
    /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
    readonly address: Scalars["String"];
    /** The name shown in the UI for the contact. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The type shown in the UI for the contact. */
    readonly displayType: InputMaybe<Scalars["String"]>;
    /** The id of the owner of this contact. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The alias of the team the contact belongs to. */
    readonly teamAlias: InputMaybe<Scalars["String"]>;
    /** The method of contact [email, slack, slack_handle, web]. */
    readonly type: ContactType;
};

/** Specifies the input fields used to delete a contact. */
export type ContactDeleteInput = {
    /** The `id` of the contact you wish to delete. */
    readonly id: Scalars["ID"];
};

/** Specifies the input fields used to create a contact. */
export type ContactInput = {
    /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
    readonly address: Scalars["String"];
    /** The name shown in the UI for the contact. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The method of contact [email, slack, slack_handle, web]. */
    readonly type: ContactType;
};

/** The method of contact. */
export enum ContactType {
    /** An email contact method. */
    Email = "email",
    /** A GitHub handle. */
    Github = "github",
    /** A Slack channel contact method. */
    Slack = "slack",
    /** A Slack handle contact method. */
    SlackHandle = "slack_handle",
    /** A website contact method. */
    Web = "web",
}

/** Specifies the input fields used to update a contact. */
export type ContactUpdateInput = {
    /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
    readonly address: InputMaybe<Scalars["String"]>;
    /** The name shown in the UI for the contact. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The type shown in the UI for the contact. */
    readonly displayType: InputMaybe<Scalars["String"]>;
    /** The unique identifier for the contact. */
    readonly id: Scalars["ID"];
    /** The method of contact [email, slack, slack_handle, web]. */
    readonly type: InputMaybe<ContactType>;
};

/** The entity types a custom action can be associated with. */
export enum CustomActionsEntityTypeEnum {
    /** A custom action associated with the global scope (no particular entity type). */
    Global = "GLOBAL",
    /** A custom action associated with services. */
    Service = "SERVICE",
}

/** An HTTP request method. */
export enum CustomActionsHttpMethodEnum {
    /** An HTTP DELETE request. */
    Delete = "DELETE",
    /** An HTTP GET request. */
    Get = "GET",
    /** An HTTP PATCH request. */
    Patch = "PATCH",
    /** An HTTP POST request. */
    Post = "POST",
    /** An HTTP PUT request. */
    Put = "PUT",
}

/** Who can see and use the trigger definition */
export enum CustomActionsTriggerDefinitionAccessControlEnum {
    /** Admin users */
    Admins = "admins",
    /** All users of OpsLevel */
    Everyone = "everyone",
    /** The owners of a service */
    ServiceOwners = "service_owners",
}

/** Specifies the input fields used in the `customActionsTriggerDefinitionCreate` mutation. */
export type CustomActionsTriggerDefinitionCreateInput = {
    /** The set of users that should be able to use the trigger definition. */
    readonly accessControl: InputMaybe<CustomActionsTriggerDefinitionAccessControlEnum>;
    /** The details for a new action to create for the Trigger Definition. */
    readonly action: InputMaybe<CustomActionsWebhookActionCreateInput>;
    /** The action that will be triggered by the Trigger Definition. */
    readonly actionId: InputMaybe<Scalars["ID"]>;
    /** The description of what the Trigger Definition will do. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The entity type to associate with the Trigger Definition. */
    readonly entityType: InputMaybe<CustomActionsEntityTypeEnum>;
    /** The set of additional teams who can invoke this Trigger Definition. */
    readonly extendedTeamAccess: InputMaybe<ReadonlyArray<IdentifierInput>>;
    /** The filter that will determine which services apply to the Trigger Definition. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The YAML definition of custom inputs for the Trigger Definition. */
    readonly manualInputsDefinition: InputMaybe<Scalars["String"]>;
    /** The name of the Trigger Definition. */
    readonly name: Scalars["String"];
    /** The owner of the Trigger Definition. */
    readonly ownerId: Scalars["ID"];
    /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
    readonly published: InputMaybe<Scalars["Boolean"]>;
    /** The liquid template used to parse the response from the External Action. */
    readonly responseTemplate: InputMaybe<Scalars["String"]>;
};

/** Fields that can be used as part of filters for Trigger Definitions. */
export enum CustomActionsTriggerDefinitionFilterEnum {
    /** Filter by `access_control` field */
    AccessControl = "access_control",
    /** Filter by `owner` field */
    OwnerId = "owner_id",
    /** Filter by `published` field */
    Published = "published",
}

/** Input to be used to filter types. */
export type CustomActionsTriggerDefinitionFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: CustomActionsTriggerDefinitionFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for Trigger Definitions. */
export enum CustomActionsTriggerDefinitionSortEnum {
    /** Order by `access_control` ascending */
    AccessControlAsc = "access_control_ASC",
    /** Order by `access_control` descending */
    AccessControlDesc = "access_control_DESC",
    /** Order by `created_at` ascending */
    CreatedAtAsc = "created_at_ASC",
    /** Order by `created_at` descending */
    CreatedAtDesc = "created_at_DESC",
    /** Order by `name` ascending */
    NameAsc = "name_ASC",
    /** Order by `name` descending */
    NameDesc = "name_DESC",
    /** Order by `owner` ascending */
    OwnerAsc = "owner_ASC",
    /** Order by `owner` descending */
    OwnerDesc = "owner_DESC",
    /** Order by `published` ascending */
    PublishedAsc = "published_ASC",
    /** Order by `published` descending */
    PublishedDesc = "published_DESC",
    /** Order by `updated_at` ascending */
    UpdatedAtAsc = "updated_at_ASC",
    /** Order by `updated_at` descending */
    UpdatedAtDesc = "updated_at_DESC",
}

/** Specifies the input fields used in the `customActionsTriggerDefinitionUpdate` mutation. */
export type CustomActionsTriggerDefinitionUpdateInput = {
    /** The set of users that should be able to use the trigger definition. */
    readonly accessControl: InputMaybe<CustomActionsTriggerDefinitionAccessControlEnum>;
    /** The details for the action to update for the Trigger Definition. */
    readonly action: InputMaybe<CustomActionsWebhookActionUpdateInput>;
    /** The action that will be triggered by the Trigger Definition. */
    readonly actionId: InputMaybe<Scalars["ID"]>;
    /** The description of what the Trigger Definition will do. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The entity type to associate with the Trigger Definition. */
    readonly entityType: InputMaybe<CustomActionsEntityTypeEnum>;
    /** The set of additional teams who can invoke this Trigger Definition. */
    readonly extendedTeamAccess: InputMaybe<ReadonlyArray<IdentifierInput>>;
    /** The filter that will determine which services apply to the Trigger Definition. */
    readonly filterId: InputMaybe<Scalars["ID"]>;
    /** The ID of the trigger definition. */
    readonly id: Scalars["ID"];
    /** The YAML definition of custom inputs for the Trigger Definition. */
    readonly manualInputsDefinition: InputMaybe<Scalars["String"]>;
    /** The name of the Trigger Definition. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The owner of the Trigger Definition. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
    readonly published: InputMaybe<Scalars["Boolean"]>;
    /** The liquid template used to parse the response from the External Action. */
    readonly responseTemplate: InputMaybe<Scalars["String"]>;
};

/** Fields that can be used as part of filter for Custom Action Trigger Events. */
export enum CustomActionsTriggerEventFilterEnum {
    /** Filter Custom Action Triggers by status */
    Status = "status",
    /** Filter Custom Action Triggers by trigger_definition_id */
    TriggerDefinitionId = "trigger_definition_id",
    /** Filter Custom Action Triggers by user_id */
    UserId = "user_id",
}

/** Input to be used to filter types. */
export type CustomActionsTriggerEventFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: CustomActionsTriggerEventFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for Custom Action Trigger Events. */
export enum CustomActionsTriggerEventSortEnum {
    /** Order by `action_name` ascending. */
    ActionNameAsc = "action_name_ASC",
    /** Order by `action_name` descending. */
    ActionNameDesc = "action_name_DESC",
    /** Order by `created_at` ascending. */
    CreatedAtAsc = "created_at_ASC",
    /** Order by `created_at` descending. */
    CreatedAtDesc = "created_at_DESC",
    /** Order by `status` ascending. */
    StatusAsc = "status_ASC",
    /** Order by `status` descending. */
    StatusDesc = "status_DESC",
    /** Order by `user_name` ascending. */
    UserNameAsc = "user_name_ASC",
    /** Order by `user_name` descending. */
    UserNameDesc = "user_name_DESC",
}

/** The status of the custom action trigger event. */
export enum CustomActionsTriggerEventStatusEnum {
    /** The action failed to complete. */
    Failure = "FAILURE",
    /** A result has not been determined. */
    Pending = "PENDING",
    /** The action completed succesfully. */
    Success = "SUCCESS",
}

/** Inputs that specify the trigger definition to invoke, the user that invoked it, and what object it is invoked on. */
export type CustomActionsTriggerInvokeInput = {
    /** The ID of the object to perform the custom action on. */
    readonly associatedObjectId: InputMaybe<Scalars["ID"]>;
    /** Additional details provided for a specific invocation of this Custom Action. */
    readonly manualInputs: InputMaybe<Scalars["JSON"]>;
    /** The trigger definition to invoke. */
    readonly triggerDefinition: IdentifierInput;
};

/** Specifies the input fields used in the `customActionsWebhookActionCreate` mutation. */
export type CustomActionsWebhookActionCreateInput = {
    /** The description that gets assigned to the Webhook Action you're creating. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** HTTP headers be passed along with your Webhook when triggered. */
    readonly headers: InputMaybe<Scalars["JSON"]>;
    /** HTTP used when the Webhook is triggered. Either POST or PUT. */
    readonly httpMethod: CustomActionsHttpMethodEnum;
    /** Template that can be used to generate a Webhook payload. */
    readonly liquidTemplate: InputMaybe<Scalars["String"]>;
    /** The name that gets assigned to the Webhook Action you're creating. */
    readonly name: Scalars["String"];
    /** The URL that you wish to send the Webhook to when triggered. */
    readonly webhookUrl: Scalars["String"];
};

/** Inputs that specify the details of a Webhook Action you wish to update */
export type CustomActionsWebhookActionUpdateInput = {
    /** The description that gets assigned to the Webhook Action you're creating. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** HTTP headers be passed along with your Webhook when triggered. */
    readonly headers: InputMaybe<Scalars["JSON"]>;
    /** HTTP used when the Webhook is triggered. Either POST or PUT. */
    readonly httpMethod: InputMaybe<CustomActionsHttpMethodEnum>;
    /** The ID of the Webhook Action you wish to update. */
    readonly id: Scalars["ID"];
    /** Template that can be used to generate a Webhook payload. */
    readonly liquidTemplate: InputMaybe<Scalars["String"]>;
    /** The name that gets assigned to the Webhook Action you're creating. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The URL that you wish to send the Webhook too when triggered. */
    readonly webhookUrl: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used in the `datadogCredentialsUpdate` mutation. */
export type DatadogCredentialsUpdateInput = {
    /** The API Key for the datadog integration. */
    readonly apiKey: Scalars["String"];
    /** The App Key for the datadog integration. */
    readonly appKey: Scalars["String"];
    /** The id of the datadog integration to update. */
    readonly integrationId: Scalars["ID"];
};

/** Specifies the input fields used to delete an entity. */
export type DeleteInput = {
    /** The id of the entity to be deleted. */
    readonly id: Scalars["ID"];
};

/** Sort possibilities for documents. */
export enum DocumentSortEnum {
    /** Order by `created_at` ascending */
    CreatedAtAsc = "created_at_ASC",
    /** Order by `created_at` descending */
    CreatedAtDesc = "created_at_DESC",
}

/** The type of the document. */
export enum DocumentTypeEnum {
    /** An API document */
    Api = "api",
    /** A tech document */
    Tech = "tech",
}

/** Specifies the input fields used in the `domainCreate` mutation. */
export type DomainCreateInput = {
    /** The description for the domain. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The name for the domain. */
    readonly name: Scalars["String"];
    /** Additional information about the domain. */
    readonly note: InputMaybe<Scalars["String"]>;
    /** The id of the owner for the domain. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used in the `domainUpdate` mutation. */
export type DomainUpdateInput = {
    /** The description for the domain. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The name for the domain. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the domain. */
    readonly note: InputMaybe<Scalars["String"]>;
    /** The id of the owner for the domain. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create an external issue. */
export type ExternalIssueCreateInput = {
    /** The ID of the check associated with this campaign. */
    readonly checkId: Scalars["ID"];
    /** The ID of the integration associated with this campaign. */
    readonly integrationId: Scalars["ID"];
    /** The ID of the service associated with this campaign. */
    readonly serviceId: Scalars["ID"];
};

/** Specifies the input used for modifying a resource's external UUID. */
export type ExternalUuidMutationInput = {
    /** The id of the resource. */
    readonly resourceId: Scalars["ID"];
};

/** Specifies the input fields used to create a filter. */
export type FilterCreateInput = {
    /** The logical operator to be used in conjunction with predicates. */
    readonly connective: InputMaybe<ConnectiveEnum>;
    /** The display name of the filter. */
    readonly name: Scalars["String"];
    /** The list of predicates used to select which services apply to the filter. */
    readonly predicates: InputMaybe<ReadonlyArray<FilterPredicateInput>>;
};

/** A condition that should be satisfied. */
export type FilterPredicateInput = {
    /** The condition key used by the predicate. */
    readonly key: PredicateKeyEnum;
    /** Additional data used by the predicate. This field is used by predicates with key = 'tags' to specify the tag key. For example, to create a predicate for services containing the tag 'db:mysql', set keyData = 'db' and value = 'mysql'. */
    readonly keyData: InputMaybe<Scalars["String"]>;
    /** The condition type used by the predicate. */
    readonly type: PredicateTypeEnum;
    /** The condition value used by the predicate. */
    readonly value: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to update a filter. */
export type FilterUpdateInput = {
    /** The logical operator to be used in conjunction with predicates. */
    readonly connective: InputMaybe<ConnectiveEnum>;
    /** The id of the filter. */
    readonly id: Scalars["ID"];
    /** The display name of the filter. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The list of predicates used to select which services apply to the filter. All existing predicates will be replaced by these predicates. */
    readonly predicates: InputMaybe<ReadonlyArray<FilterPredicateInput>>;
};

/** The time scale type for the frequency. */
export enum FrequencyTimeScale {
    /** Consider the time scale of days. */
    Day = "day",
    /** Consider the time scale of months. */
    Month = "month",
    /** Consider the time scale of weeks. */
    Week = "week",
    /** Consider the time scale of years. */
    Year = "year",
}

/** Available actions supported by the git forge integration. */
export enum GitForgeCapabilitiesTypeEnum {
    /** Integration supports cloning repositories. */
    CloneRepo = "clone_repo",
    /** Integration supports creating new merge requests. */
    CreateMergeRequest = "create_merge_request",
    /** Integration supports creating new repositories. */
    CreateRepo = "create_repo",
    /** Integration supports new content to be pushed to repositories. */
    PushNewContent = "push_new_content",
    /** Integration supports reading contents. */
    ReadContents = "read_contents",
    /** Integration can be searched via api. */
    SearchByApi = "search_by_api",
}

/** Parameters to create a merge request on an external GitForge repository */
export type GitForgesMergeRequestCreateInput = {
    /** The description of the merge request to create. */
    readonly description: Scalars["String"];
    /** The id of the repository to created the merge request on. */
    readonly repositoryId: Scalars["ID"];
    /** The source reference to create the merge request from. */
    readonly sourceReference: Scalars["String"];
    /** The target reference to create the merge request to. */
    readonly targetReference: Scalars["String"];
    /** The title of the merge request to create. */
    readonly title: Scalars["String"];
};

/** Parameters to find or create an external Git Repository and the associated OpsLevel Repository. */
export type GitForgesRepositoryFindOrCreateInput = {
    /** The id of the integration used to create the Git Repository */
    readonly integrationId: Scalars["ID"];
    /** The name of the new repository */
    readonly name: Scalars["String"];
    /** The organization to create the new repository in (only used for some GitForges) */
    readonly organization: InputMaybe<Scalars["String"]>;
    /** The project to create the new repository in (only used for some GitForges) */
    readonly project: InputMaybe<Scalars["String"]>;
};

/** Fields that can be used as part of filters for groups. */
export enum GroupFilterEnum {
    /** Filter by `parent` field */
    ParentId = "parent_id",
}

/** Input to be used to filter types. */
export type GroupFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: GroupFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Specifies the input fields used to create and update a group. */
export type GroupInput = {
    /** The description of the group. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The external UUID of this group. */
    readonly externalUuid: InputMaybe<Scalars["String"]>;
    /** The users who are members of the group. */
    readonly members: InputMaybe<ReadonlyArray<MemberInput>>;
    /** The name of the group. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The parent of the group */
    readonly parent: InputMaybe<IdentifierInput>;
    /** The teams where this group is the direct parent. */
    readonly teams: InputMaybe<ReadonlyArray<IdentifierInput>>;
};

/** Sort possibilities for groups. */
export enum GroupSortEnum {
    /** Order by `name` ascending */
    NameAsc = "name_ASC",
    /** Order by `name` descending */
    NameDesc = "name_DESC",
}

/** The subtype of the document. */
export enum HasDocumentationSubtypeEnum {
    /** Document is an OpenAPI document. */
    Openapi = "openapi",
}

/** The type of the document. */
export enum HasDocumentationTypeEnum {
    /** Document is an API document. */
    Api = "api",
    /** Document is an Tech document. */
    Tech = "tech",
}

/** Specifies the input fields used to identify a resource. */
export type IdentifierInput = {
    /** The human-friendly, unique identifier for the resource. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The id of the resource. */
    readonly id: InputMaybe<Scalars["ID"]>;
};

export enum IntegrationCategoryEnum {
    /** Alerts */
    Alerts = "alerts",
    /** Checks */
    Checks = "checks",
    /** CI / CD */
    CiCd = "ci_cd",
    /** Code Quality */
    CodeQuality = "code_quality",
    /** Communication */
    Communication = "communication",
    /** Custom */
    Custom = "custom",
    /** Documentation */
    Documentation = "documentation",
    /** Error Tracking */
    ErrorTracking = "error_tracking",
    /** Git */
    Git = "git",
    /** Incident Management */
    IncidentManagement = "incident_management",
    /** Infrastructure */
    Infrastructure = "infrastructure",
    /** Issue Tracking */
    IssueTracking = "issue_tracking",
    /** Observability */
    Observability = "observability",
    /** Security */
    Security = "security",
    /** User Management */
    UserManagement = "user_management",
}

/** Integration credential token types. */
export enum IntegrationCredentialEnum {
    /** The integration's API key. */
    ApiKey = "api_key",
    /** The integration's app key. */
    AppKey = "app_key",
}

/** Specifies the input fields used in the `integrationCredentialUpdate` mutation. */
export type IntegrationCredentialUpdateInput = {
    /** The id of the integration. */
    readonly id: Scalars["ID"];
    /** The credential type to update. */
    readonly name: IntegrationCredentialEnum;
    /** The credential value to be updated. */
    readonly token: Scalars["String"];
};

export type IntegrationDeauthInput = {
    /** translation missing: en.graphql.types.integration_deauth_input.force */
    readonly force: InputMaybe<Scalars["Boolean"]>;
    /** The id of the integration. */
    readonly id: Scalars["ID"];
};

export type IntegrationDeleteInput = {
    /** The id of the integration. */
    readonly id: Scalars["ID"];
};

export type IntegrationGroupAssignInput = {
    /** The id of the group. */
    readonly groupId: Scalars["String"];
    /** The id of the integration. */
    readonly id: Scalars["ID"];
};

/** Sort possibilities for integrations. */
export enum IntegrationSortEnum {
    /** Order by `name` ascending. */
    NameAsc = "name_ASC",
    /** Order by `name` descending. */
    NameDesc = "name_DESC",
}

export type IntegrationSyncAlertSourcesInput = {
    /** The id of the integration. */
    readonly id: Scalars["ID"];
};

export type IntegrationSyncReposInput = {
    /** The id of the integration. */
    readonly id: Scalars["ID"];
};

export type IntegrationUpdateInput = {
    /** The publicly routable URL where the integration can be accessed. */
    readonly baseUrl: InputMaybe<Scalars["String"]>;
    /** The id of the integration. */
    readonly id: Scalars["ID"];
    /** The name of the integration. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The notification channel of the integration. */
    readonly notificationChannel: InputMaybe<Scalars["String"]>;
    /** Indicates if OpsLevel will create service suggestions by analyzing the repos of the integration (only available for git integrations). */
    readonly serviceDiscoveryEnabled: InputMaybe<Scalars["Boolean"]>;
    /** Indicates if OpsLevel will manage Datadog monitor webhooks automatically. Set to false in such cases where you Datadog monitors are managed through config as code, the API, or if you want to manage them manually. Setting this to false will require you to manually add the OpsLevel webhook to your Datadog monitor message. */
    readonly setWebhooksOnMonitors: InputMaybe<Scalars["Boolean"]>;
};

/** The integration credential type to validate. */
export enum IntegrationValidateCredentialsTypeEnum {
    /** Validate a GitHub Personal Access Token. Required options: baseUrl, token. */
    GithubPersonalAccessToken = "GITHUB_PERSONAL_ACCESS_TOKEN",
    /** Validate a GitLab Personal Access Token. Required options: baseUrl, name, token. */
    GitlabPersonalAccessToken = "GITLAB_PERSONAL_ACCESS_TOKEN",
}

/** Specifies the input fields used to create a level. The new level will be added as the highest level (greatest level index). */
export type LevelCreateInput = {
    /** The description of the level. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** an integer allowing this level to be inserted between others. Must be unique per Rubric. */
    readonly index: InputMaybe<Scalars["Int"]>;
    /** The display name of the level. */
    readonly name: Scalars["String"];
};

/** Specifies the input fields used to delete a level. */
export type LevelDeleteInput = {
    /** The id of the level to be deleted. */
    readonly id: Scalars["ID"];
};

/** Specifies the input fields used to update a level. */
export type LevelUpdateInput = {
    /** The description of the level. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The id of the level to be updated. */
    readonly id: Scalars["ID"];
    /** The display name of the level. */
    readonly name: InputMaybe<Scalars["String"]>;
};

/** Defines a frequency for the check update. */
export type ManualCheckFrequencyInput = {
    /** The time scale type for the frequency. */
    readonly frequencyTimeScale: FrequencyTimeScale;
    /** The value to be used together with the frequency scale. */
    readonly frequencyValue: Scalars["Int"];
    /** The date that the check will start to evaluate. */
    readonly startingDate: Scalars["ISO8601DateTime"];
};

/** Defines a frequency for the check update. */
export type ManualCheckFrequencyUpdateInput = {
    /** The time scale type for the frequency. */
    readonly frequencyTimeScale: InputMaybe<FrequencyTimeScale>;
    /** The value to be used together with the frequency scale. */
    readonly frequencyValue: InputMaybe<Scalars["Int"]>;
    /** The date that the check will start to evaluate. */
    readonly startingDate: InputMaybe<Scalars["ISO8601DateTime"]>;
};

/** Input for specifiying members on a group. */
export type MemberInput = {
    /** The user's email. */
    readonly email: Scalars["String"];
};

/** Possible notification channels. */
export enum NotificationChannelTypeEnum {
    /** Send the notification through email. */
    Email = "email",
    /** Send the notification through slack. */
    Slack = "slack",
}

/** Sort possibilities for on calls. */
export enum OnCallSortEnum {
    /** Sort by `external_email` ascending. */
    ExternalEmailAsc = "external_email_ASC",
    /** Sort by `external_email` descending. */
    ExternalEmailDesc = "external_email_DESC",
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
}

/** Fields that can be used as part of filters for payloads. */
export enum PayloadFilterEnum {
    /** Filter by `integration` field. Note that this is an internal id, ex. "123". */
    IntegrationId = "integration_id",
}

/** Input to be used to filter types. */
export type PayloadFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: PayloadFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for payloads. */
export enum PayloadSortEnum {
    /** Order by `created_at` ascending */
    CreatedAtAsc = "created_at_ASC",
    /** Order by `created_at` descending */
    CreatedAtDesc = "created_at_DESC",
    /** Order by `processed_at` ascending */
    ProcessedAtAsc = "processed_at_ASC",
    /** Order by `processed_at` descending */
    ProcessedAtDesc = "processed_at_DESC",
}

/** A condition that should be satisfied. */
export type PredicateInput = {
    /** The condition type used by the predicate. */
    readonly type: PredicateTypeEnum;
    /** The condition value used by the predicate. */
    readonly value: InputMaybe<Scalars["String"]>;
};

/** Fields that can be used as part of filter for services. */
export enum PredicateKeyEnum {
    /** Filter by the creation source. */
    CreationSource = "creation_source",
    /** Filter by `framework` field */
    Framework = "framework",
    /** Filter by group hierarchy. Will return resources who's owner is in the group ancestry chain. */
    GroupIds = "group_ids",
    /** Filter by `language` field */
    Language = "language",
    /** Filter by `lifecycle` field */
    LifecycleIndex = "lifecycle_index",
    /** Filter by `name` field */
    Name = "name",
    /** Filter by `owner` field */
    OwnerId = "owner_id",
    /** Filter by `product` field */
    Product = "product",
    /** Filter by `tags` field. */
    Tags = "tags",
    /** Filter by `tier` field */
    TierIndex = "tier_index",
}

/** Operations that can be used on predicates. */
export enum PredicateTypeEnum {
    /** Belongs to a group's hierarchy. */
    BelongsTo = "belongs_to",
    /** Contains a specific value. */
    Contains = "contains",
    /** Does not contain a specific value. */
    DoesNotContain = "does_not_contain",
    /** Does not equal a specific value. */
    DoesNotEqual = "does_not_equal",
    /** Specific attribute does not exist. */
    DoesNotExist = "does_not_exist",
    /** Ends with a specific value. */
    EndsWith = "ends_with",
    /** Equals a specific value. */
    Equals = "equals",
    /** Specific attribute exists. */
    Exists = "exists",
    /** Greater than or equal to a specific value (numeric only). */
    GreaterThanOrEqualTo = "greater_than_or_equal_to",
    /** Less than or equal to a specific value (numeric only). */
    LessThanOrEqualTo = "less_than_or_equal_to",
    /** Matches a value using a regular expression. */
    MatchesRegex = "matches_regex",
    /** Satisfies an expression defined in jq. */
    SatisfiesJqExpression = "satisfies_jq_expression",
    /** Satisfies version constraint (tag value only). */
    SatisfiesVersionConstraint = "satisfies_version_constraint",
    /** Starts with a specific value. */
    StartsWith = "starts_with",
}

/** A condition that should be satisfied. */
export type PredicateUpdateInput = {
    /** The condition type used by the predicate. */
    readonly type: InputMaybe<PredicateTypeEnum>;
    /** The condition value used by the predicate. */
    readonly value: InputMaybe<Scalars["String"]>;
};

export enum ProvisionedByEnum {
    ApiCli = "api_cli",
    ApiOther = "api_other",
    ApiTerraform = "api_terraform",
    IntegrationScim = "integration_scim",
    SsoOkta = "sso_okta",
    SsoOther = "sso_other",
    Unknown = "unknown",
    User = "user",
}

/** Specifies the input fields used to bulk update repositories. */
export type RepositoryBulkUpdateInput = {
    /** List of ids of the repository to be updated. */
    readonly ids: ReadonlyArray<Scalars["ID"]>;
    /** The team that owns the repository. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Indicates if the repository is visible. */
    readonly visible: InputMaybe<Scalars["Boolean"]>;
};

/** Fields that can be used as part of filter for repositories. */
export enum RepositoryFilterEnum {
    /** Filter by the integration. */
    Integration = "integration",
    /** Filter by `owner` field. */
    Owner = "owner",
    /** Filter by repository visibility. */
    Visible = "visible",
}

/** Input to be used to filter types. */
export type RepositoryFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: RepositoryFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for repositories. */
export enum RepositorySortEnum {
    /** Sort by `createdOn` ascending. */
    CreatedOnAsc = "created_on_ASC",
    /** Sort by `createdOn` descending. */
    CreatedOnDesc = "created_on_DESC",
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
    /** Sort by `organization` ascending. */
    OrganizationAsc = "organization_ASC",
    /** Sort by `organization` descending. */
    OrganizationDesc = "organization_DESC",
    /** Sort by `owner` ascending. */
    OwnerAsc = "owner_ASC",
    /** Sort by `owner` descending. */
    OwnerDesc = "owner_DESC",
}

/** Specifies the input fields used to update a repository. */
export type RepositoryUpdateInput = {
    /** The id of the repository to be updated. */
    readonly id: Scalars["ID"];
    /** The team that owns the repository. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The index of software tier that the repository belongs to. */
    readonly tierIndex: InputMaybe<Scalars["Int"]>;
    /** Indicates if the repository is visible. */
    readonly visible: InputMaybe<Scalars["Boolean"]>;
};

/** Possible visibility levels for repositories. */
export enum RepositoryVisibilityEnum {
    /** Repositories that are only accessible to organization users. */
    Internal = "INTERNAL",
    /** Repositories that are private to the user. */
    Private = "PRIVATE",
    /** Repositories that are publically accessible. */
    Public = "PUBLIC",
}

/** Status of a document on a resource. */
export enum ResourceDocumentStatusTypeEnum {
    /** Document is hidden */
    Hidden = "hidden",
    /** Document is pinned */
    Pinned = "pinned",
    /** Document is visible */
    Visible = "visible",
}

/** Specifies the input fields used in the `resourceDocumentStatusUpdate` mutation. */
export type ResourceDocumentStatusUpdateInput = {
    /** The document id of the document portion of the ResourceDocument */
    readonly documentId: Scalars["ID"];
    /** The resourece (currently on service) identifier for the resource portion of the ResourceDocument. */
    readonly resource: IdentifierInput;
    /** The status to update for the ResourceDocument. */
    readonly status: ResourceDocumentStatusTypeEnum;
};

/** Input to be used to update a rubric. */
export type RubricUpdateInput = {
    /** The description of the rubric. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The ID of the rubric to be updated. */
    readonly id: Scalars["ID"];
    /** The display name of the rubric. */
    readonly name: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to append a log chunk to a runnerJob's logs. */
export type RunnerAppendJobLogInput = {
    /** The contents of the log to append */
    readonly logChunk: ReadonlyArray<Scalars["String"]>;
    /** The runner id. */
    readonly runnerId: Scalars["ID"];
    /** The job id. */
    readonly runnerJobId: Scalars["ID"];
    /** The runner-specified timestamp that the log chunk was sent */
    readonly sentAt: Scalars["ISO8601DateTime"];
};

/** The runner job outcome. */
export enum RunnerJobOutcomeEnum {
    /** Job was blackholed and not allowed to run. */
    Blackholed = "blackholed",
    /** Job was canceled. */
    Canceled = "canceled",
    /** Job run took too long to complete, and was marked as failed. */
    ExecutionTimeout = "execution_timeout",
    /** Job failed during execution. */
    Failed = "failed",
    /** A pod could not be scheduled for the job in time. */
    PodTimeout = "pod_timeout",
    /** Job was not assigned to a runner for too long. */
    QueueTimeout = "queue_timeout",
    /** Job succeded the execution. */
    Success = "success",
    /** Job was not started yet. */
    Unstarted = "unstarted",
}

/** A outcome variable assigned by the job */
export type RunnerJobOutcomeVariable = {
    /** The name of the variable */
    readonly key: Scalars["String"];
    /** The value of the variable */
    readonly value: Scalars["String"];
};

/** The runner job status */
export enum RunnerJobStatusEnum {
    /** A finished runner job. */
    Complete = "complete",
    /** A created runner job, but not yet ready to be run. */
    Created = "created",
    /** A runner job ready to be run. */
    Pending = "pending",
    /** A runner job being run by a runner. */
    Running = "running",
}

/** Specifies the input fields used to report a runner job outcome. */
export type RunnerReportJobOutcomeInput = {
    /** The job outcome. */
    readonly outcome: RunnerJobOutcomeEnum;
    /** Any specific variables assigned by the job process. */
    readonly outcomeVariables: InputMaybe<ReadonlyArray<RunnerJobOutcomeVariable>>;
    /** The runner id. */
    readonly runnerId: Scalars["ID"];
    /** The job id. */
    readonly runnerJobId: Scalars["ID"];
};

/** The account scope for an OpsLevel Runner. */
export enum RunnerScopeTypeEnum {
    /** Only runs OpsLevel Runner Jobs from the parent account. */
    AccountOwned = "account_owned",
    /** Runs OpsLevel Runner Jobs from multiple accounts. */
    Shared = "shared",
}

/** The status of an OpsLevel runner. */
export enum RunnerStatusTypeEnum {
    /** The runner will not actively take jobs. */
    Inactive = "inactive",
    /** The runner will process jobs. */
    Registered = "registered",
}

/** Specifies the input fields used in the `serviceCreate` mutation. */
export type ServiceCreateInput = {
    /** A brief description of the service. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The primary software development framework that the service uses. */
    readonly framework: InputMaybe<Scalars["String"]>;
    /** The primary programming language that the service is written in. */
    readonly language: InputMaybe<Scalars["String"]>;
    /** The lifecycle stage of the service. */
    readonly lifecycleAlias: InputMaybe<Scalars["String"]>;
    /** The display name of the service. */
    readonly name: Scalars["String"];
    /** The team that owns the service. */
    readonly ownerAlias: InputMaybe<Scalars["String"]>;
    /** The parent system for the service. */
    readonly parent: InputMaybe<IdentifierInput>;
    /** A product is an application that your end user interacts with. Multiple services can work together to power a single product. */
    readonly product: InputMaybe<Scalars["String"]>;
    /** A list of repositories that are linked to the service. */
    readonly repositories: InputMaybe<ReadonlyArray<Scalars["ID"]>>;
    /** Allows for the creation of a service with invalid aliases. */
    readonly skipAliasesValidation: InputMaybe<Scalars["Boolean"]>;
    /** The software tier that the service belongs to. */
    readonly tierAlias: InputMaybe<Scalars["String"]>;
};

/** Types of sources from which Services can be created. */
export enum ServiceCreationSourceEnum {
    /** Service created by OpsLevel. */
    RepositoryAnalysis = "repository_analysis",
}

/** Specifies the input fields used in the `serviceDelete` mutation. */
export type ServiceDeleteInput = {
    /** The alias of the service to be deleted. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The id of the service to be deleted. */
    readonly id: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used in the `serviceDependenciesAssign` mutation. */
export type ServiceDependenciesAssignInput = {
    /** A collection of dependency input objects identifying the dependencies to be created. */
    readonly edgeInputs: ReadonlyArray<ServiceDependencyCreateInput>;
};

/** Specifies the input fields used in the `serviceDependenciesDelete` mutation. */
export type ServiceDependenciesDeleteInput = {
    /** A collection of source, destination pairs identifying the dependencies to be deleted. */
    readonly dependencyKeys: ReadonlyArray<ServiceDependencyKey>;
};

/** Specifies the input fields used for creating a service dependency. */
export type ServiceDependencyCreateInput = {
    /** A source, destination pair specifying a dependency between services. */
    readonly dependencyKey: ServiceDependencyKey;
    /** Notes for service dependency. */
    readonly notes: InputMaybe<Scalars["String"]>;
};

/** A source, destination pair specifying a dependency between services. */
export type ServiceDependencyKey = {
    /** The ID or alias identifier of the service that is depended upon. */
    readonly destinationIdentifier: InputMaybe<IdentifierInput>;
    /** The ID or alias identifier of the service with the dependency. */
    readonly sourceIdentifier: InputMaybe<IdentifierInput>;
};

/** Valid type indicators for Service Discoveer */
export enum ServiceDetectionIntegrationEnum {
    /** Azure DevOps integrations */
    AzureDevops = "AZURE_DEVOPS",
    /** BitBucket integrations */
    Bitbucket = "BITBUCKET",
    /** Datadog integrations */
    Datadog = "DATADOG",
    /** Github integrations */
    Github = "GITHUB",
    /** Gitlab integrations */
    Gitlab = "GITLAB",
    /** OpsGenie integrations */
    Opsgenie = "OPSGENIE",
    /** Pagerduty integrations */
    Pagerduty = "PAGERDUTY",
}

/** Fields that can be used as part of filter for services. */
export enum ServiceFilterEnum {
    /** Filter by `alert status` field */
    AlertStatus = "alert_status",
    /** Filter by the creation source. */
    CreationSource = "creation_source",
    /** Filter by Domain that includes the System this service is assigned to, if any. */
    DomainId = "domain_id",
    /** Filter by `framework` field */
    Framework = "framework",
    /** Filter by group hierarchy. Will return resources who's owner is in the group ancestry chain. */
    GroupIds = "group_ids",
    /** Filter by `language` field */
    Language = "language",
    /** Filter by `level` field */
    LevelIndex = "level_index",
    /** Filter by `lifecycle` field */
    LifecycleIndex = "lifecycle_index",
    /** Filter by `name` field */
    Name = "name",
    /** Filter by `owner` field */
    OwnerId = "owner_id",
    /** Filter by `product` field */
    Product = "product",
    /** Filter by System that this service is assigned to, if any. */
    SystemId = "system_id",
    /** Filter by `tag` field */
    Tag = "tag",
    /** Filter by `tier` field */
    TierIndex = "tier_index",
}

/** Input to be used to filter types. */
export type ServiceFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** The logical operator to be used in conjunction with multiple filters (requires predicates to be supplied). */
    readonly connective: InputMaybe<ConnectiveEnum>;
    /** Field to be filtered. */
    readonly key: InputMaybe<ServiceFilterEnum>;
    /** A list of service filter input. */
    readonly predicates: InputMaybe<ReadonlyArray<ServiceFilterInput>>;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<TypeEnum>;
};

/** Inputs to specify details of template to use when creating a new service, and also metadata about the service being created. */
export type ServiceFromTemplateCreateInput = {
    /** The primary software development framework of the service being created. */
    readonly framework: InputMaybe<Scalars["String"]>;
    /** ID of the git forge integration that will host the new repository. */
    readonly integrationId: InputMaybe<Scalars["ID"]>;
    /** The programming language of the service being created. */
    readonly language: InputMaybe<Scalars["String"]>;
    /** Name of the organization for the new repository (only used by select GitForges) */
    readonly organizationName: InputMaybe<Scalars["String"]>;
    /** ID of team that owns the service being created. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** Name of the project for the new repository (only used by select GitForges) */
    readonly projectName: InputMaybe<Scalars["String"]>;
    /** Name of the created repository. */
    readonly repositoryName: InputMaybe<Scalars["String"]>;
    /** The description of the service being created. */
    readonly serviceDescription: InputMaybe<Scalars["String"]>;
    /** The name to to use to represent the service within OpsLevel after it has been succesfully generated. */
    readonly serviceName: Scalars["String"];
    /** List of input values for the template's variables. */
    readonly serviceTemplateVariableValues: ReadonlyArray<ServiceTemplateVariableValueInput>;
    /** The commit SHA of the template repo representing the version of the template to use. */
    readonly templateRepoCommit: Scalars["String"];
    /** URL to template config file (usually 'cookiecutter.json') in the repo containing the service template. */
    readonly templateRepoUrl: Scalars["String"];
};

/** Specifies the input fields used in the `serviceNoteUpdate` mutation. */
export type ServiceNoteUpdateInput = {
    /** Note about the service. */
    readonly note: InputMaybe<Scalars["String"]>;
    /** The identifier for the service. */
    readonly service: IdentifierInput;
};

/** Properties of services that can be validated. */
export enum ServicePropertyTypeEnum {
    /** The description of a service. */
    Description = "description",
    /** The primary software development framework of a service. */
    Framework = "framework",
    /** The primary programming language of a service. */
    Language = "language",
    /** The index of the lifecycle a service belongs to. */
    LifecycleIndex = "lifecycle_index",
    /** The name of a service. */
    Name = "name",
    /** Additional information about the service. */
    Note = "note",
    /** The product that is associated with a service. */
    Product = "product",
    /** The index of the tier a service belongs to. */
    TierIndex = "tier_index",
}

/** Specifies the input fields used in the `serviceRepositoryCreate` mutation. */
export type ServiceRepositoryCreateInput = {
    /** The directory in the repository containing opslevel.yml. */
    readonly baseDirectory: InputMaybe<Scalars["String"]>;
    /** The name displayed in the UI for the service repository. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The identifier for the repository. */
    readonly repository: IdentifierInput;
    /** The identifier for the service. */
    readonly service: IdentifierInput;
};

/** Specifies the input fields used to update a service repository. */
export type ServiceRepositoryUpdateInput = {
    /** The directory in the repository containing opslevel.yml. */
    readonly baseDirectory: InputMaybe<Scalars["String"]>;
    /** The name displayed in the UI for the service repository. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The ID of the service repository to be updated. */
    readonly id: Scalars["ID"];
};

/** Sort possibilities for services. */
export enum ServiceSortEnum {
    /** Sort by alert status ascending. */
    AlertStatusAsc = "alert_status_ASC",
    /** Sort by alert status descending. */
    AlertStatusDesc = "alert_status_DESC",
    /** Sort by `checks_passing` ascending. */
    ChecksPassingAsc = "checks_passing_ASC",
    /** Sort by `checks_passing` descending. */
    ChecksPassingDesc = "checks_passing_DESC",
    /** Sort by last deploy time ascending. */
    LastDeployAsc = "last_deploy_ASC",
    /** Sort by last deploy time descending. */
    LastDeployDesc = "last_deploy_DESC",
    /** Sort by level ascending. */
    LevelIndexAsc = "level_index_ASC",
    /** Sort by level descending. */
    LevelIndexDesc = "level_index_DESC",
    /** Sort by lifecycle ascending. */
    LifecycleAsc = "lifecycle_ASC",
    /** Sort by lifecycle descending. */
    LifecycleDesc = "lifecycle_DESC",
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
    /** Sort by `owner` ascending. */
    OwnerAsc = "owner_ASC",
    /** Sort by `owner` descending. */
    OwnerDesc = "owner_DESC",
    /** Sort by `product` ascending. */
    ProductAsc = "product_ASC",
    /** Sort by `product` descending. */
    ProductDesc = "product_DESC",
    /** Alias to sort by `checks_passing` ascending. */
    ServiceStatAsc = "service_stat_ASC",
    /** Alias to sort by `checks_passing` descending. */
    ServiceStatDesc = "service_stat_DESC",
    /** Sort by `tier` ascending. */
    TierAsc = "tier_ASC",
    /** Sort by `tier` descending. */
    TierDesc = "tier_DESC",
}

/** Inputs to specify details of template to use when creating a new service. */
export type ServiceTemplateCreateInput = {
    /** The description of the service template. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The primary software development framework that the service template uses. */
    readonly framework: InputMaybe<Scalars["String"]>;
    /** The primary programming language that the service template is written in. */
    readonly language: InputMaybe<Scalars["String"]>;
    /** The name of the service template */
    readonly name: InputMaybe<Scalars["String"]>;
    /** ID of the owner of the service template being created. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** URL to template config file (usually 'cookiecutter.json') in the repo containing the service template. */
    readonly templateRepoUrl: Scalars["String"];
};

/** The status of the ServiceTemplateRun attempt. */
export enum ServiceTemplateRunStatusEnum {
    /** The ServiceTemplateRun attempt failed in creating a new service from the service template. */
    Failed = "failed",
    /** The ServiceTemplateRun is currently running. */
    InProgress = "in_progress",
    /** The ServiceTemplateRun attempt succeeded in creating a new service from the service template. */
    Success = "success",
    /** The ServiceTemplateRun to create the new service has not started yet. */
    Unstarted = "unstarted",
}

/** Inputs to specify new value to update a service template. */
export type ServiceTemplateUpdateInput = {
    /** The description of the service template. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The primary software development framework that the service template uses. */
    readonly framework: InputMaybe<Scalars["String"]>;
    /** ID of the service template to update. */
    readonly id: Scalars["ID"];
    /** The primary programming language that the service template is written in. */
    readonly language: InputMaybe<Scalars["String"]>;
    /** The new name of the service template. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** ID of the owner of the service template. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
};

/** Value of template variable to use in generating a service from a template. */
export type ServiceTemplateVariableValueInput = {
    /** The name of the service template variable. */
    readonly name: Scalars["String"];
    /** The value for the named service template variable. */
    readonly value: Scalars["String"];
};

/** Specifies the input fields used in the `serviceTemplateVariablesParse` mutation. */
export type ServiceTemplateVariablesParseInput = {
    readonly url: Scalars["String"];
};

/** Specifies the input fields used in the `serviceUpdate` mutation. */
export type ServiceUpdateInput = {
    /** The alias of the service to be updated. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** A brief description of the service. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The primary software development framework that the service uses. */
    readonly framework: InputMaybe<Scalars["String"]>;
    /** The id of the service to be updated. */
    readonly id: InputMaybe<Scalars["ID"]>;
    /** The primary programming language that the service is written in. */
    readonly language: InputMaybe<Scalars["String"]>;
    /** The lifecycle stage of the service. */
    readonly lifecycleAlias: InputMaybe<Scalars["String"]>;
    /** The display name of the service. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The team that owns the service. */
    readonly ownerAlias: InputMaybe<Scalars["String"]>;
    /** The parent system for the service. */
    readonly parent: InputMaybe<IdentifierInput>;
    /** A product is an application that your end user interacts with. Multiple services can work together to power a single product. */
    readonly product: InputMaybe<Scalars["String"]>;
    /** Allows updating a service with invalid aliases. */
    readonly skipAliasesValidation: InputMaybe<Scalars["Boolean"]>;
    /** The software tier that the service belongs to. */
    readonly tierAlias: InputMaybe<Scalars["String"]>;
};

/** translation missing: en.graphql.types.subscriber_type_enum.self */
export enum SubscriberTypeEnum {
    /** translation missing: en.graphql.types.subscriber_type_enum.service */
    Service = "service",
    /** translation missing: en.graphql.types.subscriber_type_enum.user */
    User = "user",
}

/** Specifies the input fields used in the `subscriptionCreate` mutation. */
export type SubscriptionCreateInput = {
    /** translation missing: en.graphql.types.subscription_create_input.external_address */
    readonly externalAddress: InputMaybe<Scalars["String"]>;
    /** How the notification should be sent to the subscriber. */
    readonly notificationChannelType: NotificationChannelTypeEnum;
    /** The identifier for the notification that is being subscribed to. */
    readonly notificationId: Scalars["ID"];
    /** The identifier for the subscriber. */
    readonly subscriberId: Scalars["ID"];
};

/** Input for actioning suggestions. */
export type SuggestionActionInput = {
    /** input for actioning a suggestion. */
    readonly suggestions: ReadonlyArray<SuggestionInput>;
};

/** Possible actions. */
export enum SuggestionActionTypeEnum {
    /** Attach the given alias to a service. */
    AttachAlias = "attach_alias",
    /** Attach historical events to the service for the given alias. */
    AttachHistoricalEvents = "attach_historical_events",
    /** Create a service with the given alias as the service name. */
    CreateService = "create_service",
    /** Create a service from an alert source. */
    CreateServiceFromAlertSource = "create_service_from_alert_source",
    /** Create a service from a repository. */
    CreateServiceFromRepository = "create_service_from_repository",
    /** Ignore the suggestion. */
    Ignored = "ignored",
    /** Unignore the suggestion. */
    Unignored = "unignored",
}

/** Fields that can be used as part of a filter for suggestion activity. */
export enum SuggestionActivityFilterEnum {
    /** Filter by `action` field. */
    Action = "action",
    /** Filter by `type` field. */
    Type = "type",
    /** Filter by `user` field. */
    User = "user",
    /** Filter by `value` field. */
    Value = "value",
}

/** Input to be used to filter types. */
export type SuggestionActivityFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: SuggestionActivityFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Fields that can be used to sort suggestion activity. */
export enum SuggestionActivitySortEnum {
    /** Order by `action` ascending. */
    ActionAsc = "action_ASC",
    /** Order by `action` descending. */
    ActionDesc = "action_DESC",
    /** Order by `created_at` ascending. */
    CreatedAtAsc = "created_at_ASC",
    /** Order by `created_at` descending. */
    CreatedAtDesc = "created_at_DESC",
    /** Order by `value` ascending. */
    ValueAsc = "value_ASC",
    /** Order by `value` descending. */
    ValueDesc = "value_DESC",
}

/** Fields that can be used as part of filter for suggestions. */
export enum SuggestionFilterEnum {
    /** Filter by `ignored` field. */
    Ignored = "ignored",
    /** Filter by `type` field. */
    Type = "type",
}

/** Input to be used to filter types. */
export type SuggestionFilterInput = {
    /** Value to be filtered. */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** Field to be filtered. */
    readonly key: SuggestionFilterEnum;
    /** Type of operation to be applied to value on the field. */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Fields for actioning an suggestion. */
export type SuggestionInput = {
    /** The name of the service to create. Only needed for create type. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The alias to attach to a service. Only needed for attach type. */
    readonly serviceAlias: InputMaybe<Scalars["String"]>;
    /** The ID of the service to attach an alias to. Only needed for attach type. */
    readonly serviceId: InputMaybe<Scalars["String"]>;
    /** Whether this suggestion action type has changed from the original suggestion. */
    readonly suggestionActionModified: InputMaybe<Scalars["Boolean"]>;
    /** The ID of the suggestion being actioned. */
    readonly suggestionId: Scalars["String"];
    /** Whether this suggestion has been modified from the original suggestion. */
    readonly suggestionParamsModified: InputMaybe<Scalars["Boolean"]>;
    /** The type of action to perform. */
    readonly type: SuggestionActionTypeEnum;
};

/** Sort possibilities for suggestions. */
export enum SuggestionSortEnum {
    /** Order by `alias` ascending */
    AliasAsc = "alias_ASC",
    /** Order by `alias` descending */
    AliasDesc = "alias_DESC",
    /** translation missing: en.graphql.types.suggestion_sort_enum.created_at_asc */
    CreatedAtAsc = "created_at_ASC",
    /** translation missing: en.graphql.types.suggestion_sort_enum.created_at_desc */
    CreatedAtDesc = "created_at_DESC",
}

/** Specifies the input fields used to update a suggestion. */
export type SuggestionUpdateInput = {
    /** Whether the suggestion should be ignored or not. */
    readonly ignored: Scalars["Boolean"];
    /** The ids of the suggestions to be updated. */
    readonly suggestionIds: ReadonlyArray<Scalars["ID"]>;
};

/** Specifies the input fields used in the `systemCreate` mutation. */
export type SystemCreateInput = {
    /** The description for the system. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The name for the system. */
    readonly name: Scalars["String"];
    /** Additional information about the system. */
    readonly note: InputMaybe<Scalars["String"]>;
    /** The id of the owner for the system. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The parent domain for the system. */
    readonly parent: InputMaybe<IdentifierInput>;
};

/** Specifies the input fields used in the `systemUpdate` mutation. */
export type SystemUpdateInput = {
    /** The description for the system. */
    readonly description: InputMaybe<Scalars["String"]>;
    /** The name for the system. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** Additional information about the system. */
    readonly note: InputMaybe<Scalars["String"]>;
    /** The id of the owner for the system. */
    readonly ownerId: InputMaybe<Scalars["ID"]>;
    /** The parent domain for the system. */
    readonly parent: InputMaybe<IdentifierInput>;
};

/** Arguments used to query with a certain tag. */
export type TagArgs = {
    /** The key of a tag. */
    readonly key: InputMaybe<Scalars["String"]>;
    /** The value of a tag. */
    readonly value: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to assign tags. */
export type TagAssignInput = {
    /** The alias of the resource that tags will be added to. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The id of the resource that the tags will be assigned to. */
    readonly id: InputMaybe<Scalars["ID"]>;
    /** The desired tags to assign to the resource. */
    readonly tags: ReadonlyArray<TagInput>;
    /** The type of resource `alias` refers to, if `alias` is provided. */
    readonly type: InputMaybe<TaggableResource>;
};

/** Specifies the input fields used to create a tag. */
export type TagCreateInput = {
    /** The alias of the resource that this tag will be added to. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The id of the resource that this tag will be added to. */
    readonly id: InputMaybe<Scalars["ID"]>;
    /** The tag's key. */
    readonly key: Scalars["String"];
    /** The type of resource `alias` refers to, if `alias` is provided. */
    readonly type: InputMaybe<TaggableResource>;
    /** The tag's value. */
    readonly value: Scalars["String"];
};

/** Specifies the input fields used to delete a tag. */
export type TagDeleteInput = {
    /** The id of the tag to be deleted. */
    readonly id: Scalars["ID"];
};

/** Specifies the basic input fields used to construct a tag. */
export type TagInput = {
    /** The tag's key. */
    readonly key: Scalars["String"];
    /** The tag's value. */
    readonly value: Scalars["String"];
};

/** The object type assigned to the tag */
export enum TagOwnerTypeEnum {
    /** Tags that are assigned to domains. */
    Domain = "Domain",
    /** Tags that are assigned to repositories. */
    Repository = "Repository",
    /** Tags that are assigned to services. */
    Service = "Service",
    /** Tags that are assigned to systems. */
    System = "System",
    /** Tags that are assigned to teams. */
    Team = "Team",
}

/** Specifies the input fields used to update a tag. */
export type TagUpdateInput = {
    /** The id of the tag to be updated. */
    readonly id: Scalars["ID"];
    /** The tag's key. */
    readonly key: InputMaybe<Scalars["String"]>;
    /** The tag's value. */
    readonly value: InputMaybe<Scalars["String"]>;
};

/** Possible types to apply tags to. */
export enum TaggableResource {
    /** Used to identify a Repository. */
    Repository = "Repository",
    /** Used to identify a Service. */
    Service = "Service",
    /** Used to identify a Team. */
    Team = "Team",
}

/** Specifies the input fields used to create a team. */
export type TeamCreateInput = {
    /** The contacts for the team. */
    readonly contacts: InputMaybe<ReadonlyArray<ContactInput>>;
    /** The group this team belongs to. */
    readonly group: InputMaybe<IdentifierInput>;
    /** The email of the user who manages the team. */
    readonly managerEmail: InputMaybe<Scalars["String"]>;
    /** A set of emails that identify users in OpsLevel */
    readonly members: InputMaybe<ReadonlyArray<TeamMembershipUserInput>>;
    /** The team's display name. */
    readonly name: Scalars["String"];
    /** A description of what the team is responsible for. */
    readonly responsibilities: InputMaybe<Scalars["String"]>;
};

/** Specifies the input fields used to delete a team. */
export type TeamDeleteInput = {
    /** The alias of the team to be deleted. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The id of the team to be deleted. */
    readonly id: InputMaybe<Scalars["ID"]>;
};

/** Input for adding members to a team */
export type TeamMembershipCreateInput = {
    /** A set of emails that identify users in OpsLevel */
    readonly members: ReadonlyArray<TeamMembershipUserInput>;
    /** The ID of the team to add members */
    readonly teamId: Scalars["ID"];
};

/** Input for removing members from a team */
export type TeamMembershipDeleteInput = {
    /** A set of emails that identify users in OpsLevel */
    readonly members: ReadonlyArray<TeamMembershipUserInput>;
    /** The ID of the team to remove members from */
    readonly teamId: Scalars["ID"];
};

/** Input for specifiying members on a team */
export type TeamMembershipUserInput = {
    /** The user's email. */
    readonly email: Scalars["String"];
};

/** Sort possibilities for teams. */
export enum TeamSortEnum {
    /** Order by manager's name ascending. */
    ManagerAsc = "manager_ASC",
    /** Order by manager's name descending. */
    ManagerDesc = "manager_DESC",
    /** Order by `name` ascending */
    NameAsc = "name_ASC",
    /** Order by `name` descending */
    NameDesc = "name_DESC",
    /** Alias to sort by `checks_passing` ascending. */
    ServiceStatAsc = "service_stat_ASC",
    /** Alias to sort by `checks_passing` descending. */
    ServiceStatDesc = "service_stat_DESC",
}

/** Specifies the input fields used to update a team. */
export type TeamUpdateInput = {
    /** The alias of the team to be updated. */
    readonly alias: InputMaybe<Scalars["String"]>;
    /** The external UUID of this team. */
    readonly extenralUuid: InputMaybe<Scalars["String"]>;
    /** The group this team belongs to. */
    readonly group: InputMaybe<IdentifierInput>;
    /** The id of the team to be updated. */
    readonly id: InputMaybe<Scalars["ID"]>;
    /** The email of the user who manages the team. */
    readonly managerEmail: InputMaybe<Scalars["String"]>;
    /** A set of emails that identify users in OpsLevel */
    readonly members: InputMaybe<ReadonlyArray<TeamMembershipUserInput>>;
    /** The team's display name. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** A description of what the team is responsible for. */
    readonly responsibilities: InputMaybe<Scalars["String"]>;
};

/** The specific categories that a tool can belong to. */
export enum ToolCategory {
    /** Tools used for administrative purposes. */
    Admin = "admin",
    /** Tools used as API documentation for this service. */
    ApiDocumentation = "api_documentation",
    /** Tools used for tracking issues. */
    Backlog = "backlog",
    /** Tools used for source code. */
    Code = "code",
    /** Tools used for building/unit testing a service. */
    ContinuousIntegration = "continuous_integration",
    /** Tools used for deploying changes to a service. */
    Deployment = "deployment",
    /** Tools used for tracking/reporting errors. */
    Errors = "errors",
    /** Tools used for managing feature flags. */
    FeatureFlag = "feature_flag",
    /** Tools used for tracking/reporting the health of a service. */
    HealthChecks = "health_checks",
    /** Tools used to surface incidents on a service. */
    Incidents = "incidents",
    /** Tools used for tracking issues. */
    IssueTracking = "issue_tracking",
    /** Tools used for displaying logs from services. */
    Logs = "logs",
    /** Tools used for tracking/reporting service metrics. */
    Metrics = "metrics",
    /** Tools used for orchestrating a service. */
    Orchestrator = "orchestrator",
    /** Tools that do not fit into the available categories. */
    Other = "other",
    /** Tools used for testing the resiliency of a service. */
    Resiliency = "resiliency",
    /** Tools used for managing runbooks for a service. */
    Runbooks = "runbooks",
    /** Tools used for performing security scans. */
    SecurityScans = "security_scans",
    /** Tools used for reporting the status of a service. */
    StatusPage = "status_page",
    /** Tools used as a wiki for this service. */
    Wiki = "wiki",
}

/** Specifies the input fields used to create a tool. */
export type ToolCreateInput = {
    /** The category that the tool belongs to. */
    readonly category: ToolCategory;
    /** The display name of the tool. */
    readonly displayName: Scalars["String"];
    /** The environment that the tool belongs to. */
    readonly environment: InputMaybe<Scalars["String"]>;
    /** The alias of the service the tool will be assigned to. */
    readonly serviceAlias: InputMaybe<Scalars["String"]>;
    /** The id of the service the tool will be assigned to. */
    readonly serviceId: InputMaybe<Scalars["ID"]>;
    /** The URL of the tool. */
    readonly url: Scalars["String"];
};

/** Specifies the input fields used to delete a tool. */
export type ToolDeleteInput = {
    /** The id of the tool to be deleted. */
    readonly id: Scalars["ID"];
};

/** Specifies the input fields used to update a tool. */
export type ToolUpdateInput = {
    /** The category that the tool belongs to. */
    readonly category: InputMaybe<ToolCategory>;
    /** The display name of the tool. */
    readonly displayName: InputMaybe<Scalars["String"]>;
    /** The environment that the tool belongs to. */
    readonly environment: InputMaybe<Scalars["String"]>;
    /** The id of the tool to be updated. */
    readonly id: Scalars["ID"];
    /** The URL of the tool. */
    readonly url: InputMaybe<Scalars["String"]>;
};

/** Operations that can be used on filters. */
export enum TypeEnum {
    /** Belongs to a group's hierarchy. */
    BelongsTo = "belongs_to",
    /** Contains a specific value. */
    Contains = "contains",
    /** Does not contain a specific value. */
    DoesNotContain = "does_not_contain",
    /** Does not equal a specific value. */
    DoesNotEqual = "does_not_equal",
    /** Specific attribute does not exist. */
    DoesNotExist = "does_not_exist",
    /** Ends with a specific value. */
    EndsWith = "ends_with",
    /** Equals a specific value. */
    Equals = "equals",
    /** Specific attribute exists. */
    Exists = "exists",
    /** Greater than or equal to a specific value (numeric only). */
    GreaterThanOrEqualTo = "greater_than_or_equal_to",
    /** Less than or equal to a specific value (numeric only). */
    LessThanOrEqualTo = "less_than_or_equal_to",
    /** Matches a value using a regular expression. */
    MatchesRegex = "matches_regex",
    /** Satisfies version constraint (tag value only). */
    SatisfiesVersionConstraint = "satisfies_version_constraint",
    /** Starts with a specific value. */
    StartsWith = "starts_with",
}

/** Specifies the input fields used to identify a user. Exactly one field should be provided. */
export type UserIdentifierInput = {
    /** The email address of the user. */
    readonly email: InputMaybe<Scalars["String"]>;
    /** The ID of the user. */
    readonly id: InputMaybe<Scalars["ID"]>;
};

/** Specifies the input fields used to create and update a user. */
export type UserInput = {
    /** Whether or not the user is active. */
    readonly active: InputMaybe<Scalars["Boolean"]>;
    /** The name of the user. */
    readonly name: InputMaybe<Scalars["String"]>;
    /** The access role (e.g. user vs admin) of the user. */
    readonly role: InputMaybe<UserRole>;
};

/** A role that can be assigned to a user. */
export enum UserRole {
    /** An administrator on the account. */
    Admin = "admin",
    /** A regular user on the account. */
    User = "user",
}

/** translation missing: en.graphql.types.users_filter_enum.self */
export enum UsersFilterEnum {
    /** translation missing: en.graphql.types.users_filter_enum.email */
    Email = "email",
    /** translation missing: en.graphql.types.users_filter_enum.name */
    Name = "name",
    /** translation missing: en.graphql.types.users_filter_enum.pending */
    Pending = "pending",
    /** translation missing: en.graphql.types.users_filter_enum.role */
    Role = "role",
}

/** translation missing: en.graphql.types.users_filter_input.self */
export type UsersFilterInput = {
    /** translation missing: en.graphql.types.users_filter_input.arg */
    readonly arg: InputMaybe<Scalars["String"]>;
    /** translation missing: en.graphql.types.users_filter_input.key */
    readonly key: UsersFilterEnum;
    /** translation missing: en.graphql.types.users_filter_input.type */
    readonly type: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for users. */
export enum UsersSortEnum {
    /** Sort by `email` ascending. */
    EmailAsc = "email_ASC",
    /** Sort by `email` descending. */
    EmailDesc = "email_DESC",
    /** Sort by `name` ascending. */
    NameAsc = "name_ASC",
    /** Sort by `name` descending. */
    NameDesc = "name_DESC",
    /** Sort by `pending` ascending. */
    PendingAsc = "pending_ASC",
    /** Sort by `pending` descending. */
    PendingDesc = "pending_DESC",
    /** Sort by `role` ascending. */
    RoleAsc = "role_ASC",
    /** Sort by `role` descending. */
    RoleDesc = "role_DESC",
    /** Sort by `status` ascending. */
    StatusAsc = "status_ASC",
    /** Sort by `status` descending. */
    StatusDesc = "status_DESC",
}

export type GetAllServicesQueryVariables = Exact<{
    cursor: InputMaybe<Scalars["String"]>;
}>;

export type GetAllServicesQuery = {
    readonly __typename?: "Query";
    readonly account: {
        readonly __typename?: "Account";
        readonly servicesV2: {
            readonly __typename?: "ServiceConnection";
            readonly pageInfo: {
                readonly __typename?: "PageInfo";
                readonly endCursor: string | null;
                readonly hasNextPage: boolean;
            };
            readonly nodes: ReadonlyArray<{
                readonly __typename?: "Service";
                readonly id: string;
                readonly alias: string | null;
                readonly name: string;
                readonly linkable: boolean;
                readonly href: string;
                readonly locked: boolean;
                readonly description: string | null;
                readonly htmlUrl: string;
                readonly product: string | null;
                readonly language: string | null;
                readonly framework: string | null;
                readonly aliases: ReadonlyArray<string>;
                readonly note: string | null;
                readonly hasServiceConfigError: boolean;
                readonly creationSource: ServiceCreationSourceEnum | null;
                readonly level_index: number | null;
                readonly owner: {
                    readonly __typename?: "Team";
                    readonly name: string;
                    readonly href: string;
                    readonly contacts: ReadonlyArray<{
                        readonly __typename?: "Contact";
                        readonly displayName: string | null;
                        readonly targetHref: string | null;
                        readonly type: ContactType;
                    }> | null;
                } | null;
                readonly tier: {
                    readonly __typename?: "Tier";
                    readonly name: string | null;
                    readonly index: number | null;
                } | null;
                readonly tags: {
                    readonly __typename?: "TagConnection";
                    readonly nodes: ReadonlyArray<{
                        readonly __typename?: "Tag";
                        readonly plainId: number;
                        readonly id: string;
                        readonly key: string;
                        readonly value: string;
                    } | null> | null;
                } | null;
                readonly service_stat: {
                    readonly __typename?: "CheckStats";
                    readonly num_checks: number;
                    readonly num_passing_checks: number;
                } | null;
                readonly lastDeploy: {
                    readonly __typename?: "Deploy";
                    readonly deployedAt: any | null;
                    readonly commitSha: string | null;
                    readonly author: string | null;
                } | null;
                readonly service_level: {
                    readonly __typename?: "ServiceStats";
                    readonly rubric: {
                        readonly __typename?: "RubricReport";
                        readonly level: {
                            readonly __typename?: "Level";
                            readonly index: number | null;
                            readonly name: string | null;
                        } | null;
                    };
                } | null;
                readonly tools: {
                    readonly __typename?: "ToolConnection";
                    readonly nodes: ReadonlyArray<{
                        readonly __typename?: "Tool";
                        readonly id: string;
                        readonly displayCategory: string;
                        readonly displayName: string | null;
                        readonly environment: string | null;
                        readonly url: string;
                    } | null> | null;
                } | null;
                readonly alertStatus: {
                    readonly __typename?: "AlertStatus";
                    readonly index: number;
                    readonly type: AlertStatusTypeEnum;
                };
                readonly onCalls: {
                    readonly __typename?: "OnCallConnection";
                    readonly nodes: ReadonlyArray<{
                        readonly __typename?: "OnCall";
                        readonly name: string;
                        readonly externalEmail: string;
                        readonly gravatarHref: string | null;
                    } | null> | null;
                } | null;
                readonly defaultServiceRepository: {
                    readonly __typename?: "ServiceRepository";
                    readonly repository: {
                        readonly __typename?: "Repository";
                        readonly displayName: string;
                        readonly url: string | null;
                    };
                } | null;
            } | null> | null;
        };
    };
};

export type ServiceFragment = {
    readonly __typename?: "Service";
    readonly id: string;
    readonly alias: string | null;
    readonly name: string;
    readonly linkable: boolean;
    readonly href: string;
    readonly locked: boolean;
    readonly description: string | null;
    readonly htmlUrl: string;
    readonly product: string | null;
    readonly language: string | null;
    readonly framework: string | null;
    readonly aliases: ReadonlyArray<string>;
    readonly note: string | null;
    readonly hasServiceConfigError: boolean;
    readonly creationSource: ServiceCreationSourceEnum | null;
    readonly level_index: number | null;
    readonly owner: {
        readonly __typename?: "Team";
        readonly name: string;
        readonly href: string;
        readonly contacts: ReadonlyArray<{
            readonly __typename?: "Contact";
            readonly displayName: string | null;
            readonly targetHref: string | null;
            readonly type: ContactType;
        }> | null;
    } | null;
    readonly tier: { readonly __typename?: "Tier"; readonly name: string | null; readonly index: number | null } | null;
    readonly tags: {
        readonly __typename?: "TagConnection";
        readonly nodes: ReadonlyArray<{
            readonly __typename?: "Tag";
            readonly plainId: number;
            readonly id: string;
            readonly key: string;
            readonly value: string;
        } | null> | null;
    } | null;
    readonly service_stat: {
        readonly __typename?: "CheckStats";
        readonly num_checks: number;
        readonly num_passing_checks: number;
    } | null;
    readonly lastDeploy: {
        readonly __typename?: "Deploy";
        readonly deployedAt: any | null;
        readonly commitSha: string | null;
        readonly author: string | null;
    } | null;
    readonly service_level: {
        readonly __typename?: "ServiceStats";
        readonly rubric: {
            readonly __typename?: "RubricReport";
            readonly level: {
                readonly __typename?: "Level";
                readonly index: number | null;
                readonly name: string | null;
            } | null;
        };
    } | null;
    readonly tools: {
        readonly __typename?: "ToolConnection";
        readonly nodes: ReadonlyArray<{
            readonly __typename?: "Tool";
            readonly id: string;
            readonly displayCategory: string;
            readonly displayName: string | null;
            readonly environment: string | null;
            readonly url: string;
        } | null> | null;
    } | null;
    readonly alertStatus: {
        readonly __typename?: "AlertStatus";
        readonly index: number;
        readonly type: AlertStatusTypeEnum;
    };
    readonly onCalls: {
        readonly __typename?: "OnCallConnection";
        readonly nodes: ReadonlyArray<{
            readonly __typename?: "OnCall";
            readonly name: string;
            readonly externalEmail: string;
            readonly gravatarHref: string | null;
        } | null> | null;
    } | null;
    readonly defaultServiceRepository: {
        readonly __typename?: "ServiceRepository";
        readonly repository: {
            readonly __typename?: "Repository";
            readonly displayName: string;
            readonly url: string | null;
        };
    } | null;
};

export type ServiceLevelFragment = {
    readonly __typename?: "ServiceStats";
    readonly rubric: {
        readonly __typename?: "RubricReport";
        readonly level: {
            readonly __typename?: "Level";
            readonly index: number | null;
            readonly name: string | null;
        } | null;
    };
};

export type ServiceToolFragment = {
    readonly __typename?: "Tool";
    readonly id: string;
    readonly displayCategory: string;
    readonly displayName: string | null;
    readonly environment: string | null;
    readonly url: string;
};

export type ContactFragment = {
    readonly __typename?: "Contact";
    readonly displayName: string | null;
    readonly targetHref: string | null;
    readonly type: ContactType;
};
