import { LocalStorage, Toast, showToast } from '@raycast/api';
import { getDefaultStore } from 'jotai';
import { isAuthenticatedAtom } from '../hooks/atoms';
import { GENERAL_DOMAIN } from '../utils/config';
import { trimTagsAndDecodeEntities } from '../utils/string';
import { client, isAbortError } from './shared';

export type UserID = string;
export type NodeID = string;

export const enum NodeType {
  /** Wiki */
  Wik = 16,
  /** Docs */
  Doc = 2,
  /** Docx */
  Dox = 22,
  /** Sheet */
  Sht = 3,
  /** Bitable */
  Bas = 8,
  /** Slides */
  Sld = 15,
  /** MindNotes */
  Bmn = 11,
  /** Local files */
  Box = 12,
}

export interface UserEntity {
  id: UserID;
  suid: string;
  name: string;
  cn_name: string;
  en_name: string;
  email: string;
  mobile: string;
  avatar_url: string;
  tenant_id: string;
  tenant_name: string;
  user_type: string;
}

export interface NodeEntity {
  edit_uid: UserID;
  owner_id: UserID;
  obj_token: NodeID;
  name: string;
  type: NodeType;
  create_time: number;
  edit_time: number;
  is_pined: boolean;
  is_stared: boolean;
  url: string;
  thumbnail: string;
  extra: {
    is_external: boolean;
    copiable?: boolean;
    data_version?: string;
    size?: string;
    subtype?: 'pptx' | 'json' | 'zip' | 'mov' | 'pdf' | 'xlsx' | 'key';
    version?: string;
  };
  thumbnail_extra: {
    url: string;
    type: number;
    nonce: string;
    secret: string;
  };
  open_time: number;
  owner_type: number;
  my_edit_time: number;
  activity_time: number;
  path_count: number;
  icon_info?: string;
}

export interface ObjEntity {
  token: string;
  type: NodeType;
  title: string;
  preview: string;
  owner_id: string;
  open_time: number;
  edit_uid: string;
  edit_time: number;
  edit_name: string;
  comment: string;
  author: string;
  create_uid: string;
  is_external: false;
  url: string;
  subtype: string;
  user_edit_time: number;
  share_version: number;
  wiki_infos: null | WikiEntity[];
  owner_type: number;
  container_type: number;
}

export interface WikiEntity {
  main_path: string;
  space_id: string;
  wiki_token: string;
  wiki_url: string;
  wiki_version: string;
}

export interface RecentDocsListResponse {
  node_list: NodeID[];
  has_more: boolean;
  total: number;
  entities: {
    nodes: Record<NodeID, NodeEntity>;
    users: Record<UserID, UserEntity>;
  };
}

export interface SearchDocsResponse {
  tokens: NodeID[];
  has_more: boolean;
  total: number;
  entities: {
    objs: Record<NodeID, ObjEntity>;
    users: Record<UserID, UserEntity>;
  };
}

const docsClient = client.extend({
  prefixUrl: `${GENERAL_DOMAIN}/space/api/`,
  hooks: {
    beforeRequest: [
      (options) => {
        options.headers.referer = GENERAL_DOMAIN;
        // remove `_csrf_token`
        options.headers.cookie = String(options.headers.cookie)
          .split('; ')
          .filter((item) => !item.startsWith('_csrf_token='))
          .join('; ');
      },
    ],
    afterResponse: [
      (response) => {
        const data = response.body as Record<string, unknown>;
        if (data.code !== 0) {
          if (data.code === 5) {
            // Login Required
            LocalStorage.clear();
            getDefaultStore().set(isAuthenticatedAtom, false);
            setTimeout(() => {
              showToast(Toast.Style.Failure, 'Session expired, please login again');
            });
          }
          throw Error();
        }
        response.body = data.data;
        return response;
      },
    ],
  },
});

export function isNodeEntity(entity: NodeEntity | ObjEntity): entity is NodeEntity {
  return 'obj_token' in entity;
}

export async function fetchRecentDocsList(length: number, signal?: AbortSignal): Promise<RecentDocsListResponse> {
  try {
    const { body } = await docsClient.get<RecentDocsListResponse>('explorer/recent/list/', {
      searchParams: { length },
      signal,
    });
    return body;
  } catch (error) {
    let errorMessage = 'Could not load recent documents';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }
    if (!isAbortError(error)) showToast(Toast.Style.Failure, errorMessage);
    return Promise.resolve({
      has_more: false,
      total: 0,
      node_list: [],
      entities: {
        nodes: {},
        users: {},
      },
    });
  }
}

export interface SearchDocsParams {
  query: string;
  offset?: number;
  count?: number;
}

export async function searchDocs(params: SearchDocsParams, signal?: AbortSignal): Promise<SearchDocsResponse> {
  try {
    const { body } = await docsClient.get<SearchDocsResponse>('search/refine_search/', {
      searchParams: { offset: 0, count: 15, ...params },
      signal,
    });
    Object.keys(body.entities.objs).forEach((key) => {
      const objEntity = body.entities.objs[key];
      body.entities.objs[key] = {
        ...objEntity,
        title: trimTagsAndDecodeEntities(objEntity.title),
        preview: trimTagsAndDecodeEntities(objEntity.preview),
        url: computeRedirectedUrl(objEntity),
        type: computeType(objEntity),
      };
    });
    return body;
  } catch (error) {
    let errorMessage = 'Could not search documents';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }
    if (!isAbortError(error)) showToast(Toast.Style.Failure, errorMessage);
    return Promise.resolve({
      has_more: false,
      total: 0,
      tokens: [],
      entities: {
        objs: {},
        users: {},
      },
    });
  }
}

const computeRedirectedUrl = (objEntity: ObjEntity) => {
  if (!objEntity.url) {
    if (!objEntity.wiki_infos) {
      return '';
    }

    return objEntity.wiki_infos[0].wiki_url;
  }

  return objEntity.url
    .replace(/\/space\/doc\//, '/docs/')
    .replace(/\/space\/sheet\//, '/sheets/')
    .replace(/\/space\/bitable\//, '/base/')
    .replace(/\/space\/mindnote\//, '/mindnotes/')
    .replace(/\/space\//, '/');
};

const computeType = (objEntity: ObjEntity) => {
  if (objEntity.wiki_infos) {
    return NodeType.Wik;
  }

  return objEntity.type;
};

export async function removeRecentDocument(objToken: string): Promise<boolean> {
  try {
    await docsClient.post('explorer/recent/delete/', {
      form: {
        obj_token: objToken,
      },
    });

    return true;
  } catch (error) {
    let errorMessage = 'Could not remove the document from recent list';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }

    showToast(Toast.Style.Failure, errorMessage);
    return false;
  }
}
