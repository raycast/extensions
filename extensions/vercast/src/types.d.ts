// These types are either taken from the Vercel docs at https://vercel.com/docs/rest-api or they are generated from real responses via https://jvilk.com/MakeTypes/

export interface Team {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  createdAt: number;
  created: string;
  membership: Membership;
  creatorId: string;
  updatedAt: number;
  inviteCode: string;
  billing: Billing;
  description?: string;
  profiles?: unknown[];
  stagingPrefix: string;
  resourceConfig: ResourceConfig;
  allowProjectTransfers: boolean;
}

export interface Membership {
  role: string;
  confirmed: boolean;
  created: number;
  createdAt: number;
  updatedAt: number;
  teamId: string;
}

export interface Billing {
  plan: string;
  period?: null;
  trial?: null;
  cancelation?: null;
  addons?: null;
  platform: string;
  email?: null;
  tax?: null;
  language?: null;
  address?: null;
  name: string;
  overdue?: null;
  invoiceItems?: null;
  subscriptions?: null;
  currency: string;
}
export interface ResourceConfig {
  concurrentBuilds: number;
}

export type DeploymentState = "BUILDING" | "ERROR" | "FAILED" | "INITIALIZING" | "READY" | "QUEUED" | "CANCELED";

export type Deployment =
  | {
      build: {
        /** The keys of the environment variables that were assigned during the build phase. */
        env: string[];
      };
      builds?: { [key: string]: unknown }[];
      /** The region where the deployment was first created */
      createdIn: string;
      /** The keys of the environment variables that were assigned during runtime */
      env: string[];
      /** An object used to configure your Serverless Functions */
      functions?: {
        [key: string]: {
          memory?: number;
          maxDuration?: number;
          runtime?: string;
          includeFiles?: string;
          excludeFiles?: string;
        };
      } | null;
      /** Vercel URL to inspect the deployment. */
      inspectorUrl: string | null;
      /** An object containing the deployment's metadata */
      meta: { [key: string]: string };
      /** The name of the project associated with the deployment at the time that the deployment was created */
      name: string;
      /** The unique ID of the user or team the deployment belongs to */
      ownerId: string;
      /** The pricing plan the deployment was made under */
      plan:
        | "free"
        | "hobby"
        | "premium"
        | "legacy_pro"
        | "on-demand"
        | "unlimited"
        | "old-pro"
        | "business"
        | "enterprise"
        | "pro"
        | "oss";
      /** The ID of the project the deployment is associated with */
      projectId: string;
      /** A list of routes objects used to rewrite paths to point towards other internal or external paths */
      routes:
        | (
            | {
                src: string;
                dest?: string;
                headers?: { [key: string]: string };
                methods?: string[];
                continue?: boolean;
                override?: boolean;
                caseSensitive?: boolean;
                check?: boolean;
                important?: boolean;
                status?: number;
                has?: (
                  | {
                      type: "host";
                      value: string;
                    }
                  | {
                      type: "header" | "cookie" | "query";
                      key: string;
                      value?: string;
                    }
                )[];
                missing?: (
                  | {
                      type: "host";
                      value: string;
                    }
                  | {
                      type: "header" | "cookie" | "query";
                      key: string;
                      value?: string;
                    }
                )[];
                locale?: {
                  /** Construct a type with a set of properties K of type T */
                  redirect?: { [key: string]: string };
                  cookie?: string;
                };
                middleware?: number;
              }
            | {
                handle: "filesystem" | "hit" | "miss" | "rewrite" | "error" | "resource";
                src?: string;
                dest?: string;
                status?: number;
              }
            | {
                src: string;
                continue: boolean;
                middleware: 0;
              }
          )[]
        | null;
      /** A list of all the aliases (default aliases, staging aliases and production aliases) that were assigned upon deployment creation */
      alias: string[];
      /** A boolean that will be true when the aliases from the alias property were assigned successfully */
      aliasAssigned: boolean;
      /** An object that will contain a `code` and a `message` when the aliasing fails, otherwise the value will be `null` */
      aliasError?: {
        code: string;
        message: string;
      } | null;
      aliasFinal?: string | null;
      aliasWarning?: {
        code: string;
        message: string;
        link?: string;
        action?: string;
      } | null;
      automaticAliases?: string[];
      bootedAt: number;
      buildErrorAt?: number;
      buildingAt: number;
      canceledAt?: number;
      checksState?: "registered" | "running" | "completed";
      checksConclusion?: "succeeded" | "failed" | "skipped" | "canceled";
      /** A number containing the date when the deployment was created in milliseconds */
      createdAt: number;
      /** Information about the deployment creator */
      creator: {
        /** The ID of the user that created the deployment */
        uid: string;
        /** The username of the user that created the deployment */
        username?: string;
      };
      errorCode?: string;
      errorLink?: string;
      errorMessage?: string | null;
      errorStep?: string;
      gitSource?:
        | {
            type: "github";
            repoId: string | number;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "github";
            org: string;
            repo: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "gitlab";
            projectId: string | number;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "bitbucket";
            workspaceUuid?: string;
            repoUuid: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "bitbucket";
            owner: string;
            slug: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "github";
            ref: string;
            sha: string;
            repoId: number;
            org?: string;
            repo?: string;
          }
        | {
            type: "gitlab";
            ref: string;
            sha: string;
            projectId: number;
          }
        | {
            type: "bitbucket";
            ref: string;
            sha: string;
            owner?: string;
            slug?: string;
            workspaceUuid: string;
            repoUuid: string;
          };
      uid: string;
      lambdas?: {
        id: string;
        createdAt?: number;
        entrypoint?: string | null;
        readyState?: "BUILDING" | "ERROR" | "INITIALIZING" | "READY";
        readyStateAt?: number;
        output: {
          path: string;
          functionName: string;
        }[];
      }[];
      /** A boolean representing if the deployment is public or not. By default this is `false` */
      public: boolean;
      /** The state of the deployment depending on the process of deploying, or if it is ready or in an error state */
      readyState?: DeploymentState;
      state?: DeploymentState;
      /** The regions the deployment exists in */
      regions: string[];
      /** Where was the deployment created from */
      source?: "cli" | "git" | "import";
      /** If defined, either `staging` if a staging alias in the format `<project>.<team>.now.sh` was assigned upon creation, or `production` if the aliases from `alias` were assigned */
      target?: ("production" | "staging") | null;
      /** The team that owns the deployment if any */
      team?: {
        /** The ID of the team owner */
        id: string;
        /** The name of the team owner */
        name: string;
        /** The slug of the team owner */
        slug: string;
      };
      type: "LAMBDAS";
      /** A string with the unique URL of the deployment */
      url: string;
      /** An array of domains that were provided by the user when creating the Deployment. */
      userAliases?: string[];
      /** The platform version that was used to create the deployment. */
      version: 2;
    }
  | {
      /** A list of all the aliases (default aliases, staging aliases and production aliases) that were assigned upon deployment creation */
      alias: string[];
      /** A boolean that will be true when the aliases from the alias property were assigned successfully */
      aliasAssigned: boolean;
      /** An object that will contain a `code` and a `message` when the aliasing fails, otherwise the value will be `null` */
      aliasError?: {
        code: string;
        message: string;
      } | null;
      aliasFinal?: string | null;
      aliasWarning?: {
        code: string;
        message: string;
        link?: string;
        action?: string;
      } | null;
      automaticAliases?: string[];
      bootedAt: number;
      buildErrorAt?: number;
      buildingAt: number;
      canceledAt?: number;
      checksState?: "registered" | "running" | "completed";
      checksConclusion?: "succeeded" | "failed" | "skipped" | "canceled";
      /** A number containing the date when the deployment was created in milliseconds */
      createdAt: number;
      /** Information about the deployment creator */
      creator: {
        /** The ID of the user that created the deployment */
        uid: string;
        /** The username of the user that created the deployment */
        username?: string;
      };
      errorCode?: string;
      errorLink?: string;
      errorMessage?: string | null;
      errorStep?: string;
      gitSource?:
        | {
            type: "github";
            repoId: string | number;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "github";
            org: string;
            repo: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "gitlab";
            projectId: string | number;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "bitbucket";
            workspaceUuid?: string;
            repoUuid: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "bitbucket";
            owner: string;
            slug: string;
            ref?: string | null;
            sha?: string;
            prId?: number | null;
          }
        | {
            type: "github";
            ref: string;
            sha: string;
            repoId: number;
            org?: string;
            repo?: string;
          }
        | {
            type: "gitlab";
            ref: string;
            sha: string;
            projectId: number;
          }
        | {
            type: "bitbucket";
            ref: string;
            sha: string;
            owner?: string;
            slug?: string;
            workspaceUuid: string;
            repoUuid: string;
          };
      /** A string holding the unique ID of the deployment */
      id: string;
      uid: string;
      lambdas?: {
        id: string;
        createdAt?: number;
        entrypoint?: string | null;
        readyState?: "BUILDING" | "ERROR" | "INITIALIZING" | "READY";
        readyStateAt?: number;
        output: {
          path: string;
          functionName: string;
        }[];
      }[];
      /** The name of the project associated with the deployment at the time that the deployment was created */
      name: string;
      /** An object containing the deployment's metadata */
      meta: { [key: string]: string };
      /** A boolean representing if the deployment is public or not. By default this is `false` */
      public: boolean;
      /** The state of the deployment depending on the process of deploying, or if it is ready or in an error state */
      readyState?: DeploymentState;
      state?: DeploymentState;
      /** The regions the deployment exists in */
      regions: string[];
      /** Where was the deployment created from */
      source?: "cli" | "git" | "import";
      /** If defined, either `staging` if a staging alias in the format `<project>.<team>.now.sh` was assigned upon creation, or `production` if the aliases from `alias` were assigned */
      target?: ("production" | "staging") | null;
      /** The team that owns the deployment if any */
      team?: {
        /** The ID of the team owner */
        id: string;
        /** The name of the team owner */
        name: string;
        /** The slug of the team owner */
        slug: string;
      };
      type: "LAMBDAS";
      /** A string with the unique URL of the deployment */
      url: string;
      /** An array of domains that were provided by the user when creating the Deployment. */
      userAliases?: string[];
      /** The platform version that was used to create the deployment. */
      version: 2;
    };

export interface Team {
  slug: string;
  id: string;
}

export interface Environment {
  id: string;
  type: "system" | "secret" | "encrypted" | "plain";
  key: string;
  value: string;
  configurationId?: string | null;
  createdAt: number;
  updatedAt: number;
  target?:
    | ("production" | "preview" | "development" | "preview" | "development")[]
    | ("production" | "preview" | "development" | "preview" | "development");
  gitBranch?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  decrypted?: boolean;
  system?: boolean;
}

export type CreateEnvironment = Pick<Environment, "key" | "target" | "type" | "value">;

export interface Project {
  accountId: string;
  analytics?: {
    id: string;
    canceledAt: number | null;
    disabledAt: number;
    enabledAt: number;
    paidAt?: number;
    sampleRatePercent?: number | null;
    spendLimitInDollars?: number | null;
  };
  autoExposeSystemEnvs?: boolean;
  buildCommand?: string | null;
  commandForIgnoringBuildStep?: string | null;
  createdAt?: number;
  devCommand?: string | null;
  directoryListing: boolean;
  installCommand?: string | null;
  env?: {
    id?: string;
    type: "system" | "secret" | "encrypted" | "plain";
    key: string;
    value: string;
    configurationId?: string | null;
    createdAt?: number;
    updatedAt?: number;
    target?:
      | ("production" | "preview" | "development" | "preview" | "development")[]
      | ("production" | "preview" | "development" | "preview" | "development");
    gitBranch?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
  }[];
  framework?: string | null;
  gitForkProtection?: boolean;
  id: string;
  latestDeployments?: {
    alias?: string[];
    aliasAssigned?: (number | boolean) | null;
    builds?: {
      use: string;
      src?: string;
      dest?: string;
    }[];
    createdAt: number;
    createdIn: string;
    creator: {
      email: string;
      githubLogin?: string;
      gitlabLogin?: string;
      uid: string;
      username: string;
    } | null;
    deploymentHostname: string;
    name: string;
    forced?: boolean;
    id: string;
    meta?: { [key: string]: string };
    plan: string;
    private: boolean;
    readyState: string;
    requestedAt?: number;
    target?: string | null;
    teamId?: string | null;
    type: string;
    url: string;
    userId: string;
    withCache?: boolean;
  }[];
  link?:
    | {
        org?: string;
        repo?: string;
        repoId?: number;
        type?: "github";
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      }
    | {
        projectId?: string;
        projectName?: string;
        projectNameWithNamespace?: string;
        projectNamespace?: string;
        projectUrl?: string;
        type?: "gitlab";
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      }
    | {
        name?: string;
        slug?: string;
        owner?: string;
        type?: "bitbucket";
        uuid?: string;
        workspaceUuid?: string;
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      };
  name: string;
  nodeVersion: "14.x" | "12.x" | "10.x";
  outputDirectory?: string | null;
  passwordProtection?: {
    deploymentType: "preview" | "all";
  } | null;
  publicSource?: boolean | null;
  rootDirectory?: string | null;
  serverlessFunctionRegion?: string | null;
  sourceFilesOutsideRootDirectory?: boolean;
  ssoProtection?: {
    deploymentType: "preview" | "all";
  } | null;
  targets?: { [key: string]: string };
  transferCompletedAt?: number;
  transferStartedAt?: number;
  transferToAccountId?: string;
  transferredFromAccountId?: string;
  updatedAt?: number;
  live?: boolean;
}

export interface User {
  /** UNIX timestamp (in milliseconds) when the User account was created. */
  createdAt: number;
  /** When the User account has been "soft blocked", this property will contain the date when the restriction was enacted, and the identifier for why. */
  softBlock: {
    blockedAt: number;
    reason: "FAIR_USE_LIMITS_EXCEEDED" | "ENTERPRISE_TRIAL_ENDED";
  } | null;
  /** An object containing billing infomation associated with the User account. */
  billing: {
    currency?: "usd" | "eur";
    addons?: ("custom-deployment-suffix" | "live-support")[] | null;
    cancelation?: number | null;
    period: {
      start: number;
      end: number;
    } | null;
    contract?: {
      start: number;
      end: number;
    } | null;
    plan:
      | "free"
      | "hobby"
      | "premium"
      | "legacy_pro"
      | "on-demand"
      | "unlimited"
      | "old-pro"
      | "business"
      | "enterprise"
      | "pro";
    platform?: "stripe";
    trial?: {
      start: number;
      end: number;
    } | null;
    email?: string | null;
    tax?: {
      type: string;
      id: string;
    } | null;
    language?: string | null;
    address?: {
      line1: string;
      line2?: string;
      postalCode?: string;
      city?: string;
      country?: string;
      state?: string;
    } | null;
    name?: string | null;
    overdue?: boolean | null;
    invoiceItems?: {
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      pro?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      enterprise?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      concurrentBuilds?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      saml?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      teamSeats?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      customCerts?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      previewDeploymentSuffix?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      passwordProtection?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      ssoProtection?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      /** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
      analytics?: {
        price: number;
        quantity: number;
        name?: string;
        hidden: boolean;
        createdAt?: number;
        frequency?: {
          interval: "month";
          intervalCount: 1 | 3 | 2 | 6 | 12;
        };
      };
      analyticsUsage?: {
        price: number;
        batch: number;
        threshold: number;
        name?: string;
        hidden: boolean;
      };
      bandwidth?: {
        price: number;
        batch: number;
        threshold: number;
        name?: string;
        hidden: boolean;
      };
      builds?: {
        price: number;
        batch: number;
        threshold: number;
        name?: string;
        hidden: boolean;
      };
      serverlessFunctionExecution?: {
        price: number;
        batch: number;
        threshold: number;
        name?: string;
        hidden: boolean;
      };
      sourceImages?: {
        price: number;
        batch: number;
        threshold: number;
        name?: string;
        hidden: boolean;
      };
    } | null;
    invoiceSettings?: {
      footer?: string;
    };
    subscriptions?:
      | {
          id: string;
          trial: {
            start: number;
            end: number;
          } | null;
          period: {
            start: number;
            end: number;
          };
          frequency: {
            interval: "month" | "day" | "week" | "year";
            intervalCount: number;
          };
          discount: {
            id: string;
            coupon: {
              id: string;
              name: string | null;
              amountOff: number | null;
              percentageOff: number | null;
              durationInMonths: number | null;
              duration: "forever" | "repeating" | "once";
            };
          } | null;
          items: {
            id: string;
            priceId: string;
            productId: string;
            amount: number;
            quantity: number;
          }[];
        }[]
      | null;
    controls?: {
      analyticsSampleRateInPercent?: number | null;
      analyticsSpendLimitInDollars?: number | null;
    } | null;
    purchaseOrder?: string | null;
  } | null;
  /** An object containing infomation related to the amount of platform resources may be allocated to the User account. */
  resourceConfig: {
    nodeType?: string;
    concurrentBuilds?: number;
    awsAccountType?: string;
    awsAccountIds?: string[];
    cfZoneName?: string;
  };
  /** Prefix that will be used in the URL of "Preview" deployments created by the User account. */
  stagingPrefix: string;
  importFlowGitNamespace?: (string | number) | null;
  importFlowGitNamespaceId?: (string | number) | null;
  importFlowGitProvider?: "github" | "gitlab" | "bitbucket";
  preferredScopesAndGitNamespaces?: {
    scopeId: string;
    gitNamespaceId: (string | number) | null;
  }[];
  /** The User's unique identifier. */
  id: string;
  uid: string;
  /** Email address associated with the User account. */
  email: string;
  /** Name associated with the User account, or `null` if none has been provided. */
  name?: string;
  /** Unique username associated with the User account. */
  username: string;
  /** SHA1 hash of the avatar for the User account. Can be used in conjuction with the ... endpoint to retrieve the avatar image. */
  avatar: string | null;
}

// https://vercel.com/docs/rest-api#endpoints/deployments/list-deployment-builds
type Build = {
  /** The unique identifier of the Build */
  id: string;
  /** The unique identifier of the deployment */
  deploymentId: string;
  /** The entrypoint of the deployment */
  entrypoint: string;
  /** The state of the deployment depending on the process of deploying, or if it is ready or in an error state */
  readyState:
    | "INITIALIZING"
    | "BUILDING"
    | "UPLOADING"
    | "DEPLOYING"
    | "READY"
    | "ARCHIVED"
    | "ERROR"
    | "QUEUED"
    | "CANCELED";
  /** The time at which the Build state was last modified */
  readyStateAt?: number;
  /** The time at which the Build was scheduled to be built */
  scheduledAt?: number | null;
  /** The time at which the Build was created */
  createdAt?: number;
  /** The time at which the Build was deployed */
  deployedAt?: number;
  /** The region where the Build was first created */
  createdIn?: string;
  /** The Runtime the Build used to generate the output */
  use?: string;
  /** An object that contains the Build's configuration */
  config?: {
    distDir?: string;
    forceBuildIn?: string;
    reuseWorkPathFrom?: string;
    zeroConfig?: boolean;
  };
  /** A list of outputs for the Build that can be either Serverless Functions or static files */
  output: {
    /** The type of the output */
    type?: "lambda" | "file";
    /** The absolute path of the file or Serverless Function */
    path: string;
    /** The SHA1 of the file */
    digest: string;
    /** The POSIX file permissions */
    mode: number;
    /** The size of the file in bytes */
    size?: number;
    /** If the output is a Serverless Function, an object containing the name, location and memory size of the function */
    lambda?: {
      functionName: string;
      deployedTo: string[];
      memorySize?: number;
      timeout?: number;
      layers?: string[];
    };
  }[];
};

type Error = {
  error: {
    code: string;
    message: string;
  };
};

type Response<T> = Error & T;

export type CreateEnvironmentVariableResponse = Response<Environment>;

type Paginated<T> = {
  data: T[];
  pagination: Pagination;
};

interface Pagination {
  /** Amount of items in the current page. */
  count: number;
  /** Timestamp that must be used to request the next page. */
  next: number | null;
  /** Timestamp that must be used to request the previous page. */
  prev: number | null;
}

type Check = {
  completedAt?: number;
  conclusion?: "canceled" | "failed" | "neutral" | "succeeded" | "skipped" | "stale";
  createdAt: number;
  detailsUrl?: string;
  id: string;
  integrationId: string;
  name: string;
  output?: {
    metrics?: {
      FCP: {
        value: number | null;
        previousValue?: number;
        source: "web-vitals";
      };
      LCP: {
        value: number | null;
        previousValue?: number;
        source: "web-vitals";
      };
      CLS: {
        value: number | null;
        previousValue?: number;
        source: "web-vitals";
      };
      TBT: {
        value: number | null;
        previousValue?: number;
        source: "web-vitals";
      };
      virtualExperienceScore?: {
        value: number | null;
        previousValue?: number;
        source: "web-vitals";
      };
    };
  };
  path?: string;
  rerequestable: boolean;
  startedAt?: number;
  status: "registered" | "running" | "completed";
  updatedAt: number;
};

export interface Domain {
  boughtAt: number | null;
  createdAt: number;
  expiresAt: number | null;
  id: string;
  name: string;
  serviceType: "zeit.world" | "external" | "na";
  transferredAt: number | null;
  userId: string;
  teamId: string | null;
  cdnEnabled: boolean;
  verified: boolean;
  nameservers: string[];
  intendedNameservers: string[];
  creator: {
    id: string;
    customerId: string | null;
    email: string;
    username: string;
    name: string;
  };
  zone: boolean;
  configVerifiedAt: number | null;
  txtVerifiedAt: number | null;
  nsVerifiedAt: number | null;
  verificationRecord: string;
  customNameservers?: string[];
  orderedAt?: number;
  renew?: boolean;
  transferStartedAt?: number;
}
