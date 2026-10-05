/**
 * Hub Protocol REST API types — re-exported from @synap/hub-rest-client.
 *
 * This file is a thin re-export layer. All types are defined in the shared
 * package so they stay in sync across the CLI, Raycast extension, and any
 * future consumer.
 *
 * When @synap/hub-rest-client is published to npm, the file: reference in
 * package.json switches to a versioned range with no other changes needed here.
 */

export type {
  HubEntity as SynapEntity,
  HubDocument as SynapDocument,
  HubChannel as SynapChannel,
  HubWorkspace as SynapWorkspace,
  HubUser as SynapUser,
  HubMemoryResult as SynapMemoryResult,
  HubListResponse,
  HubSingleResponse,
  CreateEntityInput,
  UpdateEntityInput,
  CreateDocumentInput,
  StoreMemoryInput,
  SendToChannelInput,
  AgentSetupResult,
  PodStatus,
} from "@synap/hub-rest-client";
