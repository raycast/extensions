import { List } from "@raycast/api";
import type { SetRequired } from "type-fest";
import type { ProcessedBase } from "@/types";

type RequiredListItemPropsWithIcon = SetRequired<List.Item.Props, "icon" | "subtitle" | "accessories">;

export type ProcessedConfluenceContent = ProcessedBase &
  RequiredListItemPropsWithIcon & {
    id: string;
    url: string;
    editUrl: string;
    canEdit: boolean;
    canFavorite: boolean;
    isFavourited: boolean;
    spaceUrl: string;
    spaceName: string;
    creatorAvatarUrl: string;
    creatorAvatarCacheKey?: string;
  };

export type ProcessedConfluenceUser = ProcessedBase &
  RequiredListItemPropsWithIcon & {
    userKey: string;
    displayName: string;
    url: string;
    avatarUrl: string;
    avatarCacheKey?: string;
  };

export type ProcessedConfluenceSpace = ProcessedBase &
  RequiredListItemPropsWithIcon & {
    key: string;
    name: string;
    url: string;
    avatarUrl: string;
    avatarCacheKey?: string;
  };
