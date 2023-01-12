import {getPreferenceValues, showToast, Toast, Cache} from '@raycast/api';
import fetch from 'node-fetch';
import {paperlessCorrespondentResults, paperlessCorrespondentsResponse} from '../models/paperlessResponse.model';
import { Preferences } from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchCorrespondents = async (): Promise<paperlessCorrespondentsResponse> => {
    try {
        const response = await fetch(
            `${paperlessURL}/api/correspondents/`, {
                headers: {'Authorization': `Token ${apiToken}`}
            }
        );
        const json = await response.json();
        const correspondents = json as paperlessCorrespondentsResponse;
        await cacheCorrespondents(correspondents.results);
        return correspondents;
    } catch (error) {
        await showToast(Toast.Style.Failure, `Could not fetch correspondents ${error}`);
        return Promise.reject([]);
    }
};

export const cacheCorrespondents = async (value: paperlessCorrespondentResults[]): Promise<paperlessCorrespondentResults[]> => {
    cache.set('correspondents', JSON.stringify(value));
    return value;
};