import {getPreferenceValues, showToast, Toast, Cache} from '@raycast/api';
import fetch from 'node-fetch';
import {correspondent, correspondentsResponse} from '../models/paperlessResponse.model';
import { Preferences } from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchCorrespondents = async (blankFirst?: boolean): Promise<correspondent[]> => {
    try {
        const response = await fetch(
            `${paperlessURL}/api/correspondents/`, {
                headers: {'Authorization': `Token ${apiToken}`}
            }
        );
        const json = await response.json();
        const correspondents = json as correspondentsResponse;
        await cacheCorrespondents(correspondents.results);
        if (blankFirst) {
            // Added because Dropdown doesnt support no value. Create a fake one to intercept before POST
            correspondents.results.unshift({
                id: -1,
                slug: '__automaticCorrespondentAssignation',
                name: '-- Automatic --',
            });
        }
        return correspondents.results;
    } catch (error) {
        await showToast(Toast.Style.Failure, `Could not fetch correspondents ${error}`);
        return Promise.reject([]);
    }
};

export const cacheCorrespondents = async (value: correspondent[]): Promise<correspondent[]> => {
    cache.set('correspondents', JSON.stringify(value));
    return value;
};