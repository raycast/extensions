import { z } from "zod";

export const appSchema = z.object({
  type: z.string(),
  id: z.string(),
  attributes: z.object({
    name: z.string(),
    bundleId: z.string(),
    sku: z.string(),
    primaryLocale: z.string(),
    isOrEverWasMadeForKids: z.boolean(),
    subscriptionStatusUrl: z.string().nullable(),
    subscriptionStatusUrlVersion: z.string().nullable(),
    subscriptionStatusUrlForSandbox: z.string().nullable(),
    subscriptionStatusUrlVersionForSandbox: z.string().nullable(),
    contentRightsDeclaration: z.string().nullable(),
  }),
});
export const appSchemas = z.array(appSchema);
export type App = z.infer<typeof appSchema>;

export const buildSchema = z.object({
  type: z.literal("builds"),
  id: z.string(),
  attributes: z.object({
    version: z.string(),
    uploadedDate: z.string(),
    expirationDate: z.string(),
    expired: z.boolean(),
    iconAssetToken: z.object({
      templateUrl: z.string().url(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    processingState: z.enum(["PROCESSING", "FAILED", "INVALID", "VALID"]),
    buildAudienceType: z.enum(["APP_STORE_ELIGIBLE", "APP_STORE_ELIGIBLE_FOR_MAC_APP_STORE"]),
  }),
});
export const buildSchemas = z.array(buildSchema);
export type Build = z.infer<typeof buildSchema>;

export const buildSchemaWithBetaGroups = buildSchema.extend({
  relationships: z.object({
    betaGroups: z.object({
      data: z.array(
        z.object({
          type: z.string(),
          id: z.string(),
        }),
      ),
    }),
  }),
});
export const buildSchemasWithBetaGroups = z.array(buildSchemaWithBetaGroups);

export const betaGroupSchema = z.object({
  type: z.literal("betaGroups"),
  id: z.string(),
  attributes: z.object({
    name: z.string(),
    createdDate: z.string(),
    isInternalGroup: z.boolean(),
    hasAccessToAllBuilds: z.boolean().nullable(),
    publicLinkEnabled: z.boolean().nullable(),
    publicLinkId: z.string().nullable(),
    publicLinkLimitEnabled: z.boolean().nullable(),
    publicLinkLimit: z.number().nullable(),
    publicLink: z.string().nullable(),
    feedbackEnabled: z.boolean(),
    iosBuildsAvailableForAppleSiliconMac: z.boolean(),
    iosBuildsAvailableForAppleVision: z.boolean(),
  }),
});

export const betaGroupsSchema = z.array(betaGroupSchema);

export type BetaGroup = z.infer<typeof betaGroupSchema>;

export const appStoreVersionSchema = z.object({
  type: z.literal("appStoreVersions"),
  id: z.string(),
  attributes: z.object({
    platform: z.string(),
    versionString: z.string(),
    appStoreState: z.enum([
      "ACCEPTED",
      "DEVELOPER_REJECTED",
      "IN_REVIEW",
      "INVALID_BINARY",
      "METADATA_REJECTED",
      "PENDING_APPLE_RELEASE",
      "PENDING_DEVELOPER_RELEASE",
      "PREPARE_FOR_SUBMISSION",
      "PROCESSING_FOR_DISTRIBUTION",
      "READY_FOR_DISTRIBUTION",
      "READY_FOR_REVIEW",
      "READY_FOR_SALE",
      "REJECTED",
      "REPLACED_WITH_NEW_VERSION",
      "WAITING_FOR_EXPORT_COMPLIANCE",
      "WAITING_FOR_REVIEW",
    ]),
    appVersionState: z.enum([
      "ACCEPTED",
      "DEVELOPER_REJECTED",
      "IN_REVIEW",
      "INVALID_BINARY",
      "METADATA_REJECTED",
      "PENDING_APPLE_RELEASE",
      "PENDING_DEVELOPER_RELEASE",
      "PREPARE_FOR_SUBMISSION",
      "PROCESSING_FOR_DISTRIBUTION",
      "READY_FOR_DISTRIBUTION",
      "READY_FOR_REVIEW",
      "REJECTED",
      "REPLACED_WITH_NEW_VERSION",
      "WAITING_FOR_EXPORT_COMPLIANCE",
      "WAITING_FOR_REVIEW",
    ]),
    copyright: z.string().nullable(),
    reviewType: z.string().nullable(),
    releaseType: z.string().nullable(),
    earliestReleaseDate: z.string().nullable(),
    usesIdfa: z.boolean().nullable(),
    downloadable: z.boolean(),
    createdDate: z.string(),
  }),
});

export const preReleaseVersionSchema = z.object({
  id: z.string(),
  attributes: z.object({
    platform: z.string(),
    version: z.string(),
  }),
});

export const betaBuildLocalizationSchema = z.object({
  type: z.literal("betaBuildLocalizations"),
  id: z.string(),
  attributes: z.object({
    whatsNew: z.string().nullable(),
    locale: z.string(),
  }),
});

const externalBuildStateSchema = z.enum([
  "PROCESSING",
  "PROCESSING_EXCEPTION",
  "MISSING_EXPORT_COMPLIANCE",
  "READY_FOR_BETA_TESTING",
  "IN_BETA_TESTING",
  "EXPIRED",
  "READY_FOR_BETA_SUBMISSION",
  "IN_EXPORT_COMPLIANCE_REVIEW",
  "WAITING_FOR_BETA_REVIEW",
  "IN_BETA_REVIEW",
  "BETA_REJECTED",
  "BETA_APPROVED",
  "SUBMITTED_FOR_BETA_REVIEW",
  "REMOVED_FROM_BETA_REVIEW",
]);

export type ExternalBuildState = z.infer<typeof externalBuildStateSchema>;

export const buildBetaDetailSchema = z.object({
  type: z.literal("buildBetaDetails"),
  id: z.string(),
  attributes: z.object({
    internalBuildState: z
      .enum([
        "PROCESSING",
        "PROCESSING_EXCEPTION",
        "MISSING_EXPORT_COMPLIANCE",
        "READY_FOR_BETA_TESTING",
        "IN_BETA_TESTING",
        "EXPIRED",
        "IN_EXPORT_COMPLIANCE_REVIEW",
      ])
      .optional(),
    externalBuildState: externalBuildStateSchema.optional(),
  }),
});

export const buildWithBetaDetailAndBetaGroupsScehma = z.object({
  build: buildSchemaWithBetaGroups,
  buildBetaDetails: buildBetaDetailSchema,
  betaGroups: z.array(betaGroupSchema),
});

export type BuildWithBetaDetailAndBetaGroups = z.infer<typeof buildWithBetaDetailAndBetaGroupsScehma>;

const buildSchemaWithBetaGroupsSchema = z.object({
  data: z.array(buildSchemaWithBetaGroups),
  included: z.array(z.union([buildBetaDetailSchema, betaGroupSchema])),
});

export const buildsWithBetaDetailSchema = buildSchemaWithBetaGroupsSchema.transform((response) => {
  return response.data.map((build) => {
    return {
      build: build,
      buildBetaDetails: response.included.find((item) => item.type === "buildBetaDetails" && item.id === build.id),
      betaGroups: response.included.filter((item) => {
        return item.type === "betaGroups" && build.relationships.betaGroups.data.find((bg) => bg.id === item.id);
      }),
    } as BuildWithBetaDetailAndBetaGroups;
  });
});

export const betaTesterUsageSchema = z.object({
  type: z.literal("appsBetaTesterUsages"),
  dataPoints: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      values: z.object({
        crashCount: z.number(),
        sessionCount: z.number(),
        feedbackCount: z.number(),
      }),
    }),
  ),
  dimensions: z.object({
    betaTesters: z.object({
      data: z.object({
        type: z.string(),
        id: z.string(),
      }),
    }),
  }),
});

export const betaTesterUsageSchemas = z.array(betaTesterUsageSchema);

export type BetaTesterUsage = z.infer<typeof betaTesterUsageSchema>;

export const betaBuildUsageSchema = z.object({
  type: z.literal("betaBuildUsages"),
  dataPoints: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      values: z.object({
        installCount: z.number(),
        crashCount: z.number(),
        sessionCount: z.number(),
        inviteCount: z.number(),
        feedbackCount: z.number(),
      }),
    }),
  ),
});

export const betaTesterSchema = z.object({
  type: z.literal("betaTesters"),
  id: z.string(),
  attributes: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    inviteType: z.string().nullable(),
    state: z.string().nullable(),
  }),
});

export const userSchema = z.object({
  type: z.literal("users"),
  id: z.string(),
  attributes: z.object({
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    roles: z.array(z.string()),
    allAppsVisible: z.boolean(),
    provisioningAllowed: z.boolean(),
  }),
});

export const userSchemaWithApps = z.object({
  data: z.object({
    type: z.literal("users"),
    id: z.string(),
    attributes: z.object({
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      roles: z.array(z.string()),
      allAppsVisible: z.boolean(),
      provisioningAllowed: z.boolean(),
    }),
  }),
  included: z.array(
    z.object({
      type: z.literal("apps"),
      id: z.string(),
      attributes: z.object({
        name: z.string(),
        bundleId: z.string(),
        sku: z.string(),
        primaryLocale: z.string(),
        isOrEverWasMadeForKids: z.boolean(),
        subscriptionStatusUrl: z.string().nullable(),
        subscriptionStatusUrlVersion: z.string().nullable(),
        subscriptionStatusUrlForSandbox: z.string().nullable(),
        subscriptionStatusUrlVersionForSandbox: z.string().nullable(),
        contentRightsDeclaration: z.string().nullable(),
      }),
    }),
  ),
});

export const userInvitationsSchema = z.object({
  type: z.literal("userInvitations"),
  id: z.string(),
  attributes: z.object({
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    expirationDate: z.string(),
    roles: z.array(z.string()),
    allAppsVisible: z.boolean().nullable(),
    provisioningAllowed: z.boolean(),
  }),
  relationships: z.object({
    visibleApps: z.object({
      data: z
        .array(
          z.object({
            type: z.string(),
            id: z.string(),
          }),
        )
        .optional(),
    }),
  }),
  links: z.object({
    self: z.string(),
  }),
});

export const userInvitationsSchemas = z.array(userInvitationsSchema);

export type UserInvitation = z.infer<typeof userInvitationsSchema>;
export const userSchemaWithVisibleApps = userSchema.extend({
  relationships: z.object({
    visibleApps: z.object({
      data: z.array(
        z.object({
          type: z.string(),
          id: z.string(),
        }),
      ),
    }),
  }),
});

export type UserWithVisibleApps = z.infer<typeof userSchemaWithVisibleApps>;

export const betaAppReviewDetailSchema = z.object({
  type: z.literal("betaAppReviewDetails"),
  id: z.string(),
  attributes: z.object({
    contactFirstName: z.string(),
    contactLastName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string(),
    demoAccountName: z.string().nullable(),
    demoAccountPassword: z.string().nullable(),
    demoAccountRequired: z.boolean(),
    notes: z.string().nullable(),
  }),
});

export const betaLicenseAgreementSchema = z.object({
  type: z.literal("betaLicenseAgreements"),
  id: z.string(),
  attributes: z.object({
    agreementText: z.string().nullable(),
  }),
});

export const betaLicenseAgreementsSchema = z.array(betaLicenseAgreementSchema);

export type BetaLicenseAgreement = z.infer<typeof betaLicenseAgreementSchema>;

export const betaAppReviewDetailsSchema = z.array(betaAppReviewDetailSchema);

export type BetaAppReviewDetail = z.infer<typeof betaAppReviewDetailSchema>;

export const betaAppLocalizationSchema = z.object({
  type: z.literal("betaAppLocalizations"),
  id: z.string(),
  attributes: z.object({
    description: z.string().nullable(),
    locale: z.string(),
    marketingUrl: z.string().nullable(),
    privacyPolicyUrl: z.string().nullable(),
    tvOsPrivacyPolicy: z.string().nullable(),
    feedbackEmail: z.string().nullable(),
  }),
});

export const betaAppLocalizationsSchema = z.array(betaAppLocalizationSchema);

export type BetaAppLocalization = z.infer<typeof betaAppLocalizationSchema>;

export const usersSchema = z.array(userSchema);

export type User = z.infer<typeof userSchema>;

export const betaTestersSchema = z.array(betaTesterSchema);

export type BetaTester = z.infer<typeof betaTesterSchema>;

export const betaBuildUsagesSchema = z.array(betaBuildUsageSchema);

export type BetaBuildUsage = z.infer<typeof betaBuildUsageSchema>;

export type BuildsWithBetaDetailAndBetaGroups = z.infer<typeof buildsWithBetaDetailSchema>;

export const betaBuildLocalizationsSchema = z.array(betaBuildLocalizationSchema);

export type BetaBuildLocalization = z.infer<typeof betaBuildLocalizationSchema>;

export const appStoreVersionSchemas = z.array(appStoreVersionSchema);

export const preReleaseVersionSchemas = z.array(preReleaseVersionSchema);

export type AppStoreVersion = z.infer<typeof appStoreVersionSchema>;

export type PreReleaseVersion = z.infer<typeof preReleaseVersionSchema>;
