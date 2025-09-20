/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** Integer represented as a base-10 string */
  BigInt: { input: any; output: any };
  /** Object with arbitrary, untyped data */
  JSONObject: { input: any; output: any };
};

/**
 * Level for always on top mode
 *
 * See https://developer.apple.com/documentation/appkit/nswindow/level
 */
export enum AlwaysOnTopLevel {
  Floating = "FLOATING",
  MainMenu = "MAIN_MENU",
  ModalPanel = "MODAL_PANEL",
  Normal = "NORMAL",
  PopUpMenu = "POP_UP_MENU",
  ScreenSaver = "SCREEN_SAVER",
  Status = "STATUS",
  TornOffMenu = "TORN_OFF_MENU",
}

/** The driver header mode for on-board players */
export enum DriverHeaderMode {
  /** Show the driver's headshot and TLA */
  DriverHeader = "DRIVER_HEADER",
  /** Show nothing at all */
  None = "NONE",
  /** Show live timing data for the driver (when live timing is available) */
  ObcLiveTiming = "OBC_LIVE_TIMING",
}

/** The input for creating a player */
export type PlayerCreateInput = {
  /** Whether the player should be always on top or not */
  alwaysOnTop?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The bounds for this window */
  bounds?: InputMaybe<RectangleInput>;
  /** The channelId (if applicable) for this player */
  channelId?: InputMaybe<Scalars["Int"]["input"]>;
  /** The contentId for the player */
  contentId: Scalars["ID"]["input"];
  /**
   * The driver number for the driver (if applicable) for this player
   *
   * > Note: this can be used instead of channelId
   */
  driverNumber?: InputMaybe<Scalars["Int"]["input"]>;
  /**
   * The TLA (Three-Letter-Acronym) for the driver (if applicable) for this player
   *
   * > Note: this can be used instead of channelId
   */
  driverTla?: InputMaybe<Scalars["String"]["input"]>;
  /** Whether the player should be fullscreen or not */
  fullscreen?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Whether the player should maintain aspect ratio or not */
  maintainAspectRatio?: InputMaybe<Scalars["Boolean"]["input"]>;
  /**
   * The title of the stream (if applicable) for this player
   *
   * > Note: this can be used instead of channelId
   */
  streamTitle?: InputMaybe<Scalars["String"]["input"]>;
};

/** The player type */
export enum PlayerType {
  /** Additional stream, such as International, F1 Live, Data channel or Driver tracker */
  Additional = "ADDITIONAL",
  /** On-board camera, for drivers */
  Obc = "OBC",
}

/** A rectangle input, with the dimensions and position */
export type RectangleInput = {
  /** The height of the rectangle */
  height?: InputMaybe<Scalars["Int"]["input"]>;
  /** The width of the rectangle */
  width?: InputMaybe<Scalars["Int"]["input"]>;
  /** The x position of the rectangle */
  x?: InputMaybe<Scalars["Int"]["input"]>;
  /** The y position of the rectangle */
  y?: InputMaybe<Scalars["Int"]["input"]>;
};

/** The type of subscription */
export enum SubscriptionType {
  F1TvAccess = "F1TV_ACCESS",
  F1TvPro = "F1TV_PRO",
  F1Access = "F1_ACCESS",
}

export type PlayersQueryVariables = Exact<{ [key: string]: never }>;

export type PlayersQuery = {
  __typename?: "Query";
  players: Array<{
    __typename?: "Player";
    id: string;
    type: PlayerType;
    state?: { __typename?: "PlayerState"; muted: boolean; paused: boolean } | null;
    streamData?: {
      __typename?: "PlayerStreamData";
      title?: string | null;
      channelId?: number | null;
      contentId?: string | null;
      meetingKey?: string | null;
      sessionKey?: string | null;
    } | null;
    driverData?: {
      __typename?: "PlayerDriverData";
      driverNumber: number;
      tla: string;
      firstName: string;
      lastName: string;
      teamName: string;
    } | null;
  }>;
};

export type PlayerSetPausedMutationVariables = Exact<{
  playerSetPausedId: Scalars["ID"]["input"];
  paused?: InputMaybe<Scalars["Boolean"]["input"]>;
}>;

export type PlayerSetPausedMutation = { __typename?: "Mutation"; playerSetPaused: boolean };

export type PlayerSetMuteMutationVariables = Exact<{
  playerSetMutedId: Scalars["ID"]["input"];
}>;

export type PlayerSetMuteMutation = { __typename?: "Mutation"; playerSetMuted: boolean };

export type PlayerSyncMutationVariables = Exact<{
  playerSyncId: Scalars["ID"]["input"];
}>;

export type PlayerSyncMutation = { __typename?: "Mutation"; playerSync: boolean };

export const PlayersDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Players" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "players" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "state" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "muted" } },
                      { kind: "Field", name: { kind: "Name", value: "paused" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "streamData" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "title" } },
                      { kind: "Field", name: { kind: "Name", value: "channelId" } },
                      { kind: "Field", name: { kind: "Name", value: "contentId" } },
                      { kind: "Field", name: { kind: "Name", value: "meetingKey" } },
                      { kind: "Field", name: { kind: "Name", value: "sessionKey" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "type" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "driverData" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "driverNumber" } },
                      { kind: "Field", name: { kind: "Name", value: "tla" } },
                      { kind: "Field", name: { kind: "Name", value: "firstName" } },
                      { kind: "Field", name: { kind: "Name", value: "lastName" } },
                      { kind: "Field", name: { kind: "Name", value: "teamName" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlayersQuery, PlayersQueryVariables>;
export const PlayerSetPausedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "PlayerSetPaused" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "playerSetPausedId" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "ID" } } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "paused" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "playerSetPaused" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "playerSetPausedId" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "paused" },
                value: { kind: "Variable", name: { kind: "Name", value: "paused" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlayerSetPausedMutation, PlayerSetPausedMutationVariables>;
export const PlayerSetMuteDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "PlayerSetMute" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "playerSetMutedId" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "ID" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "playerSetMuted" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "playerSetMutedId" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlayerSetMuteMutation, PlayerSetMuteMutationVariables>;
export const PlayerSyncDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "PlayerSync" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "playerSyncId" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "ID" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "playerSync" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "playerSyncId" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlayerSyncMutation, PlayerSyncMutationVariables>;
