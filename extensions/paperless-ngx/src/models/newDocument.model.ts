
// Per API, all fields are optional
// https://docs.paperless-ngx.com/api/#file-uploads
export interface NewDocument {
    title?: string;
    created?: string;
    correspondent?: number;
    document_type?: number[];
    tags?: number[];
}