import {getPreferenceValues, showToast, Toast, Cache} from '@raycast/api';
import fetch from 'node-fetch';
import {pocumentTagsResponse, documentTag} from '../models/paperlessResponse.model';
import { Preferences } from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchDocumentTags = async (): Promise<documentTag[]> => {
    try {
        const response = await fetch(
            `${paperlessURL}/api/tags/`, {
                headers: {'Authorization': `Token ${apiToken}`}
            }
        );
        const json = await response.json();
        const tags = json as pocumentTagsResponse;
        await cacheDocumentTags(tags.results);
        return tags.results;
    } catch (error) {
        await showToast(Toast.Style.Failure, `Could not fetch documents tags ${error}`);
        return Promise.reject([]);
    }
};

export const cacheDocumentTags = async (value: documentTag[]): Promise<documentTag[]> => {
    cache.set('tags', JSON.stringify(value));
    return value;
};