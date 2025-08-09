/* eslint-disable */

export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
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
  /** An ISO 8601-encoded datetime */
  ISO8601DateTime: { input: any; output: any };
  /** Represents untyped JSON */
  JSON: { input: any; output: any };
};

export enum SearchEmojiOrder {
  /** popular */
  Popular = "popular",
  /** recent */
  Recent = "recent",
}

export enum ModelCategory {
  /** emojis */
  Emojis = "emojis",
  /** icons */
  Icons = "icons",
  /** illustrations */
  Illustrations = "illustrations",
  /** illustrations_3d */
  Illustrations_3d = "illustrations_3d",
  /** images */
  Images = "images",
  /** memes */
  Memes = "memes",
  /** other */
  Other = "other",
}
