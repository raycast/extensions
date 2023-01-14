import {document} from './paperlessResponse.model';

export interface DocItem {
    document: document;
    tags?: string;
    correspondent?: string;
    type?: string;
}