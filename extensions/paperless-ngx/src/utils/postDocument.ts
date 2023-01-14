import {getPreferenceValues, showToast, Toast} from '@raycast/api';
import fetch from 'node-fetch';
import {Preferences} from '../models/preferences.model';
import {FormData} from 'formdata-node';
import {fileFromPath} from 'formdata-node/file-from-path';

const {paperlessURL}: Preferences = getPreferenceValues();
const {apiToken}: Preferences = getPreferenceValues();

export const postDocument = async (value: PostDocument, filePath: string): Promise<any> => {

    const formData = new FormData();


    if (value.correspondent !== '-1') {
        // Remove automatic correspondent
        formData.append('correspondent', value.correspondent);
    }
    if (value.type !== '-1') {
        // Remove Automatic type
        formData.append('document_type', value.type);
    }
    if (value.title) {
        // Allow empty title
        formData.append('title', value.title);
    }

    // Foreach needed, doc says "Specify this multiple times to have multiple tags added to the document"
    value.tags.forEach((tag) => {
        // Allow empty tags
        formData.append('tags', tag);
    });
    console.log(formData);
    console.log(JSON.stringify(formData));

    formData.append('document', await fileFromPath(filePath));

    const options = {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Token ${apiToken}`,
        }
    };


    fetch(`${paperlessURL}/api/documents/post_document/`, options)
        .then(response => response.json())
        .then(response => console.log('RESP', response))
        .catch(err => showToast(Toast.Style.Failure, `Could not fetch correspondents ${err}`));
};

export interface PostDocument {
    title: string;
    created: string;
    correspondent: string;
    type: string;
    tags: string[];
}