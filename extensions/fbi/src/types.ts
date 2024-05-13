export type Image = {
    original: string;
    thumb: string;
    caption: string;
    large: string;
}

export type ArtCrime = {
    "@id": string;
    uid: string;
    title: string;
    description: string;
    images: Image[];
    crimeCategory: string;
    maker?: string;
    materials: string;
    measurements: string;
    period: string;
    additionalData?: string;
    modified: string;
    publication: string;
    path: string;
    referenceNumber: string;
    isStealth: boolean,
    idInAgency: string;
    url: string;
}

type WantedPersonFile = {
    url: string;
    name: string;
}
export type WantedPerson = {
    "@id": string;
    uid: string;
    title: string;
    description: string;
    images: Image[];
    files: WantedPersonFile[];
    warning_message: string;
    remarks: string;
    details: string;
    additional_information: string;
    caution: string;
    reward_text: string;
    reward_min: number;
    reward_max: number;
    dates_of_birth_used: string[];
    place_of_birth: string;
    locations: string[];
    field_offices: string[];
    legat_names: string[];
    status: string;
    person_classification: string;
    poster_classification: string;
    ncic: string;
    age_min: number;
    age_max: number;
    weight_min: number;
    weight_max: number;
    height_min: number;
    height_max: number;
    eyes: string;
    hair: string;
    build: string;
    sex: string;
    race: string;
    nationality: string;
    scars_and_marks: string;
    complexion: string;
    occupations: string;
    possible_countries: string[];
    possible_states: string[];
    modified: string;
    publication: string;
    path: string;
    age_range: string | null;
    weight: string | null;
    subjects: string[];
    // "aliases": null,
    // "race_raw": null,
    // "suspects": null,
    "coordinates": string[];
    // "hair_raw": null,
    // "languages": null,
    // "eyes_raw": null,
    url: string;
}
export type SuccessResponse<T> = {
    total: number;
    items: T[];
    page: number;
}