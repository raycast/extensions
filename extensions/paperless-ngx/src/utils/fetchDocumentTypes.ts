import {getPreferenceValues, showToast, Toast, Cache} from '@raycast/api';
import fetch from 'node-fetch';
import {documentType, documentTypesResponse} from '../models/paperlessResponse.model';
import { Preferences } from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchDocumentTypes = async (blankFirst?: boolean): Promise<documentType[]> => {
    try {
        const response = await fetch(
            `${paperlessURL}/api/document_types/`, {
                headers: {'Authorization': `Token ${apiToken}`}
            }
        );
        const json = await response.json();
        const types = json as documentTypesResponse;
        await cacheDocumentTypes(types.results);
        if (blankFirst) {
            // Added because Dropdown doesnt support no value. Create a fake one to intercept before POST
            types.results.unshift({
                id: -1,
                slug: '__automaticTypeAssignation',
                name: '-- Automatic --',
            });
        }
        return types.results;
    } catch (error) {
        await showToast(Toast.Style.Failure, `Could not fetch documents types ${error}`);
        return Promise.reject([]);
    }
};

export const cacheDocumentTypes = async (value: documentType[]): Promise<documentType[]> => {
    cache.set('types', JSON.stringify(value));
    return value;
};