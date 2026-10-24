/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export type BooleanPreferenceKey = {
  [Key in keyof Preferences]-?: Preferences[Key] extends boolean ? Key : never;
}[keyof Preferences];
