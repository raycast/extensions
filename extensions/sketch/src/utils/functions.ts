/* eslint-disable @typescript-eslint/no-explicit-any */
import { BodyRes, Share } from "../types/SketchWorkspaceShare";
import fetch, { FetchError } from "node-fetch";
import { GetWorkspacesBodyRes } from "../types/SketchGetWorkspaces";
import { SelectedWorkspace } from "../types/preferences";
import { SketchErrorBody } from "../types/SketchGeneric";

type TokenBody = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
};

export async function login(email: string, password: string): Promise<string> {
  try {
    const resp = await fetch("https://graphql.sketch.cloud/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        email: email,
        password: password,
        grant_type: "password",
      }),
    });

    const json = await resp.json();

    if (resp.ok) {
      return (json as TokenBody).access_token as string;
    } else {
      throw new Error((json as SketchErrorBody).message);
    }
  } catch (error) {
    throw new Error((error as FetchError).message);
  }
}

export async function getShares(
  token: string,
  selectedWorkspace: SelectedWorkspace,
  name?: string
): Promise<Share[] | undefined> {
  try {
    const resp = await fetch("https://graphql.sketch.cloud/api", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        operationName: "getShares",
        variables: {
          identifier: selectedWorkspace.identifier,
          after: null,
          search: {
            name: name ?? "",
            filter: null,
          },
        },
        query:
          "query getShares($identifier: UUID!, $after: String, $search: SharesSearchParams) {\n  workspace(identifier: $identifier) {\n    identifier\n    shares(after: $after, search: $search) {\n      entries {\n        ...ShareListItem\n        __typename\n      }\n      meta {\n        ...ShareMeta\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ShareListItem on Share {\n  ...ShareListItemBase\n  workspace {\n    ...PublicWorkspace\n    __typename\n  }\n  version(preferredState: PROCESSED) {\n    ...VersionListItem\n    previewFiles(scale: 1, type: FULL) {\n      ...ShareThumbnails\n      identifier\n      width\n      height\n      url\n      __typename\n    }\n    __typename\n  }\n  project {\n    ...Project\n    __typename\n  }\n  __typename\n}\n\nfragment ShareListItemBase on Share {\n  identifier\n  name\n  libraryEnabled\n  userCanContribute\n  userCanUpdateSettings\n  userCanAccessVersions\n  userCanUpdateCommentsEnabled\n  userCanLeaveShare\n  userAccessLevel\n  userHasAcceptedInvitationToView\n  userIsOwner\n  createdAt\n  updatedAt\n  deletedAt\n  subscriptionStatus\n  privacyIcon\n  publicUrl\n  publicAccessLevel\n  publicCommentsEnabled\n  allowedPrivateAccessLevels\n  allowedWorkspaceAccessLevels\n  workspaceAccessLevel\n  workspaceCommentsEnabled\n  userCanUpdateWorkspacePermissions\n  isShared\n  isDraft\n  userIsMember\n  isSharedWithGuests\n  __typename\n}\n\nfragment PublicWorkspace on PublicWorkspace {\n  identifier\n  name\n  userIsMember\n  userIsOwner\n  type\n  avatar {\n    small\n    large\n    __typename\n  }\n  __typename\n}\n\nfragment VersionListItem on Version {\n  identifier\n  shortId\n  identifier\n  createdAt\n  userIsCreator\n  createdAfterVersioning\n  updatedAt\n  kind\n  creator {\n    identifier\n    name\n    avatar {\n      small\n      __typename\n    }\n    __typename\n  }\n  document {\n    identifier\n    renderStatus\n    url\n    downloadAvailable\n    userCanOpenInApp\n    colorspace\n    size\n    sketchVersion\n    ...DocumentDownloadableAssets\n    __typename\n  }\n  previewFiles(scale: 1, type: FULL) {\n    ...ShareThumbnails\n    identifier\n    width\n    height\n    url\n    __typename\n  }\n  __typename\n}\n\nfragment DocumentDownloadableAssets on Document {\n  __typename\n  identifier\n  assetStatus\n  downloadableAssets {\n    ...DownloadableAsset\n    __typename\n  }\n}\n\nfragment DownloadableAsset on DownloadableAsset {\n  __typename\n  identifier\n  status\n  fileName\n  fileSizeInBytes\n  path\n  layerUuids\n}\n\nfragment ShareThumbnails on File {\n  thumbnails {\n    width\n    height\n    url\n    type\n    __typename\n  }\n  __typename\n}\n\nfragment Project on Project {\n  name\n  shortId\n  identifier\n  type\n  __typename\n}\n\nfragment ShareMeta on PaginationMeta {\n  after\n  before\n  limit\n  totalCount\n  __typename\n}\n",
      }),
    });

    const json = await resp.json();

    if (resp.ok) {
      return (json as BodyRes).data.workspace.shares.entries as Share[];
    } else {
      throw new Error((json as SketchErrorBody).message);
    }
  } catch (error) {
    throw new Error((error as FetchError).message);
  }
}
// next update

// export async function createProject(token: string, selectedWorkspace: SelectedWorkspace, name: string): Promise<CreateProjectBodyRes> {
//   try {
//     const resp = await fetch("https://graphql.sketch.cloud/api", {
//       method: "POST",
//       headers: {
//         Authorization: `bearer ${token}`,
//         "Content-Type": "application/json",
//         Accept: "*/*",
//       },
//       body: JSON.stringify({
//         operationName: "createWorkspaceProject",
//         variables: {
//           projectName: name,
//           workspaceId: selectedWorkspace.identifier,
//         },
//         query:
//           "mutation createWorkspaceProject($workspaceId: UUID!, $projectName: String!) {\n  createWorkspaceProject(workspaceIdentifier: $workspaceId, name: $projectName) {\n    project {\n      ...Project\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Project on Project {\n  name\n  shortId\n  identifier\n  type\n  __typename\n}\n",
//       }),
//     });
//     const json = await resp.json();

//     if (resp.ok) {
//       return json as CreateProjectBodyRes;
//     } else {
//       throw new Error((json as SketchErrorBody).message);
//     }
//   } catch (error) {
//     throw new Error((error as FetchError).message);
//   }
// }

export async function getWorkspaces(token: string): Promise<GetWorkspacesBodyRes> {
  try {
    const resp = await fetch("https://graphql.sketch.cloud/api", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        operationName: "getWorkspaces",
        variables: {},
        query:
          "query getWorkspaces {\n  me {\n    identifier\n    personalWorkspace {\n      ...WorkspaceMinimal\n      __typename\n    }\n    workspaces {\n      ...WorkspaceMinimal\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment WorkspaceMinimal on Workspace {\n  ...WorkspaceMinimalIdentity\n  type\n  avatar {\n    large\n    __typename\n  }\n  customer {\n    identifier\n    ssoEnabled\n    ssoStartUrl\n    tosAgreed\n    billing {\n      status\n      __typename\n    }\n    __typename\n  }\n  status\n  userCanEdit\n  userRole\n  userIsOwner\n  status\n  type\n  __typename\n}\n\nfragment WorkspaceMinimalIdentity on Workspace {\n  identifier\n  name\n  avatar {\n    small\n    __typename\n  }\n  __typename\n}\n",
      }),
    });
    const json = await resp.json();

    if (resp.ok) {
      return json as GetWorkspacesBodyRes;
    } else {
      throw new Error((json as SketchErrorBody).message);
    }
  } catch (error) {
    throw new Error((error as FetchError).message);
  }
}
