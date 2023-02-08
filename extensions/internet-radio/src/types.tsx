export interface StationData {
    [key: string]: string | string[] | boolean | undefined
    name: string,
    website: string,
    stream: string,
    genres: string[],
    description: string,
    discontinued: boolean,
}

export interface StationListObject {
    [key: string]: StationData
}