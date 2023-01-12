import {getPreferenceValues, showToast, Toast, Cache} from '@raycast/api';
import fetch from 'node-fetch';
import {paperlessDocumentTypes, paperlessDocumentTypesResponse} from '../models/paperlessResponse.model';
import { Preferences } from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchDocumentTypes = async (): Promise<paperlessDocumentTypesResponse> => {
    try {
        const response = await fetch(
            `${paperlessURL}/api/document_types/`, {
                headers: {'Authorization': `Token ${apiToken}`}
            }
        );
        const json = await response.json();
        const types = json as paperlessDocumentTypesResponse;
        await cacheDocumentTypes(types.results);
        return types;
    } catch (error) {
        await showToast(Toast.Style.Failure, `Could not fetch documents types ${error}`);
        return Promise.reject([]);
    }
};

export const cacheDocumentTypes = async (value: paperlessDocumentTypes[]): Promise<paperlessDocumentTypes[]> => {
    cache.set('types', JSON.stringify(value));
    return value;
};