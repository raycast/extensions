import { apiCreateTag, apiEditTracking, apiGetCurrentTracking, apiStartTracking, apiStopTracking } from "./api-early";
import { useEffect, useState } from "react";
import { Tag, Tracking } from "./types";
import { useTagsAndMentions } from "./useTagsAndMentions";
import { showError } from "./utils";

type State = {
  isLoadingTracking: boolean;
  tracking: Tracking | null;
};

type UpdateParams = {
  spaceId: string;
  activityId: string;
  text: string;
  startedAt: string;
};

export const useCurrentTracking = () => {
  const [{ tracking, isLoadingTracking }, setState] = useState<State>({ isLoadingTracking: true, tracking: null });
  const { tags, addTags } = useTagsAndMentions();

  const updateTracking = ({ spaceId, activityId, text, startedAt }: UpdateParams) =>
    Promise.resolve()
      .then(() => console.debug(`upd tracking sId ${spaceId}, aId ${activityId}, sAt ${startedAt}, text ${text}`))
      .then(() => tagify(text, tags))
      .then(({ text, missingTags }) =>
        missingTags.length === 0 ? text : supplementMissingTags(spaceId, missingTags, addTags, text)
      )
      .then(text => apiEditTracking({ note: { text }, activityId, startedAt }))
      .then(tracking => setState(prev => ({ ...prev, tracking })));

  const stopTracking = () =>
    Promise.resolve()
      .then(() => console.debug("stop tracking"))
      .then(() => setState(prev => ({ ...prev, isLoadingTracking: true })))
      .then(() => apiStopTracking({}))
      .then(() => setState(prev => ({ ...prev, tracking: null, isLoadingTracking: false })))
      .finally(() => setState(prev => ({ ...prev, isLoadingTracking: false })));

  const startTracking = ({ activityId }: { activityId: string }) =>
    Promise.resolve()
      .then(() => console.debug(`start tracking activity ${activityId}`))
      .then(() => tracking && stopTracking())
      .then(() => setState(prev => ({ ...prev, isLoadingTracking: true })))
      .then(() => apiStartTracking({ activityId }))
      .then(tracking => setState(prev => ({ ...prev, tracking })))
      .finally(() => setState(prev => ({ ...prev, isLoadingTracking: false })));

  useEffect(() => {
    apiGetCurrentTracking()
      .then(tracking => setState(prev => ({ ...prev, tracking })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, isLoadingTracking: false })));
  }, []);

  return { tracking, isLoadingTracking, updateTracking, stopTracking, startTracking };
};

const supplementMissingTags = (
  spaceId: string,
  missingTags: string[],
  addTags: (newTags: Tag[]) => Tag[],
  text: string
) =>
  createMissingTags(spaceId, missingTags)
    .then(addTags)
    .then(tags => tagify(text, tags).text);

const createMissingTags = (spaceId: string, missingTags: string[]): Promise<Tag[]> =>
  Promise.resolve()
    .then(() => console.debug(`create missing tags: ${missingTags.join(", ")}`))
    .then(() => Promise.all(missingTags.map(label => apiCreateTag({ label, spaceId }))));

const tagify = (note: string, tags: Tag[]) => {
  const text = tags.reduce((text, tag) => text.replace(`#${tag.label}`, `<{{|t|${tag.id}|}}>`), note);
  const unidentified = text.match(/#\w+/g);
  const missingTags = unidentified ? [...new Set(unidentified)].map(tag => tag.substring(1)) : [];

  console.debug(`tagify note: ${note} -> ${text}; missing tags - ${missingTags.join(", ")}`);

  return { text, missingTags };
};
