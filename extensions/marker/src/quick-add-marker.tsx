// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { LaunchProps } from "@raycast/api";
import { randomUUID } from "node:crypto";

import { createMarker, markerSettingsFromPreferences } from "./marker-api";
import { resolveDefaultMarkerTarget } from "./marker-target";
import { dateWithOffset, optionalTrimmed, runWithToast } from "./marker-ui";

type QuickAddMarkerArguments = {
  title?: string;
  description?: string;
  offset?: string;
};

export default async function Command(
  props: LaunchProps<{ arguments: QuickAddMarkerArguments }>,
) {
  const settings = markerSettingsFromPreferences();
  const captureDate = new Date();
  let destinationMessage: string | undefined;

  await runWithToast({
    loadingTitle: "Adding marker...",
    successTitle: "Marker added",
    failureTitle: "Could not add marker",
    successMessage: () => destinationMessage,
    closeMainWindowOnSuccess: true,
    task: async () => {
      const title = optionalTrimmed(props.arguments.title) ?? "";
      const note = optionalTrimmed(props.arguments.description);
      const target = await resolveDefaultMarkerTarget(settings);
      destinationMessage = `Added to ${target.session.name} / ${target.subsession.name}`;
      const markerDate = dateWithOffset(
        props.arguments.offset,
        captureDate,
      ).toISOString();
      const now = new Date().toISOString();

      await createMarker({
        ...settings,
        name: title,
        note,
        sessionID: target.session.id,
        subSessionID: target.subsession.id,
        tagIDs: [],
        clientID: randomUUID(),
        date: markerDate,
        createdAt: now,
        updatedAt: now,
      });
    },
  });
}
