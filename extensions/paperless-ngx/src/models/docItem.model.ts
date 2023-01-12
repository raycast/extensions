import {paperlessDocumentResults} from './paperlessResponse.model';

export interface DocItem {
    document: paperlessDocumentResults;
    tags?: string;
    correspondent?: string;
    type?: string;
}