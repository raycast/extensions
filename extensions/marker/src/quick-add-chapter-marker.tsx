// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { LaunchProps } from "@raycast/api";
import { randomUUID } from "node:crypto";

import {
  createChapterMarker,
  markerSettingsFromPreferences,
} from "./marker-api";
import { resolveDefaultMarkerTarget } from "./marker-target";
import { dateWithOffset, requiredString, runWithToast } from "./marker-ui";

type QuickAddChapterMarkerArguments = {
  title: string;
  offset?: string;
};

export default async function Command(
  props: LaunchProps<{ arguments: QuickAddChapterMarkerArguments }>,
) {
  const settings = markerSettingsFromPreferences();
  const captureDate = new Date();
  let destinationMessage: string | undefined;

  await runWithToast({
    loadingTitle: "Adding chapter marker...",
    successTitle: "Chapter marker added",
    failureTitle: "Could not add chapter marker",
    successMessage: () => destinationMessage,
    closeMainWindowOnSuccess: true,
    task: async () => {
      const title = requiredString(
        props.arguments.title,
        "Chapter marker title is required.",
      );
      const target = await resolveDefaultMarkerTarget(settings);
      destinationMessage = `Added to ${target.session.name} / ${target.subsession.name}`;
      const startDate = dateWithOffset(
        props.arguments.offset,
        captureDate,
      ).toISOString();
      const now = new Date().toISOString();

      await createChapterMarker({
        ...settings,
        name: title,
        sessionID: target.session.id,
        subSessionID: target.subsession.id,
        tagIDs: [],
        clientID: randomUUID(),
        startDate,
        createdAt: now,
        updatedAt: now,
      });
    },
  });
}
